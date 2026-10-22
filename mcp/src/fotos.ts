import sharp from "sharp";
import { buscarPersonagem, criarPersonagem, type Personagem } from "./galeria.js";

// Fotos dos personagens: valida, reduz e converte. Usado pela ferramenta criar_personagem
// e pela rota interna que o site usa ("Enviar para o Studio").

const MAX_BYTES = 8 * 1024 * 1024;
const FORMATOS_ACEITOS = ["jpeg", "png", "webp"]; // conferido pelo conteúdo real do arquivo

async function tratarFoto(bruto: Buffer, origem: string): Promise<Buffer> {
  if (bruto.length > MAX_BYTES) throw new Error(`${origem} passou de 8 MB.`);
  let formato: string | undefined;
  try { formato = (await sharp(bruto).metadata()).format; } catch { /* não é imagem */ }
  if (!formato || !FORMATOS_ACEITOS.includes(formato)) throw new Error(`${origem} não é JPEG, PNG ou WebP.`);
  return sharp(bruto).rotate().resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 86 }).toBuffer();
}

async function baixarFoto(url: string, n: number): Promise<Buffer> {
  const origem = `A foto ${n} (link)`;
  if (!/^https:\/\//i.test(url)) throw new Error(`${origem} precisa começar com https://.`);
  let r: globalThis.Response;
  try { r = await fetch(url, { signal: AbortSignal.timeout(30_000) }); } catch { throw new Error(`Não consegui baixar ${origem.toLowerCase()}.`); }
  if (!r.ok) throw new Error(`${origem} respondeu com erro ${r.status}.`);
  const tipo = (r.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (tipo && !["image/jpeg", "image/png", "image/webp"].includes(tipo)) throw new Error(`${origem} não é JPEG, PNG ou WebP (veio ${tipo}).`);
  if (Number(r.headers.get("content-length") ?? 0) > MAX_BYTES) throw new Error(`${origem} passou de 8 MB.`);
  return tratarFoto(Buffer.from(await r.arrayBuffer()), origem);
}

function decodificarFoto(base64: string, n: number): Promise<Buffer> {
  const origem = `A foto ${n} (base64)`;
  const m = /^data:([^;,]+);base64,/i.exec(base64.trim());
  if (m && !["image/jpeg", "image/png", "image/webp"].includes(m[1].toLowerCase())) {
    throw new Error(`${origem} não é JPEG, PNG ou WebP (veio ${m[1]}).`);
  }
  const limpo = base64.trim().replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
  if (limpo.length > Math.ceil(MAX_BYTES / 3) * 4 + 4) throw new Error(`${origem} passou de 8 MB.`);
  return tratarFoto(Buffer.from(limpo, "base64"), origem);
}


export class ErroCadastro extends Error {
  constructor(mensagem: string, public status = 400) { super(mensagem); }
}

// Valida tudo, trata as fotos e cria o personagem (de 1 a 4 fotos no total)
export async function cadastrarPersonagem(d: {
  nome: string;
  descricao: string;
  fotos_links?: string[];
  fotos_base64?: string[];
}): Promise<Personagem> {
  const nome = String(d.nome ?? "").trim();
  const descricao = String(d.descricao ?? "").trim();
  if (nome.length < 2 || nome.length > 40) throw new ErroCadastro("O nome precisa ter de 2 a 40 letras.");
  if (descricao.length < 10 || descricao.length > 600) throw new ErroCadastro("A descrição precisa ter de 10 a 600 letras.");
  const links = d.fotos_links ?? [];
  const b64 = d.fotos_base64 ?? [];
  const total = links.length + b64.length;
  if (total < 1 || total > 4) throw new ErroCadastro(`Mande de 1 a 4 fotos no total (recebi ${total}).`);
  if (await buscarPersonagem(nome)) throw new ErroCadastro(`Já existe um personagem chamado "${nome}". Escolha outro nome.`, 409);
  const fotos: Buffer[] = [];
  for (let i = 0; i < links.length; i++) fotos.push(await baixarFoto(links[i], i + 1));
  for (let i = 0; i < b64.length; i++) fotos.push(await decodificarFoto(b64[i], links.length + i + 1));
  try {
    return await criarPersonagem({ nome, descricao, fotos });
  } catch (e) {
    const msg = (e as Error).message;
    throw new ErroCadastro(msg, msg.startsWith("Já existe") ? 409 : 502);
  }
}
