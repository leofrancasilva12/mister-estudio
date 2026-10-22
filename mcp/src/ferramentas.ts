import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buscarPersonagem, listarGaleria, listarPersonagens, salvarNaGaleria } from "./galeria.js";
import type { PedidoGeracao, Provedor, Tarefa } from "./provedores/tipos.js";
import { consultarSaldo, estimarCreditos } from "./provedores/kie.js";
import { config } from "./config.js";
import sharp from "sharp";

// Aqui ficam as ferramentas que o Claude enxerga.
// Cada uma tem: nome, descrição (é ela que ensina o Claude quando usar),
// os campos de entrada (conferidos pelo zod) e o que acontece quando é chamada.

const ESPERA_IMAGEM_MS = 25_000; // imagens costumam sair rápido: esperamos até 25 s antes de devolver
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
  const ehVideo = t.pedido.tipo === "video";
  const tipo = ehVideo ? "Vídeo" : "Imagem";
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
function aplicarPersonagem(pedido: PedidoGeracao, nome?: string): { pedido: PedidoGeracao; aviso?: string } {
  if (!nome) return { pedido };
  const personagem = buscarPersonagem(nome);
  if (!personagem) {
    const nomes = listarPersonagens().map((p) => p.nome).join(", ");
    return { pedido, aviso: `Personagem "${nome}" não encontrado. Disponíveis: ${nomes}. Gerei sem personagem.` };
  }
  return {
    pedido: {
      ...pedido,
      promptOriginal: pedido.prompt,
      prompt: `${personagem.descricao}\n\n${pedido.prompt}`,
      referencias: [...(pedido.referencias ?? []), ...personagem.referencias],
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
      const { pedido, aviso } = aplicarPersonagem({ tipo: "imagem", prompt, formato, modelo, qualidade, referencias }, personagem);
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
        "Gasta créditos: Kling 3.0 cerca de 14 por segundo (5 s = 70); Veo 3.1 Rápido 60 por vídeo de até 8 s, com som.",
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
      const { pedido, aviso } = aplicarPersonagem(
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
        tipo: z.enum(["imagem", "video"]).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ limite, tipo }) => {
      const itens = listarGaleria(limite, tipo);
      if (itens.length === 0) return texto("A galeria ainda está vazia.");
      const linhas = itens.map(
        (i, n) => `${n + 1}. ${i.tipo === "video" ? "Vídeo" : "Imagem"} ${i.formato}: ${i.prompt.slice(0, 80)}\n   ${i.url}`
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
      const lista = listarPersonagens()
        .map((p) => `- ${p.nome}: ${p.descricao}`)
        .join("\n");
      return texto(lista || "Nenhum personagem salvo.");
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
}
