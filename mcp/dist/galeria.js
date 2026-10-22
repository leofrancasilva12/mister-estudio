import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { enviarParaKie } from "./provedores/upload.js";
// ---------------- Galeria (memória) ----------------
const itens = [];
export function salvarNaGaleria(tarefa) {
    if (tarefa.situacao !== "pronta" || !tarefa.resultadoUrl)
        return undefined;
    const existente = itens.find((i) => i.id === tarefa.id);
    if (existente)
        return existente;
    const item = {
        id: tarefa.id,
        tipo: tarefa.pedido.tipo,
        prompt: tarefa.pedido.promptOriginal ?? tarefa.pedido.prompt,
        formato: tarefa.pedido.formato,
        url: tarefa.resultadoUrl,
        criadoEm: new Date().toISOString(),
    };
    itens.unshift(item);
    return item;
}
export function listarGaleria(limite, tipo) {
    return itens.filter((i) => !tipo || i.tipo === tipo).slice(0, limite);
}
// ---------------- Personagens (disco) ----------------
const DADOS = process.env.DADOS_DIR ?? "/dados";
const ARQUIVO = path.join(DADOS, "personagens.json");
const PASTA_FOTOS = path.join(DADOS, "personagens");
const VALIDADE_LINK_MS = 20 * 3600 * 1000; // reenviamos antes das 24 h do Kie.ai
// Semente: o personagem que já existia, criado na primeira vez que o arquivo não existe
const SEMENTE = [
    {
        id: "porta-voz-3d",
        nome: "Porta-voz 3D",
        descricao: "Avatar 3D da dona da Viva Mais Bella, estilo animação 3D, simpática, cabelo e traços baseados nas fotos de referência.",
        fotos: [],
        links: [],
        linksEm: 0,
        criadoEm: new Date(0).toISOString(),
    },
];
let cache = null;
let fila = Promise.resolve();
// Garante que só uma gravação acontece por vez (evita arquivo corrompido)
function emFila(tarefa) {
    const proxima = fila.then(tarefa, tarefa);
    fila = proxima.catch(() => undefined);
    return proxima;
}
async function gravar(lista) {
    await mkdir(DADOS, { recursive: true });
    const temporario = `${ARQUIVO}.tmp`;
    await writeFile(temporario, JSON.stringify(lista, null, 2), "utf8");
    await rename(temporario, ARQUIVO); // troca de uma vez: nunca fica pela metade
    cache = lista;
}
async function carregar() {
    if (cache)
        return cache;
    try {
        const lista = JSON.parse(await readFile(ARQUIVO, "utf8"));
        cache = Array.isArray(lista) ? lista : [];
    }
    catch (e) {
        if (e?.code !== "ENOENT")
            throw new Error(`Não consegui ler ${ARQUIVO}: ${e.message}`);
        await gravar(SEMENTE.map((p) => ({ ...p })));
    }
    return cache;
}
const normalizar = (nome) => nome.trim().toLowerCase();
export async function listarPersonagens() {
    return carregar();
}
export async function buscarPersonagem(nome) {
    const alvo = normalizar(nome);
    return (await carregar()).find((p) => normalizar(p.nome) === alvo);
}
// Fotos já tratadas (JPEG até 1024 px): salva em disco, envia ao Kie.ai e grava o personagem
export async function criarPersonagem(dados) {
    return emFila(async () => {
        const lista = await carregar();
        if (lista.some((p) => normalizar(p.nome) === normalizar(dados.nome))) {
            throw new Error(`Já existe um personagem chamado "${dados.nome}". Escolha outro nome.`);
        }
        const id = randomUUID();
        const pasta = path.join(PASTA_FOTOS, id);
        await mkdir(pasta, { recursive: true });
        try {
            const fotos = [];
            const links = [];
            for (let i = 0; i < dados.fotos.length; i++) {
                const caminho = path.join(pasta, `foto-${i + 1}.jpg`);
                await writeFile(caminho, dados.fotos[i]);
                fotos.push(caminho);
                links.push(await enviarParaKie(dados.fotos[i], `${dados.nome}-${i + 1}.jpg`));
            }
            const personagem = {
                id,
                nome: dados.nome.trim(),
                descricao: dados.descricao.trim(),
                fotos,
                links,
                linksEm: Date.now(),
                criadoEm: new Date().toISOString(),
            };
            await gravar([personagem, ...lista]);
            return personagem;
        }
        catch (e) {
            await rm(pasta, { recursive: true, force: true }); // não deixa fotos órfãs
            throw e;
        }
    });
}
export async function apagarPersonagem(nome) {
    return emFila(async () => {
        const lista = await carregar();
        const alvo = lista.find((p) => normalizar(p.nome) === normalizar(nome));
        if (!alvo)
            return undefined;
        await gravar(lista.filter((p) => p.id !== alvo.id));
        await rm(path.join(PASTA_FOTOS, alvo.id), { recursive: true, force: true });
        return alvo;
    });
}
// Links que o Kie.ai consegue ler. Reenvia as fotos se faltarem links ou se passaram de 20 h.
export async function linksDoPersonagem(p) {
    if (!p.fotos.length)
        return [];
    const validos = p.links.length === p.fotos.length && Date.now() - (p.linksEm || 0) < VALIDADE_LINK_MS;
    if (validos)
        return p.links;
    return emFila(async () => {
        const lista = await carregar();
        const atual = lista.find((x) => x.id === p.id) ?? p;
        // Outro pedido pode ter renovado enquanto este esperava na fila
        if (atual.links.length === atual.fotos.length && Date.now() - (atual.linksEm || 0) < VALIDADE_LINK_MS)
            return atual.links;
        const links = [];
        for (let i = 0; i < atual.fotos.length; i++) {
            links.push(await enviarParaKie(await readFile(atual.fotos[i]), `${atual.nome}-${i + 1}.jpg`));
        }
        await gravar(lista.map((x) => (x.id === atual.id ? { ...x, links, linksEm: Date.now() } : x)));
        return links;
    });
}
