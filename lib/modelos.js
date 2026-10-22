// O que aparece na tela: modelos, opções e rótulos.
// Cada modelo aponta para os ids do servidor (lib/kie/catalogo.js), que é quem fala com o Kie.ai.

const PROP_NANO = ['auto', '1:1', '4:5', '3:4', '2:3', '9:16', '16:9', '3:2', '4:3', '5:4', '21:9'];
const PROP_SEEDREAM = ['1:1', '3:4', '2:3', '9:16', '16:9', '3:2', '4:3', '21:9'];
const PROP_FLUX = ['1:1', '3:4', '2:3', '9:16', '16:9', '3:2', '4:3'];
const PROP_GPT = ['1:1', '2:3', '3:2'];

export const MODELOS_IMAGEM = [
    {
        id: 'nano-banana-2',
        nome: 'Nano Banana 2',
        marca: 'Google',
        selo: 'Edição',
        criar: 'nano-banana-2',
        editar: 'nano-banana-2-edit',
        maxRefs: 10,
        proporcoes: PROP_NANO,
        proporcaoPadrao: '1:1',
        qualidade: { campo: 'resolution', opcoes: [['1K', '1K'], ['2K', '2K'], ['4K', '4K']], padrao: '1K' },
    },
    {
        id: 'seedream-4.5',
        nome: 'Seedream 4.5',
        marca: 'ByteDance',
        selo: '4K',
        criar: 'seedream-4.5',
        editar: 'seedream-4.5-edit',
        maxRefs: 14,
        proporcoes: PROP_SEEDREAM,
        proporcaoPadrao: '1:1',
        qualidade: { campo: 'quality', opcoes: [['basic', '2K'], ['high', '4K']], padrao: 'basic' },
    },
    {
        id: 'flux-2-pro',
        nome: 'Flux 2 Pro',
        marca: 'Black Forest Labs',
        selo: 'Foto',
        criar: 'flux-2-pro',
        editar: 'flux-2-pro-edit',
        maxRefs: 8,
        proporcoes: PROP_FLUX,
        proporcaoPadrao: '1:1',
        qualidade: { campo: 'resolution', opcoes: [['1K', '1K'], ['2K', '2K']], padrao: '1K' },
    },
    {
        id: 'gpt-image-1.5',
        nome: 'GPT Image 1.5',
        marca: 'OpenAI',
        selo: 'Texto',
        criar: 'gpt-image-1.5',
        editar: 'gpt-image-1.5-edit',
        maxRefs: 16,
        proporcoes: PROP_GPT,
        proporcaoPadrao: '1:1',
        qualidade: { campo: 'quality', opcoes: [['medium', 'Média'], ['high', 'Alta']], padrao: 'medium' },
    },
];

export const MODELOS_VIDEO = [
    {
        id: 'seedance-2',
        nome: 'Seedance 2',
        marca: 'ByteDance',
        selo: 'Com áudio',
        texto: 'seedance-2',
        imagem: 'seedance-2-i2v',
        proporcoes: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
        proporcoesImagem: ['adaptive', '16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
        duracoes: [5, 8, 10, 15],
        resolucoes: ['480p', '720p', '1080p'],
        resolucaoPadrao: '720p',
        audio: true,
        audioPadrao: true,
    },
    {
        id: 'kling-2.6',
        nome: 'Kling 2.6',
        marca: 'Kuaishou',
        selo: 'Realismo',
        texto: 'kling-2.6',
        imagem: 'kling-2.6-i2v',
        proporcoes: ['16:9', '9:16', '1:1'],
        proporcoesImagem: [],
        duracoes: [5, 10],
        resolucoes: [],
        audio: true,
        audioPadrao: false,
    },
    {
        id: 'hailuo-2.3',
        nome: 'Hailuo 2.3',
        marca: 'MiniMax',
        selo: 'Movimento',
        texto: null,
        imagem: 'hailuo-2.3',
        proporcoes: [],
        proporcoesImagem: [],
        duracoes: [6, 10],
        resolucoes: ['768P', '1080P'],
        resolucaoPadrao: '768P',
        audio: false,
    },
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
export const rotuloProporcao = (p) => ({ auto: 'Auto', adaptive: 'Auto' }[p] || p);

// Desenho da proporção (largura x altura do retângulo do ícone)
export function formaProporcao(p) {
    if (p === 'auto' || p === 'adaptive') return [12, 12];
    const [w, h] = p.split(':').map(Number);
    const escala = 14 / Math.max(w, h);
    return [Math.max(5, Math.round(w * escala)), Math.max(5, Math.round(h * escala))];
}

// aspect-ratio CSS a partir de "4:5"
export const razaoCss = (p) => (p && p.includes(':') ? p.replace(':', ' / ') : '1 / 1');
