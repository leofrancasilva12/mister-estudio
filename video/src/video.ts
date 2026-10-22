import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { baixarLegenda, buscarInfo, emBlocos, ErroVideo, escolherFaixa, extrairId, hora, type Info } from "./youtube.js";

const texto = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

const cabecalho = (i: Info) =>
  `${i.titulo}\nCanal: ${i.canal || "?"} · Duração: ${hora(i.segundos)}${i.visualizacoes != null ? ` · ${i.visualizacoes.toLocaleString("pt-BR")} visualizações` : ""}\nLink: https://www.youtube.com/watch?v=${i.id}`;

const listaIdiomas = (i: Info) =>
  i.faixas.length ? i.faixas.map((f) => `${f.idioma}${f.automatica ? " (automática)" : ""}`).join(", ") : "nenhum";

function erro(e: unknown) {
  if (e instanceof ErroVideo) return texto(e.message);
  console.error("Erro inesperado:", e);
  return texto("Não consegui ler esse vídeo agora. Tente de novo em instantes.");
}

export function registrarFerramentas(server: McpServer) {
  server.registerTool(
    "transcrever_youtube",
    {
      title: "Transcrever vídeo do YouTube",
      description:
        "Traz a transcrição (legenda) de um vídeo do YouTube, com o horário de cada trecho. Grátis. " +
        "Use para resumir um vídeo, tirar ideias, montar roteiro ou post a partir dele. Só funciona se o vídeo tiver legenda " +
        "(manual ou automática). Não vê imagens: só o que é falado. Ao usar o conteúdo em posts, resuma com suas palavras e cite o canal.",
      inputSchema: {
        video: z.string().min(11).max(300).describe("Link do vídeo (youtube.com/watch, youtu.be, shorts) ou o código de 11 caracteres"),
        idioma: z.string().min(2).max(10).default("pt").describe("Idioma da legenda: pt, en, es... (se não existir, usa outro e avisa)"),
        formato: z.enum(["com_tempo", "corrido"]).default("com_tempo").describe("com_tempo: blocos de 30 s com horário; corrido: texto contínuo"),
        inicio_segundos: z.number().int().min(0).default(0).describe("Para vídeos longos: começar a partir deste segundo"),
        max_caracteres: z.number().int().min(1000).max(120000).default(40000).describe("Tamanho máximo da resposta"),
      },
      annotations: { openWorldHint: true, readOnlyHint: true },
    },
    async ({ video, idioma, formato, inicio_segundos, max_caracteres }) => {
      try {
        const id = extrairId(video);
        const info = await buscarInfo(id, idioma);
        const escolha = escolherFaixa(info.faixas, idioma);
        if (!escolha) {
          return texto(`${cabecalho(info)}\n\nEsse vídeo não tem legenda disponível, então não consigo transcrever. (Se for um vídeo seu, ative a legenda automática no YouTube Studio.)`);
        }
        const { faixa, exata } = escolha;
        const todos = await baixarLegenda(faixa);
        const trechos = todos.filter((t) => t.inicio >= inicio_segundos);
        if (!trechos.length) return texto(`${cabecalho(info)}\n\nNão há fala depois de ${hora(inicio_segundos)}. O vídeo tem ${hora(info.segundos)}.`);

        let corpo = formato === "corrido" ? trechos.map((t) => t.texto).join(" ") : emBlocos(trechos);
        let cortado = false;
        if (corpo.length > max_caracteres) {
          corpo = corpo.slice(0, max_caracteres);
          const corte = Math.max(corpo.lastIndexOf("\n"), corpo.lastIndexOf(". "));
          if (corte > max_caracteres * 0.8) corpo = corpo.slice(0, corte + 1);
          cortado = true;
        }
        const avisos = [
          `Legenda: ${faixa.idioma}${faixa.automatica ? " (gerada automaticamente, pode ter erros de palavras e nomes)" : " (feita pelo canal)"}`,
          !exata ? `Não existe legenda em "${idioma}"; usei "${faixa.idioma}". Idiomas disponíveis: ${listaIdiomas(info)}.` : "",
        ].filter(Boolean);
        const rodape = cortado
          ? `\n\n(Cortei a resposta por tamanho. Para continuar, peça de novo com inicio_segundos perto do último horário mostrado.)`
          : "";
        return texto(`${cabecalho(info)}\n${avisos.join("\n")}\n\n${corpo}${rodape}\n\nCusto: grátis. Fonte: YouTube${info.canal ? ` (${info.canal})` : ""}.`);
      } catch (e) {
        return erro(e);
      }
    }
  );

  server.registerTool(
    "info_youtube",
    {
      title: "Dados de um vídeo do YouTube",
      description:
        "Mostra título, canal, duração, visualizações, descrição e os idiomas de legenda disponíveis de um vídeo, sem baixar a transcrição. " +
        "Use antes de transcrever vídeos longos ou para conferir se o vídeo tem legenda.",
      inputSchema: { video: z.string().min(11).max(300).describe("Link do vídeo ou código de 11 caracteres") },
      annotations: { openWorldHint: true, readOnlyHint: true },
    },
    async ({ video }) => {
      try {
        const info = await buscarInfo(extrairId(video), "pt");
        const desc = info.descricao.trim().slice(0, 1200);
        return texto(`${cabecalho(info)}\nLegendas: ${listaIdiomas(info)}\n\nDescrição:\n${desc || "(sem descrição)"}`);
      } catch (e) {
        return erro(e);
      }
    }
  );
}
