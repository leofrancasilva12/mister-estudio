// Estimativa de créditos antes de gerar.
// 1) Tabela com os preços publicados pelo Kie.ai (conferidos em out/2026).
// 2) O que o app aprende: depois de cada geração, o Kie.ai informa o custo real,
//    e esse valor passa a valer para a mesma combinação de modelo e ajustes.

const CHAVE = 'mister-estudio:custos:v1';

const TABELA = {
    'nano-banana-2': (o) => ({ '1K': 8, '2K': 12, '4K': 18 })[o.res],
    'nano-banana-2-edit': (o) => ({ '1K': 8, '2K': 12, '4K': 18 })[o.res],
    'nano-banana-pro': (o) => ({ '1K': 18, '2K': 18, '4K': 24 })[o.res],
    'gpt-image-2': (o) => ({ '1K': 6, '2K': 10, '4K': 16 })[o.res],
    'v-kling-3': (o) => {
        const porSegundo = { std: o.audio ? 20 : 14, pro: o.audio ? 27 : 18, '4K': 67 }[o.res];
        return porSegundo && o.dur ? porSegundo * o.dur : undefined;
    },
    'v-veo-3-1': (o) => ({
        veo3_lite: { '720p': 30, '1080p': 35, '4k': 150 },
        veo3_fast: { '720p': 60, '1080p': 65, '4k': 180 },
        veo3: { '720p': 250, '1080p': 255, '4k': 370 },
    })[o.variante]?.[o.res],
    'v-seedance-2-5': (o) => {
        const porSegundo = { '480p': 28, '720p': 63, '1080p': 158 }[o.res];
        return porSegundo && o.dur ? porSegundo * o.dur : undefined;
    },
    'v-wan-3': (o) => {
        const porSegundo = { '480P': 8, '720P': 16, '1080P': 32 }[o.res];
        return porSegundo && o.dur ? porSegundo * o.dur : undefined;
    },
    'kling-avatar': (o) => (o.durAudio ? Math.ceil(o.durAudio) * 8 : undefined),
    'kling-avatar-pro': (o) => (o.durAudio ? Math.ceil(o.durAudio) * 16 : undefined),
    'voz-multilingual': (o) => (o.letras ? Math.max(0.1, (o.letras / 1000) * 12) : undefined),
    'topaz-imagem': (o) => ({ 2: 10, 4: 20 })[o.fator],
    // Ideogram V3 Edit: estimado; o valor real é aprendido após a 1ª geração
    'ideogram-v3-edit': (o) => ({ TURBO: 3.5, BALANCED: 7, QUALITY: 10 })[o.res],
};

// O que cada modelo cobra "por unidade", para explicar quando ainda não dá para calcular
const POR_UNIDADE = {
    'kling-avatar': '8 créditos por segundo de áudio',
    'kling-avatar-pro': '16 créditos por segundo de áudio',
};

function lerAprendidos() {
    try { return JSON.parse(localStorage.getItem(CHAVE) || '{}'); } catch { return {}; }
}

export function chaveCusto(modelo, o = {}) {
    return [modelo, o.modo, o.res, o.variante, o.dur, o.audio ? 'som' : '', o.fator].map((v) => v ?? '').join('|');
}

export function aprenderCusto(chave, creditos) {
    if (!chave || typeof creditos !== 'number' || !(creditos > 0)) return;
    try {
        const mapa = lerAprendidos();
        mapa[chave] = creditos;
        localStorage.setItem(CHAVE, JSON.stringify(mapa));
    } catch { /* sem armazenamento */ }
}

export const formatarCreditos = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

// Devolve { valor, texto, chave }. valor = null quando ainda não dá para saber.
export function estimarCusto(modelo, o = {}, quantidade = 1) {
    const chave = chaveCusto(modelo, o);
    const aprendido = typeof window !== 'undefined' ? lerAprendidos()[chave] : undefined;
    // Para voz e avatar o custo depende do tamanho do texto/áudio: a tabela calcula melhor que o aprendido
    const proporcional = ['voz-multilingual', 'kling-avatar', 'kling-avatar-pro'].includes(modelo);
    const base = proporcional ? (TABELA[modelo]?.(o) ?? aprendido) : (aprendido ?? TABELA[modelo]?.(o));
    if (typeof base !== 'number' || Number.isNaN(base)) {
        return { valor: null, texto: POR_UNIDADE[modelo] || 'custo aparece após a 1ª geração', chave };
    }
    const valor = Math.round(base * quantidade * 10) / 10;
    return { valor, texto: `${formatarCreditos(valor)} créditos`, chave };
}
