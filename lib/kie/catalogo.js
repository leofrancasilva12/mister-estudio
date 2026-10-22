// Tradutor: pega o pedido da tela (id do modelo + opções) e monta o pedido exato do Kie.ai.
// Roda SÓ no servidor. Se um id não estiver aqui, o pedido é recusado.

export class PedidoInvalido extends Error {}

const texto = (v, { obrigatorio = false, max = 5000, padrao } = {}) => {
    const t = typeof v === 'string' ? v.trim() : '';
    if (!t) {
        if (padrao) return padrao;
        if (obrigatorio) throw new PedidoInvalido('Escreva um prompt antes de gerar.');
        return undefined;
    }
    if (t.length > max) throw new PedidoInvalido(`O prompt passou de ${max} caracteres.`);
    return t;
};

// Só aceita valores da lista; se vier outra coisa, usa o padrão
const escolher = (valor, lista, padrao = lista[0]) => (lista.includes(valor) ? valor : padrao);

const link = (v, nome) => {
    if (typeof v !== 'string' || !/^https:\/\//.test(v)) throw new PedidoInvalido(`Envie ${nome} antes de gerar.`);
    return v;
};

const links = (lista, nome, max) => {
    const l = (Array.isArray(lista) ? lista : []).filter((u) => typeof u === 'string' && /^https:\/\//.test(u));
    if (!l.length) throw new PedidoInvalido(`Envie ${nome} antes de gerar.`);
    return l.slice(0, max);
};

const comAudio = (modo, padrao) => (modo ? modo === 'Com áudio' : padrao);

const PROPORCOES_NANO = ['auto', '1:1', '2:3', '3:2', '1:4', '4:1', '3:4', '4:3', '4:5', '5:4', '1:8', '8:1', '9:16', '16:9', '21:9'];
const PROPORCOES_SEEDREAM = ['1:1', '4:3', '3:4', '16:9', '9:16', '2:3', '3:2', '21:9'];
const PROPORCOES_FLUX = ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3'];
const PROPORCOES_GPT = ['1:1', '2:3', '3:2'];
const PROPORCOES_SEEDANCE = ['1:1', '4:3', '3:4', '16:9', '9:16', '21:9', 'adaptive'];

export const CATALOGO = {
    // ---------- Texto para imagem ----------
    'nano-banana-2': {
        tipo: 'imagem',
        montar: (p) => ({
            model: 'nano-banana-2',
            input: {
                prompt: texto(p.prompt, { obrigatorio: true, max: 20000 }),
                aspect_ratio: escolher(p.aspect_ratio, PROPORCOES_NANO, 'auto'),
                resolution: escolher(p.resolution, ['1K', '2K', '4K']),
                output_format: 'png',
            },
        }),
    },
    'seedream-4.5': {
        tipo: 'imagem',
        montar: (p) => ({
            model: 'seedream/4.5-text-to-image',
            input: {
                prompt: texto(p.prompt, { obrigatorio: true }),
                aspect_ratio: escolher(p.aspect_ratio, PROPORCOES_SEEDREAM),
                quality: escolher(p.quality, ['basic', 'high']),
            },
        }),
    },
    'flux-2-pro': {
        tipo: 'imagem',
        montar: (p) => ({
            model: 'flux-2/pro-text-to-image',
            input: {
                prompt: texto(p.prompt, { obrigatorio: true }),
                aspect_ratio: escolher(p.aspect_ratio, PROPORCOES_FLUX),
                resolution: escolher(p.resolution, ['1K', '2K']),
            },
        }),
    },
    'gpt-image-1.5': {
        tipo: 'imagem',
        montar: (p) => ({
            model: 'gpt-image/1.5-text-to-image',
            input: {
                prompt: texto(p.prompt, { obrigatorio: true }),
                aspect_ratio: escolher(p.aspect_ratio, PROPORCOES_GPT),
                quality: escolher(p.quality, ['medium', 'high']),
            },
        }),
    },

    // ---------- Edição (imagem para imagem) ----------
    'nano-banana-2-edit': {
        tipo: 'edicao',
        montar: (p) => ({
            model: 'nano-banana-2',
            input: {
                prompt: texto(p.prompt, { obrigatorio: true, max: 20000 }),
                image_input: links(p.images_list, 'uma imagem', 10),
                aspect_ratio: escolher(p.aspect_ratio, PROPORCOES_NANO, 'auto'),
                resolution: escolher(p.resolution, ['1K', '2K', '4K']),
                output_format: 'png',
            },
        }),
    },
    'seedream-4.5-edit': {
        tipo: 'edicao',
        montar: (p) => ({
            model: 'seedream/4.5-edit',
            input: {
                prompt: texto(p.prompt, { obrigatorio: true }),
                image_urls: links(p.images_list, 'uma imagem', 14),
                aspect_ratio: escolher(p.aspect_ratio, PROPORCOES_SEEDREAM),
                quality: escolher(p.quality, ['basic', 'high']),
            },
        }),
    },
    'flux-2-pro-edit': {
        tipo: 'edicao',
        montar: (p) => ({
            model: 'flux-2/pro-image-to-image',
            input: {
                prompt: texto(p.prompt, { obrigatorio: true }),
                input_urls: links(p.images_list, 'uma imagem', 8),
                aspect_ratio: escolher(p.aspect_ratio, ['auto', ...PROPORCOES_FLUX], 'auto'),
                resolution: escolher(p.resolution, ['1K', '2K']),
            },
        }),
    },
    'gpt-image-1.5-edit': {
        tipo: 'edicao',
        montar: (p) => ({
            model: 'gpt-image/1.5-image-to-image',
            input: {
                prompt: texto(p.prompt, { obrigatorio: true }),
                input_urls: links(p.images_list, 'uma imagem', 16),
                aspect_ratio: escolher(p.aspect_ratio, PROPORCOES_GPT),
                quality: escolher(p.quality, ['medium', 'high']),
            },
        }),
    },

    // ---------- Texto para vídeo ----------
    'seedance-2': {
        tipo: 'video',
        montar: (p) => ({
            model: 'bytedance/seedance-2',
            input: {
                prompt: texto(p.prompt, { obrigatorio: true, max: 20000 }),
                aspect_ratio: escolher(p.aspect_ratio, PROPORCOES_SEEDANCE, '16:9'),
                resolution: escolher(p.resolution, ['720p', '480p', '1080p']),
                duration: escolher(Number(p.duration), [5, 8, 10, 15]),
                generate_audio: comAudio(p.mode, true),
            },
        }),
    },
    'kling-2.6': {
        tipo: 'video',
        montar: (p) => ({
            model: 'kling-2.6/text-to-video',
            input: {
                prompt: texto(p.prompt, { obrigatorio: true, max: 2500 }),
                aspect_ratio: escolher(p.aspect_ratio, ['16:9', '9:16', '1:1']),
                duration: escolher(String(p.duration), ['5', '10']),
                sound: comAudio(p.mode, false),
            },
        }),
    },

    // ---------- Imagem para vídeo ----------
    'seedance-2-i2v': {
        tipo: 'imagem-video',
        montar: (p) => ({
            model: 'bytedance/seedance-2',
            input: {
                prompt: texto(p.prompt, { padrao: 'Movimento natural e cinematográfico', max: 20000 }),
                first_frame_url: link(p.image_url, 'a imagem inicial'),
                aspect_ratio: escolher(p.aspect_ratio, PROPORCOES_SEEDANCE, 'adaptive'),
                resolution: escolher(p.resolution, ['720p', '480p', '1080p']),
                duration: escolher(Number(p.duration), [5, 8, 10, 15]),
                generate_audio: comAudio(p.mode, true),
            },
        }),
    },
    'kling-2.6-i2v': {
        tipo: 'imagem-video',
        montar: (p) => ({
            model: 'kling-2.6/image-to-video',
            input: {
                prompt: texto(p.prompt, { padrao: 'Movimento natural e cinematográfico', max: 2500 }),
                image_urls: [link(p.image_url, 'a imagem inicial')],
                duration: escolher(String(p.duration), ['5', '10']),
                sound: comAudio(p.mode, false),
            },
        }),
    },
    'hailuo-2.3': {
        tipo: 'imagem-video',
        montar: (p) => {
            const resolution = escolher(p.resolution, ['768P', '1080P']);
            const duration = escolher(String(p.duration), ['6', '10']);
            if (resolution === '1080P' && duration === '10') {
                throw new PedidoInvalido('O Hailuo não faz 10 segundos em 1080P. Escolha 6 s ou 768P.');
            }
            return {
                model: 'hailuo/2-3-image-to-video-standard',
                input: {
                    prompt: texto(p.prompt, { padrao: 'Movimento natural e cinematográfico' }),
                    image_url: link(p.image_url, 'a imagem inicial'),
                    duration,
                    resolution,
                },
            };
        },
    },

    // ---------- Lip sync ----------
    infinitalk: {
        tipo: 'lipsync',
        montar: (p) => ({
            model: 'infinitalk/from-audio',
            input: {
                image_url: link(p.image_url, 'o retrato'),
                audio_url: link(p.audio_url, 'o áudio'),
                prompt: texto(p.prompt, { padrao: 'Uma pessoa falando naturalmente para a câmera' }),
                resolution: escolher(p.resolution, ['480p', '720p']),
            },
        }),
    },
    'kling-avatar': {
        tipo: 'lipsync',
        montar: (p) => ({
            model: 'kling/ai-avatar-standard',
            input: {
                image_url: link(p.image_url, 'o retrato'),
                audio_url: link(p.audio_url, 'o áudio'),
                prompt: texto(p.prompt, { padrao: 'Uma pessoa falando de forma calorosa para a câmera, com leves acenos' }),
            },
        }),
    },
    'lipsync-video': {
        tipo: 'lipsync',
        montar: (p) => ({
            model: 'volcengine/video-to-video-lip-sync',
            input: {
                mode: 'lite',
                video_url: link(p.video_url, 'o vídeo'),
                audio_url: link(p.audio_url, 'o áudio'),
                align_audio: true,
            },
        }),
    },
};

export function montarPedido(tipo, params = {}) {
    const item = CATALOGO[params.model];
    if (!item) throw new PedidoInvalido('Modelo desconhecido.');
    if (item.tipo !== tipo) throw new PedidoInvalido('Esse modelo não serve para este tipo de geração.');
    return item.montar(params);
}
