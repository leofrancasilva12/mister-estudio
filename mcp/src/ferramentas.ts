import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  apagarPersonagem,
  buscarPersonagem,
  linksDoPersonagem,
  listarGaleria,
  listarPersonagens,
  salvarNaGaleria,
} from "./galeria.js";
import type { PedidoGeracao, Provedor, Tarefa } from "./provedores/tipos.js";
import { consultarSaldo, estimarCreditos, NOMES_VOZES } from "./provedores/kie.js";
import { config } from "./config.js";
import sharp from "sharp";
import { CATALOGO } from "./catalogo.js";
import { cadastrarPersonagem } from "./fotos.js";

// Aqui ficam as ferramentas que o Claude enxerga.
// Cada uma tem: nome, descrição (é ela que ensina o Claude quando usar),
// os campos de entrada (conferidos pelo zod) e o que acontece quando é chamada.

const ESPERA_IMAGEM_MS = 55_000; // imagens levam de 10 a 50 s: esperamos até 55 s antes de devolver
const INTERVALO_CONSULTA_MS = 1_000;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Conteudo = { type: "text"; text: string } | { type: "image"; data: string; mimeType: string };

function texto(t: string) {
  return { content: [{ type: "text" as const, text: t }] as Conteudo[] };
}

// Prévia leve da imagem (JPEG até 1024 px) para ela aparecer direto no chat.
async function previa(url?: string): Promise<Conteudo | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!r.ok) return null;
    const bruto = Buffer.from(await r.arrayBuffer());
    const jpg = await sharp(bruto).resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
    return { type: "image", data: jpg.toString("base64"), mimeType: "image/jpeg" };
  } catch {
    return null;
  }
}

// Teto diário de créditos: protege a conta se o conector for usado demais.
const gastos = { dia: "", total: 0 };
function hoje() { return new Date().toISOString().slice(0, 10); }
function conferirTeto(estimado: number): string | null {
  if (gastos.dia !== hoje()) { gastos.dia = hoje(); gastos.total = 0; }
  if (config.limiteDiario > 0 && gastos.total + estimado > config.limiteDiario) {
    return `Parei para proteger seus créditos: hoje o Claude já gastou cerca de ${gastos.total} créditos e o teto diário é ${config.limiteDiario}. Para mudar, ajuste MCP_LIMITE_CREDITOS_DIA no .env da VPS.`;
  }
  return null;
}
// Reserva a estimativa ao iniciar (vídeos em andamento já contam) e acerta com o valor real no fim.
const reservas = new Map<string, number>();
function reservar(t: Tarefa) {
  if (gastos.dia !== hoje()) { gastos.dia = hoje(); gastos.total = 0; }
  const est = estimarCreditos(t.pedido);
  reservas.set(t.id, est);
  gastos.total += est;
}
function registrarGasto(t: Tarefa) {
  const est = reservas.get(t.id);
  if (est === undefined || (t.situacao !== "pronta" && t.situacao !== "falhou")) return;
  reservas.delete(t.id);
  gastos.total += t.situacao === "falhou" ? -est : (t.creditos ?? est) - est;
}

function descreverTarefa(t: Tarefa): string {
  const ehVideo = t.pedido.tipo !== "imagem";
  const tipo = { imagem: "Imagem", video: "Vídeo", audio: "Áudio", falante: "Vídeo falado" }[t.pedido.tipo];
  switch (t.situacao) {
    case "pronta":
      return `${tipo} ${ehVideo ? "pronto" : "pronta"}.\nLink: ${t.resultadoUrl}\nFormato: ${t.pedido.formato}${t.modeloKie ? `\nModelo: ${t.modeloKie}` : ""}${t.creditos ? `\nCusto: ${t.creditos} créditos` : ""}\nTarefa: ${t.id}\nO link do Kie.ai vale por cerca de 14 dias: baixe o que quiser guardar.`;
    case "falhou":
      return `A geração falhou: ${t.erro ?? "erro desconhecido"}.\nTarefa: ${t.id}`;
    default:
      return `${tipo} em andamento: ${t.progresso}% (${t.situacao === "na_fila" ? "na fila" : "gerando"}).\nTarefa: ${t.id}\nUse consultar_tarefa com este id para acompanhar.`;
  }
}

// Junta o pedido com a descrição e as fotos de um personagem salvo.
// Se os links das fotos venceram (mais de 20 h), reenvia ao Kie.ai antes de gerar.
async function aplicarPersonagem(pedido: PedidoGeracao, nome?: string): Promise<{ pedido: PedidoGeracao; aviso?: string }> {
  if (!nome) return { pedido };
  const personagem = await buscarPersonagem(nome);
  if (!personagem) {
    const nomes = (await listarPersonagens()).map((p) => p.nome).join(", ");
    return { pedido, aviso: `Personagem "${nome}" não encontrado. Disponíveis: ${nomes || "nenhum"}. Gerei sem personagem.` };
  }
  let links: string[] = [];
  let aviso: string | undefined;
  try {
    links = await linksDoPersonagem(personagem);
  } catch (e) {
    aviso = `Não consegui enviar as fotos de "${personagem.nome}" (${(e as Error).message}). Gerei só com a descrição.`;
  }
  return {
    aviso,
    pedido: {
      ...pedido,
      promptOriginal: pedido.prompt,
      prompt: `${personagem.descricao}\n\n${pedido.prompt}`,
      referencias: [...(pedido.referencias ?? []), ...links],
    },
  };
}

export function registrarFerramentas(server: McpServer, provedor: Provedor) {
  server.registerTool(
    "gerar_imagem",
    {
      title: "Gerar imagem",
      description:
        "Gera uma imagem com IA a partir de uma descrição em texto e salva na galeria do Estúdio. " +
        "Use para posts, criativos e ilustrações. Gasta créditos do Kie.ai (Nano Banana Pro: 18; Nano Banana 2: 8 a 18; GPT Image 2: 6 a 16). " +
        "Aceita imagens de referência (links https) para editar ou manter um produto/rosto, e personagens salvos (veja listar_personagens). " +
        "Normalmente devolve a imagem pronta; se demorar, devolve o id da tarefa.",
      inputSchema: {
        prompt: z.string().min(3).describe("Descrição detalhada da imagem desejada (de preferência em inglês)"),
        formato: z.enum(["1:1", "4:5", "9:16", "16:9"]).default("4:5").describe("Proporção: 4:5 para feed, 9:16 para stories"),
        modelo: z.enum(["nano-banana-pro", "nano-banana-2", "gpt-image-2"]).default("nano-banana-pro").describe("nano-banana-pro: melhor qualidade e texto; nano-banana-2: rápido; gpt-image-2: bom com texto e layouts"),
        qualidade: z.enum(["1K", "2K", "4K"]).optional().describe("Resolução. Padrão: 2K no Nano Banana Pro, 1K nos outros"),
        referencias: z.array(z.string().url()).max(8).optional().describe("Links https de imagens de referência"),
        personagem: z.string().optional().describe("Nome de um personagem salvo, por exemplo: Porta-voz 3D"),
      },
      annotations: { openWorldHint: true },
    },
    async ({ prompt, formato, modelo, qualidade, referencias, personagem }) => {
      const { pedido, aviso } = await aplicarPersonagem({ tipo: "imagem", prompt, formato, modelo, qualidade, referencias }, personagem);
      const teto = conferirTeto(estimarCreditos(pedido));
      if (teto) return texto(teto);
      let tarefa: Tarefa;
      try { tarefa = await provedor.iniciar(pedido); } catch (e) { return texto(`Não consegui gerar: ${(e as Error).message}`); }
      reservar(tarefa);

      const limite = Date.now() + ESPERA_IMAGEM_MS;
      while (Date.now() < limite) {
        await esperar(INTERVALO_CONSULTA_MS);
        tarefa = (await provedor.consultar(tarefa.id)) ?? tarefa;
        if (tarefa.situacao === "pronta" || tarefa.situacao === "falhou") break;
      }

      if (tarefa.situacao === "pronta") salvarNaGaleria(tarefa);
      registrarGasto(tarefa);
      const resposta = texto([aviso, descreverTarefa(tarefa)].filter(Boolean).join("\n\n"));
      const img = tarefa.situacao === "pronta" ? await previa(tarefa.resultadoUrl) : null;
      if (img) resposta.content.unshift(img);
      return resposta;
    }
  );

  server.registerTool(
    "gerar_video",
    {
      title: "Gerar vídeo",
      description:
        "Inicia a geração de um vídeo curto com IA, a partir de texto ou animando uma imagem. Vídeos demoram alguns minutos, " +
        "então esta ferramenta devolve na hora o id da tarefa. Depois use consultar_tarefa para pegar o resultado. " +
        "Gasta créditos: Kling 3.0 cerca de 14 por segundo (5 s = 70); Veo 3.1 Rápido 60 por vídeo de até 8 s, com som. " +
        "Para os outros modelos de vídeo (Gemini Omni, Seedance, HappyHorse, Kling Omni, MiniMax H3, Wan), use gerar_avancado.",
      inputSchema: {
        prompt: z.string().min(3).describe("Descrição da cena e do movimento de câmera"),
        formato: z.enum(["9:16", "16:9", "1:1"]).default("9:16").describe("9:16 para Reels e stories"),
        duracao: z.union([z.literal(5), z.literal(8), z.literal(10), z.literal(15)]).default(5).describe("Duração em segundos (Veo vai até 8)"),
        modelo: z.enum(["kling-3", "veo-3-1-rapido"]).default("kling-3").describe("kling-3: movimento natural, sem som; veo-3-1-rapido: com som e fala"),
        imagem_inicial: z.string().url().optional().describe("Link https de uma imagem para animar (ex.: uma imagem gerada antes)"),
        personagem: z.string().optional().describe("Nome de um personagem salvo"),
      },
      annotations: { openWorldHint: true },
    },
    async ({ prompt, formato, duracao, modelo, imagem_inicial, personagem }) => {
      const { pedido, aviso } = await aplicarPersonagem(
        { tipo: "video", prompt, formato, duracaoSegundos: duracao, modelo, imagemInicial: imagem_inicial },
        personagem
      );
      const teto = conferirTeto(estimarCreditos(pedido));
      if (teto) return texto(teto);
      let tarefa: Tarefa;
      try { tarefa = await provedor.iniciar(pedido); } catch (e) { return texto(`Não consegui gerar: ${(e as Error).message}`); }
      reservar(tarefa);
      return texto([aviso, descreverTarefa(tarefa)].filter(Boolean).join("\n\n"));
    }
  );

  server.registerTool(
    "consultar_tarefa",
    {
      title: "Consultar tarefa",
      description: "Mostra o andamento de uma geração pelo id da tarefa e, se já estiver pronta, devolve o link do resultado.",
      inputSchema: {
        id: z.string().describe("Id da tarefa devolvido por gerar_imagem ou gerar_video"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => {
      let tarefa: Tarefa | undefined;
      try { tarefa = await provedor.consultar(id); } catch (e) { return texto(`Não consegui consultar: ${(e as Error).message}`); }
      if (!tarefa) return texto(`Não encontrei a tarefa ${id}.`);
      if (tarefa.situacao === "pronta") salvarNaGaleria(tarefa);
      registrarGasto(tarefa);
      const resposta = texto(descreverTarefa(tarefa));
      const img = tarefa.situacao === "pronta" && tarefa.pedido.tipo === "imagem" ? await previa(tarefa.resultadoUrl) : null;
      if (img) resposta.content.unshift(img);
      return resposta;
    }
  );

  server.registerTool(
    "listar_galeria",
    {
      title: "Listar galeria",
      description: "Lista as imagens e vídeos já gerados no Estúdio, do mais recente para o mais antigo.",
      inputSchema: {
        limite: z.number().int().min(1).max(50).default(10),
        tipo: z.enum(["imagem", "video", "audio", "falante"]).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ limite, tipo }) => {
      const itens = listarGaleria(limite, tipo);
      if (itens.length === 0) return texto("A galeria ainda está vazia.");
      const linhas = itens.map(
        (i, n) => `${n + 1}. ${({ imagem: "Imagem", video: "Vídeo", audio: "Áudio", falante: "Vídeo falado" } as Record<string, string>)[i.tipo]} ${i.formato}: ${i.prompt.slice(0, 80)}\n   ${i.url}`
      );
      return texto(linhas.join("\n"));
    }
  );

  server.registerTool(
    "listar_personagens",
    {
      title: "Listar personagens",
      description: "Lista os personagens salvos que podem ser usados para manter o mesmo rosto nas gerações.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      const lista = (await listarPersonagens())
        .map((p) => `- ${p.nome} (${p.fotos.length} ${p.fotos.length === 1 ? "foto" : "fotos"}): ${p.descricao}`)
        .join("\n");
      return texto(lista || "Nenhum personagem salvo.");
    }
  );

  server.registerTool(
    "criar_personagem",
    {
      title: "Criar personagem",
      description:
        "Salva um personagem (uma pessoa ou avatar) com 1 a 4 fotos do rosto e uma descrição física, para usar depois em " +
        "gerar_imagem e gerar_video (campo personagem) e manter o mesmo rosto. As fotos podem vir como links https " +
        "(fotos_links) ou em base64 / data URL (fotos_base64). Aceita JPEG, PNG ou WebP de até 8 MB cada. " +
        "Use só rostos de pessoas que autorizaram.",
      inputSchema: {
        nome: z.string().trim().min(2).max(40).describe("Nome do personagem, por exemplo: Ana da loja"),
        descricao: z.string().trim().min(10).max(600).describe("Descrição física: idade aparente, cabelo, pele, traços, estilo"),
        fotos_links: z.array(z.string()).max(4).optional().describe("Links https das fotos do rosto"),
        fotos_base64: z.array(z.string()).max(4).optional().describe("Fotos em base64 ou data URL (data:image/jpeg;base64,...)"),
      },
      annotations: { openWorldHint: true },
    },
    async ({ nome, descricao, fotos_links, fotos_base64 }) => {
      try {
        const p = await cadastrarPersonagem({ nome, descricao, fotos_links, fotos_base64 });
        return texto(`Personagem "${p.nome}" salvo com ${p.fotos.length} ${p.fotos.length === 1 ? "foto" : "fotos"}.\nUse em gerar_imagem ou gerar_video com personagem: "${p.nome}".`);
      } catch (e) {
        return texto(`Não consegui criar o personagem: ${(e as Error).message}`);
      }
    }
  );

  server.registerTool(
    "apagar_personagem",
    {
      title: "Apagar personagem",
      description: "Apaga um personagem salvo e as fotos dele, pelo nome. Não dá para desfazer.",
      inputSchema: {
        nome: z.string().trim().min(1).describe("Nome do personagem"),
      },
      annotations: { destructiveHint: true },
    },
    async ({ nome }) => {
      const apagado = await apagarPersonagem(nome);
      if (!apagado) {
        const nomes = (await listarPersonagens()).map((p) => p.nome).join(", ");
        return texto(`Não encontrei "${nome}". Personagens salvos: ${nomes || "nenhum"}.`);
      }
      return texto(`Personagem "${apagado.nome}" apagado, junto com as fotos.`);
    }
  );

  server.registerTool(
    "ver_creditos",
    {
      title: "Ver créditos",
      description: "Mostra o saldo de créditos do Kie.ai e quanto o Claude já gastou hoje por este conector.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      if (provedor.nome !== "kie") return texto("Modo simulado: nenhum crédito é gasto.");
      try {
        const saldo = await consultarSaldo();
        return texto(`Saldo no Kie.ai: ${saldo.toLocaleString("pt-BR")} créditos.\nGasto hoje pelo Claude: cerca de ${gastos.dia === hoje() ? gastos.total : 0} de ${config.limiteDiario || "sem"} créditos de teto.`);
      } catch (e) {
        return texto(`Não consegui ler o saldo: ${(e as Error).message}`);
      }
    }
  );

  // Espera um pouco (áudios saem em segundos) e devolve a tarefa como estiver.
  async function iniciarEsperando(pedido: PedidoGeracao, ms: number): Promise<Tarefa | string> {
    const teto = conferirTeto(estimarCreditos(pedido));
    if (teto) return teto;
    let tarefa: Tarefa;
    try { tarefa = await provedor.iniciar(pedido); } catch (e) { return `Não consegui gerar: ${(e as Error).message}`; }
    reservar(tarefa);
    const limite = Date.now() + ms;
    while (Date.now() < limite) {
      await esperar(1_500);
      tarefa = (await provedor.consultar(tarefa.id).catch(() => tarefa)) ?? tarefa;
      if (tarefa.situacao === "pronta" || tarefa.situacao === "falhou") break;
    }
    if (tarefa.situacao === "pronta") salvarNaGaleria(tarefa);
    registrarGasto(tarefa);
    return tarefa;
  }
  const comoTexto = (t: Tarefa | string) => texto(typeof t === "string" ? t : descreverTarefa(t));
  const listaVozes = "Femininas: Laura, Ana Rita, Bella, Emma, Lucy, Aria. Masculinas: Liam, Brian, Callum, Finn, Benjamin, James.";

  server.registerTool(
    "gerar_voz",
    {
      title: "Gerar voz",
      description:
        "Transforma um texto em fala (narração) com as vozes do ElevenLabs, em português. " + listaVozes +
        " Custa cerca de 12 créditos a cada 1000 letras. Devolve o link do áudio (MP3), que também serve para fazer_falar.",
      inputSchema: {
        texto: z.string().min(2).max(5000).describe("O que a voz vai falar"),
        voz: z.enum(NOMES_VOZES).default("Laura").describe("Nome da voz"),
        velocidade: z.number().min(0.7).max(1.2).default(1).describe("1 = normal"),
      },
      annotations: { openWorldHint: true },
    },
    async ({ texto: fala, voz, velocidade }) => {
      let t = await iniciarEsperando({ tipo: "audio", prompt: fala, formato: "1:1", voz, velocidade }, 40_000);
      // Se o modelo principal falhar por erro interno do Kie.ai, tenta uma vez com o Turbo 2.5
      if (typeof t !== "string" && t.situacao === "falhou" && /internal|interno|try again/i.test(t.erro ?? "")) {
        t = await iniciarEsperando({ tipo: "audio", prompt: fala, formato: "1:1", voz, velocidade, modelo: "turbo" }, 40_000);
      }
      return comoTexto(t);
    }
  );

  server.registerTool(
    "gerar_dialogo",
    {
      title: "Gerar diálogo",
      description:
        "Gera uma conversa entre vozes diferentes (ElevenLabs V3), fala por fala, em português. " + listaVozes +
        " Custa cerca de 12 créditos a cada 1000 letras. Devolve o link do áudio.",
      inputSchema: {
        falas: z.array(z.object({ voz: z.enum(NOMES_VOZES), texto: z.string().min(1) })).min(1).max(40).describe("As falas, na ordem"),
      },
      annotations: { openWorldHint: true },
    },
    async ({ falas }) =>
      comoTexto(await iniciarEsperando({ tipo: "audio", prompt: falas.map((f) => `${f.voz}: ${f.texto}`).join(" / "), formato: "1:1", falas }, 60_000))
  );

  server.registerTool(
    "fazer_falar",
    {
      title: "Fazer falar",
      description:
        "Faz a pessoa de uma foto falar (lip sync com Kling Avatar). Mande o link do retrato e OU o link de um áudio pronto OU um texto com a voz " +
        "(aí a voz é gerada antes). Custa 8 créditos por segundo de fala (16 na versão pro). Demora alguns minutos: devolve o id da tarefa; " +
        "use consultar_tarefa depois.",
      inputSchema: {
        retrato: z.string().url().describe("Link https da foto (rosto de frente, bem iluminado)"),
        audio: z.string().url().optional().describe("Link https de um áudio já pronto (ex.: de gerar_voz)"),
        texto: z.string().min(2).max(1500).optional().describe("Texto da fala, se não tiver áudio"),
        voz: z.enum(NOMES_VOZES).default("Laura").describe("Voz usada quando mandar texto"),
        qualidade: z.enum(["padrao", "pro"]).default("padrao"),
        prompt: z.string().optional().describe("Como a pessoa se comporta (ex.: sorrindo, gesticulando pouco)"),
      },
      annotations: { openWorldHint: true },
    },
    async ({ retrato, audio, texto: fala, voz, qualidade, prompt }) => {
      let audioUrl = audio;
      let antes = "";
      // Duração estimada da fala: cerca de 15 letras por segundo
      const segundos = fala ? Math.max(3, Math.ceil(fala.length / 15)) : 15;
      const modelo = qualidade === "pro" ? "kling-avatar-pro" : "kling-avatar";
      if (!audioUrl) {
        if (!fala) return texto("Mande o link de um áudio ou o texto da fala.");
        const teto = conferirTeto(estimarCreditos({ tipo: "falante", prompt: "", formato: "1:1", modelo, duracaoSegundos: segundos }) + 1);
        if (teto) return texto(teto);
        const v = await iniciarEsperando({ tipo: "audio", prompt: fala, formato: "1:1", voz }, 45_000);
        if (typeof v === "string") return texto(v);
        if (v.situacao !== "pronta" || !v.resultadoUrl) return texto(`A voz ainda não ficou pronta (tarefa ${v.id}). Tente fazer_falar de novo com o link do áudio quando ela terminar.`);
        audioUrl = v.resultadoUrl;
        antes = `Voz gerada (${voz}): ${audioUrl}\n\n`;
      }
      const t = await iniciarEsperando(
        { tipo: "falante", prompt: prompt ?? "", formato: "1:1", modelo, imagemInicial: retrato, audioUrl, duracaoSegundos: segundos },
        0
      );
      return texto(antes + (typeof t === "string" ? t : descreverTarefa(t)));
    }
  );

  // ---------- Tudo do site: modelos extras, ferramentas e apps de vídeo ----------
  // Usa o mesmo catálogo do site, então os pedidos saem iguais aos de lá.
  const AVANCADOS: Record<string, { midia: PedidoGeracao["tipo"]; custo: (p: Record<string, any>) => number; rotulo: string }> = {
    "nano-banana-pro": { midia: "imagem", custo: (p) => (p.resolution === "4K" ? 24 : 18), rotulo: "Nano Banana Pro (cria e edita, até 8 refs)" },
    "nano-banana-2": { midia: "imagem", custo: (p) => ({ "2K": 12, "4K": 18 } as any)[p.resolution] ?? 8, rotulo: "Nano Banana 2 (criar)" },
    "nano-banana-2-edit": { midia: "imagem", custo: (p) => ({ "2K": 12, "4K": 18 } as any)[p.resolution] ?? 8, rotulo: "Nano Banana 2 (editar com images_list)" },
    "seedream-5-pro": { midia: "imagem", custo: () => 15, rotulo: "Seedream 5.0 Pro (criar; quality basic|high)" },
    "seedream-5-pro-edit": { midia: "imagem", custo: () => 15, rotulo: "Seedream 5.0 Pro (editar, até 10 refs)" },
    "seedream-4.5": { midia: "imagem", custo: () => 10, rotulo: "Seedream 4.5 (criar)" },
    "seedream-4.5-edit": { midia: "imagem", custo: () => 10, rotulo: "Seedream 4.5 (editar)" },
    "gpt-image-2": { midia: "imagem", custo: (p) => ({ "2K": 10, "4K": 16 } as any)[p.resolution] ?? 6, rotulo: "GPT Image 2 (cria e edita, até 16 refs)" },
    "flux-2-pro": { midia: "imagem", custo: () => 10, rotulo: "Flux 2 Pro (criar)" },
    "flux-2-pro-edit": { midia: "imagem", custo: () => 10, rotulo: "Flux 2 Pro (editar)" },
    "ideogram-v3": { midia: "imagem", custo: () => 10, rotulo: "Ideogram V3 (ótimo com texto; resolution TURBO|BALANCED|QUALITY)" },
    "v-kling-3": { midia: "video", custo: (p) => (({ pro: p.audio ? 27 : 18, "4K": 67 } as any)[p.resolution] ?? (p.audio ? 20 : 14)) * Number(p.duration ?? 5), rotulo: "Kling 3.0 (texto ou quadros; resolution std|pro|4K; audio)" },
    "v-veo-3-1": { midia: "video", custo: (p) => ({ veo3: 250, veo3_lite: 30 } as any)[p.variante] ?? 60, rotulo: "Veo 3.1 (variante veo3_fast|veo3_lite|veo3; texto, quadros ou referencias)" },
    "v-seedance-2-5": { midia: "video", custo: (p) => (({ "480p": 28, "1080p": 158 } as any)[p.resolution] ?? 63) * Number(p.duration ?? 5), rotulo: "Seedance 2.5 (texto, quadros ou referencias; 4 a 30 s)" },
    "v-seedance-2": { midia: "video", custo: (p) => 40 * Number(p.duration ?? 5), rotulo: "Seedance 2" },
    "v-wan-3": { midia: "video", custo: (p) => (({ "720P": 16, "1080P": 32 } as any)[p.resolution] ?? 8) * Number(p.duration ?? 5), rotulo: "Wan 3.0 (barato; resolution 480P|720P|1080P)" },
    "v-hailuo-2-3": { midia: "video", custo: () => 60, rotulo: "Hailuo 2.3 (anima imagem: image_url)" },
    // Custos abaixo são estimativas provisórias (a documentação do Kie.ai não publica preço); o valor real é lido ao terminar.
    "v-gemini-omni-1-1": { midia: "video", custo: (p) => (({ "360p": 6, "1080p": 16, "4k": 40 } as any)[p.resolution] ?? 10) * Number(p.duration ?? 6), rotulo: "Gemini Omni 1.1 Flash, do Google (texto, quadros ou referencias; edita vídeo com video_url; 4 a 10 s; resolution 360p|720p|1080p|4k)" },
    "v-happyhorse-1-1": { midia: "video", custo: (p) => (p.resolution === "720p" ? 10 : 16) * Number(p.duration ?? 5), rotulo: "HappyHorse 1.1 (texto ou imagem inicial; 3 a 15 s; resolution 720p|1080p)" },
    "v-kling-3-omni": { midia: "video", custo: (p) => (({ "1080p": 18, "4k": 67 } as any)[p.resolution] ?? 14) * (p.audio ? 1.4 : 1) * Number(p.duration ?? 5), rotulo: "Kling 3.0 Omni (só texto para vídeo; 3 a 15 s; resolution 720p|1080p|4k; audio)" },
    "v-minimax-h3": { midia: "video", custo: (p) => (p.resolution === "2K" ? 30 : 12) * Number(p.duration ?? 6), rotulo: "MiniMax H3 (só texto para vídeo, sai com áudio; 4 a 15 s; resolution 768P|2K)" },
    "kling-avatar": { midia: "falante", custo: () => 120, rotulo: "Kling Avatar (image_url + audio_url)" },
    "kling-avatar-pro": { midia: "falante", custo: () => 240, rotulo: "Kling Avatar Pro (image_url + audio_url)" },
    "omnihuman-1-5": { midia: "falante", custo: () => 200, rotulo: "OmniHuman 1.5 (image_url + audio_url; resolution 720|1080)" },
    "lipsync-video": { midia: "falante", custo: () => 100, rotulo: "Troca a fala de um vídeo (video_url + audio_url)" },
    "topaz-imagem": { midia: "imagem", custo: (p) => (String(p.fator) === "4" ? 20 : 10), rotulo: "Ampliar imagem Topaz (image_url, fator 2|4)" },
    "recraft-nitidez": { midia: "imagem", custo: () => 5, rotulo: "Ampliar com nitidez Recraft (image_url)" },
    "recraft-fundo": { midia: "imagem", custo: () => 5, rotulo: "Tirar fundo Recraft (image_url, até 5 MB)" },
    "topaz-video": { midia: "video", custo: () => 150, rotulo: "Ampliar vídeo Topaz (video_url, fator 2|4)" },
    "wan-animate-replace": { midia: "video", custo: () => 100, rotulo: "Trocar pessoa no vídeo (video_url até 10 MB + image_url; resolution 480p|580p|720p)" },
    "wan-animate-move": { midia: "video", custo: () => 100, rotulo: "Copiar movimento (video_url com o movimento + image_url da foto)" },
    "pixverse-extend": { midia: "video", custo: (p) => 10 * Number(p.duration ?? 5), rotulo: "Estender vídeo (video_url, prompt, duration 1 a 15)" },
  };
  const IDS = Object.keys(AVANCADOS) as [string, ...string[]];

  server.registerTool(
    "gerar_avancado",
    {
      title: "Gerar com qualquer modelo do Estúdio",
      description:
        "Usa qualquer modelo, ferramenta ou app de vídeo do site Mister Studio, com os mesmos parâmetros de lá. Gasta créditos do Kie.ai. " +
        "Para o básico prefira gerar_imagem, gerar_video e gerar_voz. Modelos:\n" +
        IDS.map((id) => `- ${id}: ${AVANCADOS[id].rotulo}`).join("\n") +
        "\nParâmetros (em 'parametros'): prompt; aspect_ratio (ex.: 1:1, 4:5, 9:16, 16:9); resolution (imagem 1K|2K|4K; vídeo conforme o modelo); " +
        "quality; images_list (links https de referência para editar); image_url; last_image_url (quadro final); " +
        "modo (texto|quadros|referencias) e refs (links) nos vídeos; duration (segundos); audio (true/false); variante (Veo); " +
        "video_url; audio_url; fator (2|4). Todos os links precisam ser https. " +
        "Só no Gemini Omni: character_ids e audio_ids (ids criados no Kie.ai, até 3 de cada), video_url com video_inicio e video_fim (trecho de até 10 s, para editar um vídeo). " +
        "Para vídeo com a melhor qualidade geral, comece por v-gemini-omni-1-1, v-kling-3, v-veo-3-1 ou v-seedance-2-5.",
      inputSchema: {
        modelo: z.enum(IDS).describe("Id do modelo da lista"),
        parametros: z.record(z.string(), z.any()).describe("Parâmetros do modelo, como no site"),
      },
      annotations: { openWorldHint: true },
    },
    async ({ modelo, parametros }) => {
      const info = AVANCADOS[modelo];
      let corpo: { model: string; input: Record<string, unknown> };
      try { corpo = CATALOGO[modelo].montar(parametros ?? {}); } catch (e) { return texto(`Pedido inválido: ${(e as Error).message}`); }
      const est = Math.round(info.custo(parametros ?? {}));
      const pedido: PedidoGeracao = {
        tipo: info.midia, prompt: String(parametros?.prompt ?? info.rotulo), formato: (String(parametros?.aspect_ratio ?? "1:1") as PedidoGeracao["formato"]),
        corpoPronto: corpo, creditosEstimados: est, modelo,
      };
      const t = await iniciarEsperando(pedido, info.midia === "imagem" ? ESPERA_IMAGEM_MS : 0);
      if (typeof t === "string") return texto(t);
      const resposta = texto(descreverTarefa(t) + (t.situacao !== "pronta" && t.situacao !== "falhou" ? `\nEstimativa: cerca de ${est} créditos.` : ""));
      const img = t.situacao === "pronta" && info.midia === "imagem" ? await previa(t.resultadoUrl) : null;
      if (img) resposta.content.unshift(img);
      return resposta;
    }
  );
}
