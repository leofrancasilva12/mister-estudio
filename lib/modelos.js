// O que aparece na tela: modelos, opções e rótulos.
// Cada modelo aponta para os ids do servidor (lib/kie/catalogo.js), que é quem fala com o Kie.ai.

const PROP_NANO = ['auto', '1:1', '4:5', '3:4', '2:3', '9:16', '16:9', '3:2', '4:3', '5:4', '21:9'];
const PROP_SEEDREAM = ['1:1', '3:4', '2:3', '9:16', '16:9', '3:2', '4:3', '21:9'];
const PROP_FLUX = ['1:1', '3:4', '2:3', '9:16', '16:9', '3:2', '4:3'];
const PROP_GPT2 = ['auto', '1:1', '4:5', '3:4', '2:3', '9:16', '16:9', '3:2', '4:3', '5:4', '21:9'];
const K = [['1K', '1K'], ['2K', '2K'], ['4K', '4K']];

// criar/editar = ids do servidor. editar: null = o modelo não edita com referências.
export const MODELOS_IMAGEM = [
    { id: 'nano-banana-pro', nome: 'Nano Banana Pro', marca: 'Google', selo: 'Edição precisa', criar: 'nano-banana-pro', editar: 'nano-banana-pro', maxRefs: 8, proporcoes: PROP_NANO, proporcaoPadrao: '1:1', qualidade: { campo: 'resolution', opcoes: K, padrao: '2K' } },
    { id: 'nano-banana-2', nome: 'Nano Banana 2', marca: 'Google', selo: 'Rápido', criar: 'nano-banana-2', editar: 'nano-banana-2-edit', maxRefs: 10, proporcoes: PROP_NANO, proporcaoPadrao: '1:1', qualidade: { campo: 'resolution', opcoes: K, padrao: '1K' } },
    { id: 'seedream-5-pro', nome: 'Seedream 5.0 Pro', marca: 'ByteDance', selo: 'Novo', criar: 'seedream-5-pro', editar: 'seedream-5-pro-edit', maxRefs: 10, proporcoes: PROP_SEEDREAM, proporcaoPadrao: '1:1', qualidade: { campo: 'quality', opcoes: [['basic', '1K'], ['high', '2K']], padrao: 'high' } },
    { id: 'gpt-image-2', nome: 'GPT Image 2', marca: 'OpenAI', selo: 'Texto na imagem', criar: 'gpt-image-2', editar: 'gpt-image-2', maxRefs: 16, proporcoes: PROP_GPT2, proporcaoPadrao: 'auto', qualidade: { campo: 'resolution', opcoes: K, padrao: '1K' } },
    { id: 'ideogram-v3', nome: 'Ideogram V3', marca: 'Ideogram', selo: 'Tipografia', criar: 'ideogram-v3', editar: null, maxRefs: 0, proporcoes: ['1:1', '3:4', '9:16', '4:3', '16:9'], proporcaoPadrao: '1:1', qualidade: { campo: 'resolution', opcoes: [['TURBO', 'Rápida'], ['BALANCED', 'Média'], ['QUALITY', 'Máxima']], padrao: 'BALANCED' } },
    { id: 'seedream-4.5', nome: 'Seedream 4.5', marca: 'ByteDance', selo: '4K', criar: 'seedream-4.5', editar: 'seedream-4.5-edit', maxRefs: 14, proporcoes: PROP_SEEDREAM, proporcaoPadrao: '1:1', qualidade: { campo: 'quality', opcoes: [['basic', '2K'], ['high', '4K']], padrao: 'basic' } },
    { id: 'flux-2-pro', nome: 'Flux 2 Pro', marca: 'Black Forest Labs', selo: 'Foto', criar: 'flux-2-pro', editar: 'flux-2-pro-edit', maxRefs: 8, proporcoes: PROP_FLUX, proporcaoPadrao: '1:1', qualidade: { campo: 'resolution', opcoes: [['1K', '1K'], ['2K', '2K']], padrao: '1K' } },
];

// modos: texto | quadros (quadro inicial e, se quadroFinal, final) | referencias (várias imagens)
export const MODELOS_VIDEO = [
    { id: 'v-kling-3', nome: 'Kling 3.0', marca: 'Kuaishou', selo: 'Realismo', modos: ['texto', 'quadros'], quadroFinal: true, maxRefs: 0, proporcoes: ['16:9', '9:16', '1:1'], proporcoesQuadros: [], duracoes: [5, 10, 15], resolucoes: [['std', '720p'], ['pro', '1080p'], ['4K', '4K']], resolucaoPadrao: 'std', audio: true, audioPadrao: false },
    { id: 'v-veo-3-1', nome: 'Veo 3.1', marca: 'Google', selo: 'Áudio nativo', modos: ['texto', 'quadros', 'referencias'], quadroFinal: true, maxRefs: 3, proporcoes: ['16:9', '9:16'], proporcoesQuadros: ['Auto', '16:9', '9:16'], duracoes: [4, 6, 8], duracaoPadrao: 8, resolucoes: [['720p', '720p'], ['1080p', '1080p'], ['4k', '4K']], resolucaoPadrao: '720p', audio: false, comAudioSempre: true, variantes: [['veo3_fast', 'Rápido'], ['veo3_lite', 'Leve'], ['veo3', 'Qualidade']] },
    { id: 'v-seedance-2-5', nome: 'Seedance 2.5', marca: 'ByteDance', selo: 'Até 30 s', modos: ['texto', 'quadros', 'referencias'], quadroFinal: true, maxRefs: 12, proporcoes: ['adaptive', '16:9', '9:16', '1:1', '4:3', '3:4', '21:9'], duracoes: [5, 10, 15, 20, 30], resolucoes: [['480p', '480p'], ['720p', '720p'], ['1080p', '1080p']], resolucaoPadrao: '720p', audio: true, audioPadrao: true },
    { id: 'v-seedance-2', nome: 'Seedance 2', marca: 'ByteDance', selo: 'Referências', modos: ['texto', 'quadros', 'referencias'], quadroFinal: true, maxRefs: 9, proporcoes: ['adaptive', '16:9', '9:16', '1:1', '4:3', '3:4', '21:9'], duracoes: [5, 8, 10, 15], resolucoes: [['480p', '480p'], ['720p', '720p'], ['1080p', '1080p']], resolucaoPadrao: '720p', audio: true, audioPadrao: true },
    { id: 'v-wan-3', nome: 'Wan 3.0', marca: 'Alibaba', selo: 'Novo', modos: ['texto', 'quadros', 'referencias'], quadroFinal: true, maxRefs: 10, proporcoes: ['adaptive', '16:9', '9:16', '1:1', '4:3', '3:4'], duracoes: [5, 10, 15, 30], resolucoes: [['480P', '480p'], ['720P', '720p'], ['1080P', '1080p']], resolucaoPadrao: '1080P', audio: true, audioPadrao: true },
    { id: 'v-hailuo-2-3', nome: 'Hailuo 2.3', marca: 'MiniMax', selo: 'Movimento', modos: ['quadros'], quadroFinal: false, maxRefs: 0, proporcoes: [], duracoes: [6, 10], resolucoes: [['768P', '768p'], ['1080P', '1080p']], resolucaoPadrao: '768P', audio: false },
];

// Vozes (ElevenLabs Multilingual v2: fala português)
export const VOZES = [
    ['FGY2WhTYpPnrIDTdsKH5', 'Laura', 'Feminina'],
    ['wJqPPQ618aTW29mptyoc', 'Ana Rita', 'Feminina'],
    ['hpp4J3VqNfWAUOO0d1Us', 'Bella', 'Feminina'],
    ['pPdl9cQBQq4p6mRkZy2Z', 'Emma', 'Feminina'],
    ['lcMyyd2HUfFzxdCaC4Ta', 'Lucy', 'Feminina'],
    ['TC0Zp7WVFzhA8zpTlRqV', 'Aria', 'Feminina'],
    ['TX3LPaxmHKxFdv7VOQHJ', 'Liam', 'Masculina'],
    ['nPczCjzI2devNBz1zQrb', 'Brian', 'Masculina'],
    ['N2lVS1w4EtoT3dr4eOWO', 'Callum', 'Masculina'],
    ['vBKc2FfBKJfcZNyEt1n6', 'Finn', 'Masculina'],
    ['LruHrtVF6PSyGItzMNHS', 'Benjamin', 'Masculina'],
    ['EkK5I93UQWFDigLMpZcX', 'James', 'Masculina'],
];

export const FERRAMENTAS = [
    { id: 'topaz-imagem', nome: 'Ampliar imagem', texto: 'Aumenta a resolução e recupera detalhes finos.', motor: 'Topaz', entrada: 'imagem', aceita: 'image/jpeg,image/png,image/webp', limite: 'Até 10 MB', fatores: true },
    { id: 'recraft-nitidez', nome: 'Ampliar com nitidez', texto: 'Bordas limpas para logos, textos e ilustrações.', motor: 'Recraft Crisp', entrada: 'imagem', aceita: 'image/jpeg,image/png,image/webp', limite: 'Até 10 MB' },
    { id: 'recraft-fundo', nome: 'Remover fundo', texto: 'Recorta o produto ou a pessoa, com fundo transparente.', motor: 'Recraft', entrada: 'imagem', aceita: 'image/jpeg,image/png,image/webp', limite: 'Até 5 MB · lado entre 256 e 4096 px' },
    { id: 'topaz-video', nome: 'Ampliar vídeo', texto: 'Leva o vídeo para uma resolução maior.', motor: 'Topaz Video', entrada: 'video', aceita: 'video/mp4,video/quicktime', limite: 'Até 50 MB', fatores: true },
];

export const MODELOS_LIPSYNC = [
    { id: 'kling-avatar', nome: 'Kling Avatar', detalhe: 'Expressões naturais · 720p · áudio até 5 min', fonte: 'foto', prompt: true },
    { id: 'infinitalk', nome: 'InfiniteTalk', detalhe: 'Rápido · 480p ou 720p · áudio até 10 MB', fonte: 'foto', prompt: true, resolucoes: ['480p', '720p'] },
    { id: 'lipsync-video', nome: 'Lip Sync de vídeo', detalhe: 'Troca a fala de um vídeo · uma pessoa de frente', fonte: 'video', prompt: false },
];

export const CAMERAS_VIDEO = [
    ['Parada', 'static camera, no camera movement'],
    ['Orbital', 'slow orbit camera movement around the subject'],
    ['Aproximar', 'slow dolly in towards the subject'],
    ['Afastar', 'slow dolly out away from the subject'],
    ['Panorâmica', 'smooth horizontal pan'],
    ['Grua', 'crane shot rising upward'],
];

// ---------- Cinema ----------
export const CINEMA = {
    cameras: [
        ['Digital modular 8K', 'modular 8K digital cinema camera'],
        ['Cinema full-frame', 'full-frame digital cinema camera'],
        ['Grande formato 70mm', 'grand format 70mm film camera'],
        ['Estúdio Super 35', 'Super 35 studio digital camera'],
        ['Filme 16mm clássico', 'classic 16mm film camera'],
        ['Grande formato premium', 'premium large-format digital cinema camera'],
    ],
    lentes: [
        ['Anamórfica clássica', 'classic anamorphic lens'],
        ['Anamórfica compacta', 'compact anamorphic lens'],
        ['Prime anos 70', '1970s cinema prime lens'],
        ['Prime moderna', 'premium modern prime lens'],
        ['Prime quente', 'warm-toned cinema prime lens'],
        ['Macro extrema', 'extreme macro lens'],
        ['Tilt criativa', 'creative tilt lens effect'],
        ['Bokeh em espiral', 'swirl bokeh portrait lens'],
        ['Difusão com halo', 'halation diffusion filter'],
        ['Prime nítida', 'ultra-sharp clinical prime lens'],
    ],
    focais: [
        ['8', 'ultra-wide perspective', 'perspectiva ultra-angular'],
        ['14', 'wide-angle perspective', 'grande-angular'],
        ['24', 'wide-angle dynamic perspective', 'grande-angular dinâmica'],
        ['35', 'natural cinematic perspective', 'perspectiva natural de cinema'],
        ['50', 'standard portrait perspective', 'perspectiva padrão de retrato'],
        ['85', 'classic portrait perspective', 'retrato clássico, fundo comprimido'],
    ],
    aberturas: [
        ['f/1.4', 'shallow depth of field, creamy bokeh', 'fundo bem desfocado'],
        ['f/4', 'balanced depth of field', 'profundidade equilibrada'],
        ['f/11', 'deep focus clarity, sharp foreground to background', 'tudo em foco, da frente ao fundo'],
    ],
    proporcoes: ['21:9', '16:9', '9:16', '1:1', '4:5'],
};

export function promptCinema(base, camera, lente, focal, abertura) {
    const c = CINEMA.cameras.find((x) => x[0] === camera)?.[1] || camera;
    const l = CINEMA.lentes.find((x) => x[0] === lente)?.[1] || lente;
    const f = CINEMA.focais.find((x) => x[0] === focal);
    const a = CINEMA.aberturas.find((x) => x[0] === abertura);
    return [
        base,
        `shot on a ${c}`,
        `using a ${l} at ${focal}mm${f ? ` (${f[1]})` : ''}`,
        `aperture ${abertura}`,
        a?.[1],
        'cinematic lighting, natural color science, high dynamic range, professional photography, ultra-detailed',
    ].filter(Boolean).join(', ');
}

// Rótulo curto de proporção para exibir
export const rotuloProporcao = (p) => ({ auto: 'Auto', Auto: 'Auto', adaptive: 'Auto' }[p] || p);

// Desenho da proporção (largura x altura do retângulo do ícone)
export function formaProporcao(p) {
    if (!p || !p.includes(':')) return [12, 12];
    const [w, h] = p.split(':').map(Number);
    const escala = 14 / Math.max(w, h);
    return [Math.max(5, Math.round(w * escala)), Math.max(5, Math.round(h * escala))];
}

// aspect-ratio CSS a partir de "4:5"
export const razaoCss = (p) => (p && p.includes(':') ? p.replace(':', ' / ') : '1 / 1');
