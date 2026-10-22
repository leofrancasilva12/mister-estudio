// Transcrição de vídeos do YouTube, sem chave e sem dependências.
// Pede ao YouTube os dados do vídeo (mesma rota que o app de celular usa) e baixa a legenda.

const BASE = process.env.VIDEO_YT_BASE ?? "https://www.youtube.com"; // só muda em testes
const ORIGEM = new URL(BASE); // só aceitamos pedidos para este host e porta
const CLIENTE = { nome: "ANDROID", versao: "20.10.38" };
const UA = `com.google.android.youtube/${CLIENTE.versao} (Linux; U; Android 11) gzip`;
const MAX_BYTES = 6 * 1024 * 1024;

export class ErroVideo extends Error {}

export type Faixa = { idioma: string; nome: string; automatica: boolean; url: string };
export type Info = {
  id: string;
  titulo: string;
  canal: string;
  segundos: number;
  visualizacoes: number | null;
  descricao: string;
  faixas: Faixa[];
};
export type Trecho = { inicio: number; texto: string };

// ---------- Entrada: aceita link ou só o código do vídeo ----------
export function extrairId(entrada: string): string {
  const t = entrada.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(t)) return t;
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`); } catch { throw new ErroVideo("Esse não parece um link do YouTube."); }
  const h = u.hostname.toLowerCase().replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;
  if (h === "youtu.be") id = u.pathname.split("/")[1] ?? null;
  else if (h === "youtube.com" || h === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else {
      const m = /^\/(shorts|embed|live|v)\/([^/?#]+)/.exec(u.pathname);
      if (m) id = m[2];
    }
  } else throw new ErroVideo("Só aceito links do YouTube (youtube.com ou youtu.be).");
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw new ErroVideo("Não achei o código do vídeo nesse link.");
  return id;
}

// ---------- Rede ----------
async function pedir(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<string> {
  const u = new URL(url);
  if (u.host !== ORIGEM.host || u.protocol !== ORIGEM.protocol || u.username || u.password) throw new ErroVideo("Endereço de legenda não permitido.");
  let r: Response;
  try {
    r = await fetch(u, { ...init, redirect: "manual", signal: AbortSignal.timeout(init.timeoutMs ?? 20_000) });
  } catch {
    throw new ErroVideo("O YouTube não respondeu. Tente de novo em instantes.");
  }
  if (r.status >= 300 && r.status < 400) throw new ErroVideo("O YouTube redirecionou o pedido (provável bloqueio do servidor).");
  if (r.status === 429) throw new ErroVideo("O YouTube limitou os pedidos deste servidor. Espere alguns minutos.");
  if (!r.ok) throw new ErroVideo(`O YouTube respondeu com erro ${r.status}.`);
  if (Number(r.headers.get("content-length") ?? 0) > MAX_BYTES) throw new ErroVideo("Resposta grande demais.");
  return (await r.text()).slice(0, MAX_BYTES);
}

// ---------- Dados do vídeo ----------
const cache = new Map<string, { quando: number; info: Info }>();
const CACHE_MS = 60 * 60_000;

export async function buscarInfo(id: string, idiomaPreferido: string): Promise<Info> {
  const guardado = cache.get(id);
  if (guardado && Date.now() - guardado.quando < CACHE_MS) return guardado.info;

  const corpo = {
    context: { client: { clientName: CLIENTE.nome, clientVersion: CLIENTE.versao, androidSdkVersion: 30, hl: idiomaPreferido || "pt", gl: "BR" } },
    videoId: id,
    contentCheckOk: true,
    racyCheckOk: true,
  };
  const txt = await pedir(`${BASE}/youtubei/v1/player?prettyPrint=false`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA, "X-YouTube-Client-Name": "3", "X-YouTube-Client-Version": CLIENTE.versao },
    body: JSON.stringify(corpo),
  });
  let d: any;
  try { d = JSON.parse(txt); } catch { throw new ErroVideo("O YouTube devolveu uma resposta que não consegui ler."); }

  const estado = d?.playabilityStatus?.status;
  if (estado && estado !== "OK") {
    const motivo = String(d.playabilityStatus.reason ?? "");
    if (/sign in|confirm you.re not a bot/i.test(motivo)) throw new ErroVideo("O YouTube pediu confirmação de que não sou robô (bloqueio do servidor). Tente depois ou use outro vídeo.");
    if (/private|privado/i.test(motivo)) throw new ErroVideo("Esse vídeo é privado.");
    if (/age|idade/i.test(motivo)) throw new ErroVideo("Esse vídeo tem restrição de idade e não consigo abrir.");
    throw new ErroVideo(`O YouTube não liberou esse vídeo${motivo ? `: ${motivo.slice(0, 160)}` : "."}`);
  }
  const v = d?.videoDetails;
  if (!v?.videoId) throw new ErroVideo("Não encontrei esse vídeo.");

  const faixas: Faixa[] = (d?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [])
    .filter((f: any) => typeof f?.baseUrl === "string" && f?.languageCode)
    .map((f: any) => ({
      idioma: String(f.languageCode),
      nome: String(f.name?.simpleText ?? f.name?.runs?.[0]?.text ?? f.languageCode),
      automatica: f.kind === "asr",
      url: String(f.baseUrl),
    }));

  const info: Info = {
    id,
    titulo: String(v.title ?? "(sem título)"),
    canal: String(v.author ?? ""),
    segundos: Number(v.lengthSeconds ?? 0),
    visualizacoes: v.viewCount != null && !isNaN(Number(v.viewCount)) ? Number(v.viewCount) : null,
    descricao: String(v.shortDescription ?? ""),
    faixas,
  };
  cache.set(id, { quando: Date.now(), info });
  if (cache.size > 100) cache.delete(cache.keys().next().value!);
  return info;
}

// ---------- Escolha do idioma ----------
// Prefere legenda feita por humano; depois a automática; depois o mesmo idioma com outra região (pt-BR x pt).
export function escolherFaixa(faixas: Faixa[], idioma: string): { faixa: Faixa; exata: boolean } | null {
  if (!faixas.length) return null;
  const alvo = idioma.toLowerCase();
  const base = alvo.split("-")[0];
  const ordem = (a: Faixa, b: Faixa) => Number(a.automatica) - Number(b.automatica);
  const exatas = faixas.filter((f) => f.idioma.toLowerCase() === alvo).sort(ordem);
  if (exatas[0]) return { faixa: exatas[0], exata: true };
  const parecidas = faixas.filter((f) => f.idioma.toLowerCase().split("-")[0] === base).sort(ordem);
  if (parecidas[0]) return { faixa: parecidas[0], exata: true };
  return { faixa: [...faixas].sort(ordem)[0], exata: false };
}

// ---------- Legenda (XML) ----------
const nomeadas: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function entidades(s: string): string {
  const uma = (t: string) =>
    t
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/&([a-z]+);/gi, (m, n) => nomeadas[n.toLowerCase()] ?? m);
  return uma(uma(s)); // o YouTube às vezes codifica duas vezes (&amp;#39;)
}

export function lerLegenda(xml: string): Trecho[] {
  const saida: Trecho[] = [];
  // Formato novo: <p t="12340" d="2000"><s>palavra</s>...</p> (milissegundos)
  const ps = xml.match(/<p\s[^>]*>[\s\S]*?<\/p>/g);
  if (ps?.length) {
    for (const p of ps) {
      const t = /\st="(\d+)"/.exec(p)?.[1];
      const texto = entidades(p.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
      if (t != null && texto) saida.push({ inicio: Number(t) / 1000, texto });
    }
    if (saida.length) return saida;
  }
  // Formato clássico: <text start="12.34" dur="2">...</text> (segundos)
  for (const m of xml.matchAll(/<text\s([^>]*)>([\s\S]*?)<\/text>/g)) {
    const s = /start="([\d.]+)"/.exec(m[1])?.[1];
    const texto = entidades(m[2].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
    if (s != null && texto) saida.push({ inicio: Number(s), texto });
  }
  return saida;
}

export async function baixarLegenda(f: Faixa): Promise<Trecho[]> {
  const u = new URL(f.url);
  u.searchParams.delete("fmt"); // formato padrão do servidor
  const xml = await pedir(u.toString(), { headers: { "User-Agent": UA } });
  const trechos = lerLegenda(xml);
  if (!trechos.length) throw new ErroVideo("A legenda veio vazia. O YouTube pode ter bloqueado este servidor.");
  return trechos;
}

// ---------- Formatação ----------
export function hora(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const dois = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${dois(m)}:${dois(r)}` : `${dois(m)}:${dois(r)}`;
}

// Junta falas curtas em blocos de ~30 s, cada um com o horário de início.
export function emBlocos(trechos: Trecho[], janela = 30): string {
  const blocos: string[] = [];
  let atual: { inicio: number; partes: string[] } | null = null;
  for (const t of trechos) {
    if (!atual || t.inicio - atual.inicio >= janela) {
      if (atual) blocos.push(`[${hora(atual.inicio)}] ${atual.partes.join(" ")}`);
      atual = { inicio: t.inicio, partes: [] };
    }
    atual.partes.push(t.texto);
  }
  if (atual) blocos.push(`[${hora(atual.inicio)}] ${atual.partes.join(" ")}`);
  return blocos.join("\n");
}
