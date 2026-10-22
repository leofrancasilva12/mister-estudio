import { config } from "../config.js";
// Envia um arquivo para o Kie.ai e devolve um link https que os modelos conseguem ler.
// É a mesma API usada pelo site (lib/kie/cliente.js → enviarArquivo).
// O link do Kie.ai vale cerca de 24 h; por isso os personagens reenviam as fotos quando vencem.
const UPLOAD = process.env.KIE_UPLOAD_BASE ?? "https://kieai.redpandaai.co";
export async function enviarParaKie(buffer, nome, tipo = "image/jpeg") {
    // Modo simulado: não gasta nada e devolve um link de exemplo
    if (config.provedor !== "kie") {
        return `https://placehold.co/1024x1024/jpg?text=${encodeURIComponent(nome)}`;
    }
    const chave = process.env.KIE_API_KEY;
    if (!chave)
        throw new Error("Falta a KIE_API_KEY no servidor do MCP.");
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(buffer)], { type: tipo }), nome);
    form.append("uploadPath", "estudio");
    let resposta;
    try {
        resposta = await fetch(`${UPLOAD}/api/file-stream-upload`, {
            method: "POST",
            headers: { Authorization: `Bearer ${chave}` },
            body: form,
            signal: AbortSignal.timeout(120_000),
        });
    }
    catch {
        throw new Error("Não consegui enviar a foto ao Kie.ai. Tente de novo em instantes.");
    }
    const dados = await resposta.json().catch(() => null);
    const codigo = dados?.code ?? resposta.status;
    if (codigo !== 200)
        throw new Error(`O Kie.ai recusou o envio da foto (erro ${codigo}).`);
    const url = dados?.data?.downloadUrl ?? dados?.data?.fileUrl;
    if (!url)
        throw new Error("O Kie.ai não devolveu o link da foto.");
    return url;
}
