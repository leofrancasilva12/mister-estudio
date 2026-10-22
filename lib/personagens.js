'use client';

// Personagens: fotos de referência guardadas neste aparelho (comprimidas).
// Na hora de gerar, as fotos são enviadas ao Kie.ai (o link vale 24 h; reaproveitamos por 20 h).

import { useCallback, useEffect, useState } from 'react';
import { enviarArquivo } from './api';

const CHAVE = 'mister-estudio:personagens:v1';
const VALIDADE_LINK = 20 * 3600 * 1000;
const novoId = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);

function ler() {
    try { const l = JSON.parse(localStorage.getItem(CHAVE) || '[]'); return Array.isArray(l) ? l : []; } catch { return []; }
}
function gravar(lista) {
    try { localStorage.setItem(CHAVE, JSON.stringify(lista)); return true; } catch { return false; }
}

// Reduz a foto para no máximo 900 px e JPEG, para caber no armazenamento do aparelho
export function comprimir(arquivo, lado = 900, qualidade = 0.86) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
            const c = document.createElement('canvas');
            c.width = Math.round(img.naturalWidth * escala);
            c.height = Math.round(img.naturalHeight * escala);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(img.src);
            resolve(c.toDataURL('image/jpeg', qualidade));
        };
        img.onerror = () => reject(new Error('Não consegui ler essa imagem.'));
        img.src = URL.createObjectURL(arquivo);
    });
}

const dataUrlParaArquivo = async (dataUrl, nome) => {
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], nome, { type: blob.type || 'image/jpeg' });
};

export function usePersonagens() {
    const [lista, setLista] = useState([]);
    useEffect(() => { setLista(ler()); }, []);
    const salvarLista = useCallback((nova) => { setLista(nova); return gravar(nova); }, []);

    const criar = async (nome, arquivos) => {
        const fotos = [];
        for (const f of Array.from(arquivos).slice(0, 4)) fotos.push(await comprimir(f));
        const p = { id: novoId(), nome: nome.trim() || 'Personagem', fotos, criadoEm: Date.now(), links: [] };
        const ok = salvarLista([p, ...ler()]);
        if (!ok) throw new Error('O armazenamento do aparelho está cheio. Apague um personagem antigo.');
        return p;
    };
    const apagar = (id) => salvarLista(ler().filter((p) => p.id !== id));
    const renomear = (id, nome) => salvarLista(ler().map((p) => (p.id === id ? { ...p, nome } : p)));
    const atualizar = (id, campos) => salvarLista(ler().map((p) => (p.id === id ? { ...p, ...campos } : p)));

    // Manda o personagem para o Studio (o conector do Claude), que guarda as fotos no servidor
    const enviarAoStudio = async (id, descricao) => {
        const p = ler().find((x) => x.id === id);
        if (!p) throw new Error('Personagem não encontrado.');
        const r = await fetch('/api/estudio/studio-personagem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: p.nome, descricao, fotos: p.fotos }),
        });
        const dados = await r.json().catch(() => ({}));
        if (r.status === 401) { window.location.href = `/login?volta=${encodeURIComponent(window.location.pathname)}`; return null; }
        if (!r.ok) throw new Error(dados.erro || 'Não consegui enviar para o Studio.');
        atualizar(id, { descricao, enviadoStudio: Date.now() });
        return dados;
    };

    // Links que o Kie.ai consegue ler (envia de novo quando os antigos vencem)
    const linksDe = async (id) => {
        const p = ler().find((x) => x.id === id);
        if (!p) throw new Error('Personagem não encontrado.');
        if (p.links?.length === p.fotos.length && Date.now() - (p.linksEm || 0) < VALIDADE_LINK) return p.links;
        const links = [];
        for (let i = 0; i < p.fotos.length; i++) links.push(await enviarArquivo(await dataUrlParaArquivo(p.fotos[i], `${p.nome}-${i + 1}.jpg`)));
        salvarLista(ler().map((x) => (x.id === id ? { ...x, links, linksEm: Date.now() } : x)));
        return links;
    };

    return { lista, criar, apagar, renomear, atualizar, enviarAoStudio, linksDe };
}
