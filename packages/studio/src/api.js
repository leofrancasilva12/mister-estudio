// Conversa com o NOSSO servidor (rotas /api/estudio/*), nunca direto com o Kie.ai.
// A chave do Kie.ai fica só no servidor; o navegador nem fica sabendo dela.
// O primeiro parâmetro (apiKey) foi mantido só para não mexer nas telas: ele é ignorado.

const BASE = '/api/estudio';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function lerResposta(resposta) {
    let dados = null;
    try { dados = await resposta.json(); } catch { /* resposta sem JSON */ }
    if (!resposta.ok || dados?.erro) {
        throw new Error(dados?.erro || `Falha no servidor (${resposta.status})`);
    }
    return dados;
}

async function acompanhar(id, { tentativas, intervalo }) {
    let falhasDeRede = 0;
    for (let i = 0; i < tentativas; i++) {
        await espera(intervalo);
        let dados;
        try {
            dados = await lerResposta(await fetch(`${BASE}/tarefa?id=${encodeURIComponent(id)}`, { cache: 'no-store' }));
            falhasDeRede = 0;
        } catch (e) {
            // Uma oscilação de internet não deve matar uma geração de vários minutos
            if (++falhasDeRede <= 5 && !/falhou|recusad|inválid/i.test(e.message)) continue;
            throw e;
        }
        if (dados.estado === 'pronto') return { id, url: dados.urls[0], urls: dados.urls };
        if (dados.estado === 'falhou') throw new Error(dados.motivo || 'A geração falhou');
    }
    throw new Error('Demorou demais. A tarefa pode terminar depois: confira no painel do Kie.ai.');
}

async function gerar(tipo, params, longo) {
    const { onRequestId, ...resto } = params;
    const dados = await lerResposta(await fetch(`${BASE}/gerar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, params: resto }),
    }));
    onRequestId?.(dados.id);
    // Imagens: confere a cada 2 s por até 5 min. Vídeos: a cada 4 s por até 30 min.
    return acompanhar(dados.id, longo ? { tentativas: 450, intervalo: 4000 } : { tentativas: 150, intervalo: 2000 });
}

export const generateImage = (_apiKey, params) => gerar('imagem', params, false);
export const generateI2I = (_apiKey, params) => gerar('edicao', params, false);
export const generateVideo = (_apiKey, params) => gerar('video', params, true);
export const generateI2V = (_apiKey, params) => gerar('imagem-video', params, true);
export const processLipSync = (_apiKey, params) => gerar('lipsync', params, true);

// Envia um arquivo para o nosso servidor, que repassa ao Kie.ai e devolve o link.
export function uploadFile(_apiKey, file, onProgress) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${BASE}/upload`);
        if (onProgress) {
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
            };
        }
        xhr.onload = () => {
            let dados = null;
            try { dados = JSON.parse(xhr.responseText); } catch { /* sem JSON */ }
            if (xhr.status >= 200 && xhr.status < 300 && dados?.url) resolve(dados.url);
            else reject(new Error(dados?.erro || `Falha no envio (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error('Sem conexão durante o envio do arquivo'));
        xhr.send(formData);
    });
}
