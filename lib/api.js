// Conversa do navegador com o NOSSO servidor (/api/estudio/*). A chave do Kie.ai nunca passa por aqui.

const BASE = '/api/estudio';

async function ler(resposta) {
    let dados = null;
    try { dados = await resposta.json(); } catch { /* sem JSON */ }
    if (!resposta.ok || dados?.erro) {
        const erro = new Error(dados?.erro || `Falha no servidor (${resposta.status})`);
        erro.status = resposta.status;
        throw erro;
    }
    return dados;
}

export async function criarTarefa(tipo, params) {
    const r = await fetch(`${BASE}/gerar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, params }),
    });
    return (await ler(r)).id;
}

export async function consultarTarefa(id) {
    const r = await fetch(`${BASE}/tarefa?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
    return ler(r);
}

export async function lerCreditos() {
    const r = await fetch(`${BASE}/creditos`, { cache: 'no-store' });
    return (await ler(r)).creditos;
}

// Envia um arquivo e devolve o link que o Kie.ai consegue ler. onProgresso recebe 0 a 100.
export function enviarArquivo(arquivo, onProgresso) {
    return new Promise((resolve, reject) => {
        const form = new FormData();
        form.append('file', arquivo);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${BASE}/upload`);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgresso?.(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
            let dados = null;
            try { dados = JSON.parse(xhr.responseText); } catch { /* sem JSON */ }
            if (xhr.status >= 200 && xhr.status < 300 && dados?.url) resolve(dados.url);
            else reject(new Error(dados?.erro || `Falha no envio (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error('Sem conexão durante o envio'));
        xhr.send(form);
    });
}

// Baixa o arquivo; se o navegador bloquear, abre numa aba nova.
export async function baixar(url, nome) {
    try {
        const r = await fetch(url);
        if (!r.ok) throw new Error();
        const blob = await r.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = nome;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    } catch {
        window.open(url, '_blank', 'noopener');
    }
}
