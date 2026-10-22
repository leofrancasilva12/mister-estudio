import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buscarPersonagem, listarGaleria, listarPersonagens, salvarNaGaleria } from "./galeria.js";
import type { PedidoGeracao, Provedor, Tarefa } from "./provedores/tipos.js";

// Aqui ficam as ferramentas que o Claude enxerga.
// Cada uma tem: nome, descrição (é ela que ensina o Claude quando usar),
// os campos de entrada (conferidos pelo zod) e o que acontece quando é chamada.

const ESPERA_IMAGEM_MS = 25_000; // imagens costumam sair rápido: esperamos até 25 s antes de devolver
const INTERVALO_CONSULTA_MS = 1_000;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

function texto(t: string) {
  return { content: [{ type: "text" as const, text: t }] };
}

function descreverTarefa(t: Tarefa): string {
  const ehVideo = t.pedido.tipo === "video";
  const tipo = ehVideo ? "Vídeo" : "Imagem";
  switch (t.situacao) {
    case "pronta":
      return `${tipo} ${ehVideo ? "pronto" : "pronta"}.\nLink: ${t.resultadoUrl}\nFormato: ${t.pedido.formato}\nTarefa: ${t.id}\nJá foi salva na galeria do Estúdio.`;
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
        "Use para posts, criativos e ilustrações. Opcionalmente aplica um personagem salvo (veja listar_personagens) " +
        "para manter o mesmo rosto entre imagens. Normalmente devolve a imagem pronta; se demorar, devolve o id da tarefa.",
      inputSchema: {
        prompt: z.string().min(3).describe("Descrição detalhada da imagem desejada"),
        formato: z.enum(["1:1", "4:5", "9:16", "16:9"]).default("4:5").describe("Proporção: 4:5 para feed, 9:16 para stories"),
        personagem: z.string().optional().describe("Nome de um personagem salvo, por exemplo: Porta-voz 3D"),
      },
      annotations: { openWorldHint: true },
    },
    async ({ prompt, formato, personagem }) => {
      const { pedido, aviso } = aplicarPersonagem({ tipo: "imagem", prompt, formato }, personagem);
      let tarefa = await provedor.iniciar(pedido);

      const limite = Date.now() + ESPERA_IMAGEM_MS;
      while (Date.now() < limite) {
        await esperar(INTERVALO_CONSULTA_MS);
        tarefa = (await provedor.consultar(tarefa.id)) ?? tarefa;
        if (tarefa.situacao === "pronta" || tarefa.situacao === "falhou") break;
      }

      if (tarefa.situacao === "pronta") salvarNaGaleria(tarefa);
      return texto([aviso, descreverTarefa(tarefa)].filter(Boolean).join("\n\n"));
    }
  );

  server.registerTool(
    "gerar_video",
    {
      title: "Gerar vídeo",
      description:
        "Inicia a geração de um vídeo curto com IA a partir de uma descrição. Vídeos demoram alguns minutos, " +
        "então esta ferramenta devolve na hora o id da tarefa. Depois use consultar_tarefa para pegar o resultado.",
      inputSchema: {
        prompt: z.string().min(3).describe("Descrição da cena e do movimento de câmera"),
        formato: z.enum(["9:16", "16:9", "1:1"]).default("9:16").describe("9:16 para Reels e stories"),
        duracao: z.union([z.literal(5), z.literal(10), z.literal(15)]).default(10).describe("Duração em segundos"),
        personagem: z.string().optional().describe("Nome de um personagem salvo"),
      },
      annotations: { openWorldHint: true },
    },
    async ({ prompt, formato, duracao, personagem }) => {
      const { pedido, aviso } = aplicarPersonagem(
        { tipo: "video", prompt, formato, duracaoSegundos: duracao },
        personagem
      );
      const tarefa = await provedor.iniciar(pedido);
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
      const tarefa = await provedor.consultar(id);
      if (!tarefa) return texto(`Não encontrei a tarefa ${id}.`);
      if (tarefa.situacao === "pronta") salvarNaGaleria(tarefa);
      return texto(descreverTarefa(tarefa));
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
}
