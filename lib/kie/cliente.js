// Cliente do Kie.ai. Roda SÓ no servidor: é aqui que a chave secreta é usada.
import 'server-only';

const API = process.env.KIE_API_BASE || 'https://api.kie.ai';
const UPLOAD = process.env.KIE_UPLOAD_BASE || 'https://kieai.redpandaai.co';
export const SIMULADO = process.env.KIE_SIMULADO === 'true';

// O Kie.ai responde HTTP 200 até nos erros; o código real vem no campo "code".
const MENSAGENS = {
    401: 'Chave do Kie.ai inválida. Confira a KIE_API_KEY no .env da VPS.',
    402: 'Acabaram os créditos do Kie.ai. Recarregue no painel do Kie.ai.',
    404: 'Tarefa não encontrada no Kie.ai.',
    422: 'O Kie.ai recusou as opções enviadas.',
    429: 'Muitos pedidos seguidos. Espere alguns segundos e tente de novo.',
    433: 'Limite de uso do Kie.ai atingido.',
    455: 'O Kie.ai está em manutenção. Tente mais tarde.',
    500: 'O Kie.ai teve um erro interno. Tente de novo.',
    501: 'A geração falhou no Kie.ai.',
    505: 'Esse recurso está desligado no Kie.ai.',
};

export class ErroKie extends Error {
    constructor(mensagem, status = 502) {
        super(mensagem);
        this.status = status;
    }
}

function chave() {
    const k = process.env.KIE_API_KEY;
    if (!k) throw new ErroKie('Falta a KIE_API_KEY no .env do servidor.', 500);
    return k;
}

async function chamar(url, opcoes = {}) {
    let resposta;
    try {
        resposta = await fetch(url, {
            ...opcoes,
            headers: { Authorization: `Bearer ${chave()}`, ...(opcoes.headers || {}) },
            cache: 'no-store',
            signal: AbortSignal.timeout(opcoes.timeout ?? 60000),
        });
    } catch (e) {
        if (e instanceof ErroKie) throw e;
        throw new ErroKie('Não consegui falar com o Kie.ai. Tente de novo em instantes.');
    }
    let dados = null;
    try { dados = await resposta.json(); } catch { /* sem JSON */ }
    const codigo = dados?.code ?? resposta.status;
    if (codigo !== 200) {
        const base = MENSAGENS[codigo] || `O Kie.ai respondeu com erro ${codigo}.`;
        const detalhe = dados?.msg && codigo === 422 ? ` (${String(dados.msg).slice(0, 160)})` : '';
        throw new ErroKie(base + detalhe, codigo === 429 ? 429 : 502);
    }
    return dados.data;
}

// ---------- Criar e consultar tarefas ----------

export async function criarTarefa(pedido) {
    if (SIMULADO) return `sim-${pedido.model.replace(/[^a-z0-9]+/gi, '_')}-${Date.now()}`;
    const data = await chamar(`${API}/api/v1/jobs/createTask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedido),
    });
    if (!data?.taskId) throw new ErroKie('O Kie.ai não devolveu o número da tarefa.');
    return data.taskId;
}

// Cada modelo devolve o link num lugar um pouco diferente (o Veo, por exemplo, usa result_urls)
function extrairUrls(data) {
    let r = {};
    try { r = typeof data.resultJson === 'string' ? JSON.parse(data.resultJson || '{}') : (data.resultJson || {}); } catch { /* resultado estranho */ }
    const candidatos = [r.resultUrls, r.result_urls, r.data?.result_urls, r.data?.resultUrls, r.origin_urls, r.data?.origin_urls, data.origin_urls, r.resultUrl && [r.resultUrl]];
    const achado = candidatos.find((c) => Array.isArray(c) && c.length);
    return (achado || []).filter((u) => typeof u === 'string');
}

export async function consultarTarefa(id) {
    if (SIMULADO) return simularConsulta(id);
    const data = await chamar(`${API}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(id)}`, { timeout: 20000 });
    const estado = data?.state;
    if (estado === 'success') {
        let urls = [];
        urls = extrairUrls(data);
        if (!urls.length) return { estado: 'falhou', motivo: 'O Kie.ai terminou, mas não mandou o arquivo.' };
        return { estado: 'pronto', urls };
    }
    if (estado === 'fail') {
        return { estado: 'falhou', motivo: data.failMsg ? `Falhou no Kie.ai: ${String(data.failMsg).slice(0, 200)}` : 'A geração falhou no Kie.ai.' };
    }
    return { estado: 'gerando', progresso: typeof data?.progress === 'number' ? data.progress : null };
}

// ---------- Envio de arquivos ----------
// O Kie.ai guarda arquivos enviados por 24 h: tempo de sobra para a geração usar.

export async function enviarArquivo(arquivo) {
    if (SIMULADO) {
        const tipo = arquivo.type || '';
        if (tipo.startsWith('image/')) return 'https://placehold.co/1024x1024/png?text=Arquivo+simulado';
        return 'https://example.com/arquivo-simulado';
    }
    const form = new FormData();
    form.append('file', arquivo, arquivo.name || 'arquivo');
    form.append('uploadPath', 'estudio');
    const data = await chamar(`${UPLOAD}/api/file-stream-upload`, { method: 'POST', body: form, timeout: 300000 });
    const url = data?.downloadUrl || data?.fileUrl;
    if (!url) throw new ErroKie('O Kie.ai não devolveu o link do arquivo.');
    return url;
}

export async function consultarCreditos() {
    if (SIMULADO) return 9999;
    return chamar(`${API}/api/v1/chat/credit`, { timeout: 15000 });
}

// ---------- Modo simulado (sem gastar créditos) ----------

const SEGUNDOS = Number(process.env.KIE_SEGUNDOS_SIMULADOS || 6);

function simularConsulta(id) {
    const m = /^sim-(.+)-(\d+)$/.exec(id);
    if (!m) return { estado: 'falhou', motivo: 'Tarefa simulada desconhecida.' };
    const passou = (Date.now() - Number(m[2])) / 1000;
    if (passou < SEGUNDOS) return { estado: 'gerando', progresso: Math.round((passou / SEGUNDOS) * 100) };
    const ehVideo = /seedance|kling|hailuo|infinitalk|lip|avatar/.test(m[1]);
    const url = ehVideo
        ? 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
        : `https://placehold.co/1024x1024/png?text=${encodeURIComponent('Simulado: ' + m[1])}`;
    return { estado: 'pronto', urls: [url] };
}
