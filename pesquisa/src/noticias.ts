import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Últimas notícias por RSS: grátis, sem chave. Lê o feed, ordena por data e devolve título, resumo, link e horário.

export const FEEDS: Record<string, { nome: string; url: string }> = {
  g1: { nome: "g1 (geral)", url: "https://g1.globo.com/rss/g1/" },
  "g1-economia": { nome: "g1 Economia", url: "https://g1.globo.com/rss/g1/economia/" },
  "g1-mundo": { nome: "g1 Mundo", url: "https://g1.globo.com/rss/g1/mundo/" },
  "g1-politica": { nome: "g1 Política", url: "https://g1.globo.com/rss/g1/politica/" },
  "g1-tecnologia": { nome: "g1 Tecnologia", url: "https://g1.globo.com/dynamo/tecnologia/rss2.xml" },
  "g1-pop-arte": { nome: "g1 Pop & Arte", url: "https://g1.globo.com/rss/g1/pop-arte/" },
  "g1-carros": { nome: "g1 Carros", url: "https://g1.globo.com/rss/g1/carros/" },
  "g1-concursos": { nome: "g1 Concursos", url: "https://g1.globo.com/rss/g1/trabalho-e-carreira/concursos/" },
};

const MAX_BYTES = 3 * 1024 * 1024;
const PERMITIR_HTTP = process.env.PESQUISA_PERMITIR_HTTP === "1"; // só para testes locais

// Bloqueia endereços internos (outros serviços da VPS, rede do Docker, IPs privados).
function urlSegura(bruta: string): URL {
  let u: URL;
  try { u = new URL(bruta); } catch { throw new Error("Link do feed inválido."); }
  if (u.protocol !== "https:" && !(PERMITIR_HTTP && u.protocol === "http:")) throw new Error("O feed precisa começar com https://.");
  const h = u.hostname.toLowerCase();
  const ipPrivado = /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(h) || h === "::1" || h.startsWith("[");
  if (!PERMITIR_HTTP && (!h.includes(".") || h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || ipPrivado || /^\d+\.\d+\.\d+\.\d+$/.test(h))) {
    throw new Error("Esse endereço não é permitido.");
  }
  return u;
}

const decodificar = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();

function campo(bloco: string, ...nomes: string[]): string {
  for (const n of nomes) {
    const m = new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`, "i").exec(bloco);
    if (m) return m[1];
  }
  return "";
}

export type Noticia = { titulo: string; link: string; data: Date | null; resumo: string };

export function lerFeed(xml: string): Noticia[] {
  const blocos = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  return blocos.map((b) => {
    let link = decodificar(campo(b, "link"));
    if (!link) link = /<link[^>]*href="([^"]+)"/i.exec(b)?.[1] ?? "";
    const dataTxt = decodificar(campo(b, "pubDate", "published", "updated", "dc:date"));
    const data = dataTxt ? new Date(dataTxt) : null;
    return {
      titulo: decodificar(campo(b, "title")) || "(sem título)",
      link,
      data: data && !isNaN(data.getTime()) ? data : null,
      resumo: decodificar(campo(b, "description", "summary", "content")).slice(0, 400),
    };
  });
}

function quandoFoi(d: Date | null): string {
  if (!d) return "sem data";
  const min = Math.round((Date.now() - d.getTime()) / 60_000);
  const hora = d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  if (min < 0) return hora;
  if (min < 60) return `${hora} (há ${min} min)`;
  if (min < 48 * 60) return `${hora} (há ${Math.round(min / 60)} h)`;
  return hora;
}

export function registrarNoticias(server: McpServer) {
  const ids = Object.keys(FEEDS) as [string, ...string[]];
  server.registerTool(
    "ultimas_noticias",
    {
      title: "Últimas notícias (RSS)",
      description:
        "Traz as notícias mais recentes de um portal pelo feed RSS, com título, resumo, horário e link. Grátis. " +
        `Fontes prontas: ${ids.map((i) => `${i} (${FEEDS[i].nome})`).join(", ")}. ` +
        "Para outro site, passe o link do feed RSS em feed_url. Para ler a matéria completa, abra o link com a ferramenta de leitura de páginas. " +
        "Ao usar notícias em posts: resuma com suas palavras e cite a fonte.",
      inputSchema: {
        fonte: z.enum(ids).default("g1").describe("Fonte pronta (ignorada se feed_url for informado)"),
        feed_url: z.string().optional().describe("Link https de um feed RSS/Atom de outro site"),
        quantidade: z.number().int().min(1).max(15).default(5),
      },
      annotations: { openWorldHint: true, readOnlyHint: true },
    },
    async ({ fonte, feed_url, quantidade }) => {
      const texto = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
      try {
        const u = urlSegura(feed_url || FEEDS[fonte].url);
        const nome = feed_url ? u.hostname : FEEDS[fonte].nome;
        // Segue até 3 redirecionamentos, conferindo cada destino (nunca para endereço interno)
        let r: globalThis.Response | undefined;
        let alvo = u;
        for (let pulo = 0; pulo < 4; pulo++) {
          try {
            r = await fetch(alvo, { headers: { "User-Agent": "MisterPesquisa/1.0 (+RSS)" }, signal: AbortSignal.timeout(15_000), redirect: "manual" });
          } catch {
            return texto(`O feed de ${nome} não respondeu. Tente de novo ou use outra fonte.`);
          }
          const destino = r.status >= 300 && r.status < 400 ? r.headers.get("location") : null;
          if (!destino) break;
          if (pulo === 3) return texto(`O feed de ${nome} redireciona demais.`);
          alvo = urlSegura(new URL(destino, alvo).toString());
        }
        if (!r) return texto(`O feed de ${nome} não respondeu.`);
        if (!r.ok) return texto(`O feed de ${nome} respondeu com erro ${r.status}. Pode ter mudado de endereço.`);
        if (Number(r.headers.get("content-length") ?? 0) > MAX_BYTES) return texto("O feed é grande demais.");
        const xml = (await r.text()).slice(0, MAX_BYTES);
        const lista = lerFeed(xml)
          .sort((a, b) => (b.data?.getTime() ?? 0) - (a.data?.getTime() ?? 0))
          .slice(0, quantidade);
        if (!lista.length) return texto(`Não encontrei notícias no feed de ${nome}. Confira se o link é mesmo um feed RSS.`);
        const linhas = lista.map((n, i) => `${i + 1}. ${n.titulo}\n   ${quandoFoi(n.data)}\n   ${n.resumo ? n.resumo + "\n   " : ""}${n.link}`);
        return texto(`Últimas de ${nome}:\n\n${linhas.join("\n\n")}\n\nFonte: ${nome}. Custo: grátis.`);
      } catch (e) {
        return texto(`Não consegui ler o feed: ${(e as Error).message}`);
      }
    }
  );
}
