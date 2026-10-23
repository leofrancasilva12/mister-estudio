// Catálogo de modelos do Kie.ai: monta o pedido de cada modelo com validação.
// (Veio do site do Estúdio, que foi aposentado; agora a fonte é este arquivo.)
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

// ================= Fase B: modelos novos =================

const PROP_NB_PRO = ['auto', '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
const PROP_GPT2 = ['auto', '1:1', '3:2', '2:3', '4:3', '3:4', '5:4', '4:5', '16:9', '9:16', '21:9'];
const TAMANHO_IDEOGRAM = { '1:1': 'square_hd', '3:4': 'portrait_4_3', '9:16': 'portrait_16_9', '4:3': 'landscape_4_3', '16:9': 'landscape_16_9' };

// Vozes liberadas (ElevenLabs Multilingual v2)
export const VOZES = {
    FGY2WhTYpPnrIDTdsKH5: 'Laura', hpp4J3VqNfWAUOO0d1Us: 'Bella', lcMyyd2HUfFzxdCaC4Ta: 'Lucy', TC0Zp7WVFzhA8zpTlRqV: 'Aria',
    pPdl9cQBQq4p6mRkZy2Z: 'Emma', wJqPPQ618aTW29mptyoc: 'Ana Rita', TX3LPaxmHKxFdv7VOQHJ: 'Liam', nPczCjzI2devNBz1zQrb: 'Brian',
    N2lVS1w4EtoT3dr4eOWO: 'Callum', vBKc2FfBKJfcZNyEt1n6: 'Finn', LruHrtVF6PSyGItzMNHS: 'Benjamin', EkK5I93UQWFDigLMpZcX: 'James',
};

const numero = (v, min, max, padrao) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao;
};

const refsOpcionais = (lista, max) => (Array.isArray(lista) ? lista : []).filter((u) => typeof u === 'string' && /^https:\/\//.test(u)).slice(0, max);

// Monta as partes de quadros/referências comuns aos vídeos novos
function midiaVideo(p, { maxRefs }) {
    const modo = p.modo || (p.image_url ? 'quadros' : 'texto');
    if (modo === 'quadros') {
        const r = { first_frame_url: link(p.image_url, 'o quadro inicial') };
        if (p.last_image_url) r.last_frame_url = link(p.last_image_url, 'o quadro final');
        return r;
    }
    if (modo === 'referencias') {
        if (!maxRefs) throw new PedidoInvalido('Esse modelo não aceita imagens de referência.');
        return { reference_image_urls: links(p.refs, 'as imagens de referência', maxRefs) };
    }
    return {};
}

Object.assign(CATALOGO, {
    // ---------- Imagem ----------
    'nano-banana-pro': {
        tipo: ['imagem', 'edicao'],
        montar: (p) => ({
            model: 'nano-banana-pro',
            input: {
                prompt: texto(p.prompt, { obrigatorio: true, max: 20000 }),
                image_input: refsOpcionais(p.images_list, 8),
                aspect_ratio: escolher(p.aspect_ratio, PROP_NB_PRO, '1:1'),
                resolution: escolher(p.resolution, ['1K', '2K', '4K']),
                output_format: 'png',
            },
        }),
    },
    'seedream-5-pro': {
        tipo: 'imagem',
        montar: (p) => ({
            model: 'seedream/5-pro-text-to-image',
            input: {
                prompt: texto(p.prompt, { obrigatorio: true }),
                aspect_ratio: escolher(p.aspect_ratio, PROPORCOES_SEEDREAM),
                quality: escolher(p.quality, ['basic', 'high']),
            },
        }),
    },
    'seedream-5-pro-edit': {
        tipo: 'edicao',
        montar: (p) => ({
            model: 'seedream/5-pro-image-to-image',
            input: {
                prompt: texto(p.prompt, { obrigatorio: true }),
                image_urls: links(p.images_list, 'uma imagem', 10),
                aspect_ratio: escolher(p.aspect_ratio, PROPORCOES_SEEDREAM),
                quality: escolher(p.quality, ['basic', 'high']),
            },
        }),
    },
    'gpt-image-2': {
        tipo: ['imagem', 'edicao'],
        montar: (p) => {
            const resolution = escolher(p.resolution, ['1K', '2K', '4K']);
            const aspect_ratio = escolher(p.aspect_ratio, PROP_GPT2, 'auto');
            if (resolution === '2K' && ['5:4', '4:5'].includes(aspect_ratio)) throw new PedidoInvalido('O GPT Image 2 não faz 4:5 ou 5:4 em 2K. Use 1K ou 4K.');
            const refs = refsOpcionais(p.images_list, 16);
            const input = { prompt: texto(p.prompt, { obrigatorio: true, max: 20000 }), aspect_ratio, resolution };
            if (refs.length) input.input_urls = refs;
            return { model: refs.length ? 'gpt-image-2-image-to-image' : 'gpt-image-2-text-to-image', input };
        },
    },
    'ideogram-v3': {
        tipo: 'imagem',
        montar: (p) => ({
            model: 'ideogram/v3-text-to-image',
            input: {
                prompt: texto(p.prompt, { obrigatorio: true }),
                image_size: TAMANHO_IDEOGRAM[p.aspect_ratio] || 'square_hd',
                rendering_speed: escolher(p.resolution, ['BALANCED', 'TURBO', 'QUALITY']),
                style: 'AUTO',
                expand_prompt: true,
            },
        }),
    },

    // ---------- Vídeo (modos: texto, quadros, referencias) ----------
    'v-kling-3': {
        tipo: 'video',
        montar: (p) => {
            const modo = p.modo || 'texto';
            if (modo === 'referencias') throw new PedidoInvalido('O Kling 3.0 usa quadro inicial e final, não referências.');
            const input = {
                prompt: texto(p.prompt, { obrigatorio: modo === 'texto', padrao: modo === 'quadros' ? 'Movimento natural e cinematográfico' : undefined, max: 2500 }),
                sound: !!p.audio,
                duration: String(numero(p.duration, 3, 15, 5)),
                mode: escolher(p.resolution, ['std', 'pro', '4K']),
                multi_shots: false,
            };
            if (modo === 'quadros') {
                input.image_urls = [link(p.image_url, 'o quadro inicial')];
                if (p.last_image_url) input.image_urls.push(link(p.last_image_url, 'o quadro final'));
            } else {
                input.aspect_ratio = escolher(p.aspect_ratio, ['16:9', '9:16', '1:1']);
            }
            return { model: 'kling-3.0/video', input };
        },
    },
    'v-veo-3-1': {
        tipo: 'video',
        montar: (p) => {
            const modo = p.modo || 'texto';
            const variante = escolher(p.variante, ['veo3_fast', 'veo3_lite', 'veo3']);
            const input = {
                prompt: texto(p.prompt, { obrigatorio: true, max: 5000 }),
                model: variante,
                aspect_ratio: escolher(p.aspect_ratio, ['16:9', '9:16', 'Auto']),
                resolution: escolher(p.resolution, ['720p', '1080p', '4k']),
                duration: escolher(Number(p.duration), [4, 6, 8], 8),
                enable_translation: true,
            };
            if (modo === 'quadros') {
                input.generation_type = 'FIRST_AND_LAST_FRAMES_2_VIDEO';
                input.image_urls = [link(p.image_url, 'o quadro inicial')];
                if (p.last_image_url) input.image_urls.push(link(p.last_image_url, 'o quadro final'));
            } else if (modo === 'referencias') {
                if (variante === 'veo3') throw new PedidoInvalido('Referências no Veo só funcionam na versão Rápida ou Leve.');
                input.generation_type = 'REFERENCE_2_VIDEO';
                input.image_urls = links(p.refs, 'as imagens de referência', 3);
                input.duration = 8;
                if (input.aspect_ratio === 'Auto') input.aspect_ratio = '16:9';
            } else {
                input.generation_type = 'TEXT_2_VIDEO';
            }
            return { model: 'veo-3-1', input };
        },
    },
    'v-seedance-2-5': {
        tipo: 'video',
        montar: (p) => ({
            model: 'bytedance/seedance-2-5',
            input: {
                prompt: texto(p.prompt, { obrigatorio: (p.modo || 'texto') === 'texto', padrao: (p.modo || 'texto') !== 'texto' ? 'Movimento natural e cinematográfico' : undefined, max: 20000 }),
                ...midiaVideo(p, { maxRefs: 30 }),
                aspect_ratio: escolher(p.aspect_ratio, PROPORCOES_SEEDANCE, 'adaptive'),
                resolution: escolher(p.resolution, ['720p', '480p', '1080p']),
                duration: numero(p.duration, 4, 30, 5),
                generate_audio: !!p.audio,
            },
        }),
    },
    'v-seedance-2': {
        tipo: 'video',
        montar: (p) => ({
            model: 'bytedance/seedance-2',
            input: {
                prompt: texto(p.prompt, { obrigatorio: (p.modo || 'texto') === 'texto', padrao: (p.modo || 'texto') !== 'texto' ? 'Movimento natural e cinematográfico' : undefined, max: 20000 }),
                ...midiaVideo(p, { maxRefs: 9 }),
                aspect_ratio: escolher(p.aspect_ratio, PROPORCOES_SEEDANCE, 'adaptive'),
                resolution: escolher(p.resolution, ['720p', '480p', '1080p']),
                duration: numero(p.duration, 4, 15, 5),
                generate_audio: !!p.audio,
            },
        }),
    },
    'v-wan-3': {
        tipo: 'video',
        montar: (p) => ({
            model: 'wan/3-0-video',
            input: {
                prompt: texto(p.prompt, { obrigatorio: (p.modo || 'texto') === 'texto', padrao: (p.modo || 'texto') !== 'texto' ? 'Movimento natural e cinematográfico' : undefined, max: 20000 }),
                ...midiaVideo(p, { maxRefs: 10 }),
                aspect_ratio: escolher(p.aspect_ratio, ['adaptive', '16:9', '4:3', '1:1', '3:4', '9:16']),
                resolution: escolher(p.resolution, ['1080P', '720P', '480P']),
                duration: numero(p.duration, 2, 30, 5),
                audio: !!p.audio,
            },
        }),
    },
    'v-hailuo-2-3': {
        tipo: 'video',
        montar: (p) => CATALOGO['hailuo-2.3'].montar(p),
    },

    // ---------- Áudio ----------
    'voz-multilingual': {
        tipo: 'audio',
        montar: (p) => {
            const t = typeof p.text === 'string' ? p.text.trim() : '';
            if (!t) throw new PedidoInvalido('Escreva o texto da fala.');
            if (t.length > 5000) throw new PedidoInvalido('O texto passou de 5000 caracteres.');
            if (!VOZES[p.voice]) throw new PedidoInvalido('Escolha uma das vozes da lista.');
            return {
                model: 'elevenlabs/text-to-speech-multilingual-v2',
                input: {
                    text: t,
                    voice: p.voice,
                    stability: numero(p.stability, 0, 1, 0.5),
                    similarity_boost: 0.75,
                    style: numero(p.style, 0, 1, 0),
                    speed: numero(p.speed, 0.7, 1.2, 1),
                },
            };
        },
    },

    // ---------- Ferramentas ----------
    'topaz-imagem': {
        tipo: 'ferramenta',
        montar: (p) => ({ model: 'topaz/image-upscale', input: { image_url: link(p.image_url, 'a imagem'), upscale_factor: escolher(String(p.fator), ['2', '4']) } }),
    },
    'recraft-nitidez': {
        tipo: 'ferramenta',
        montar: (p) => ({ model: 'recraft/crisp-upscale', input: { image: link(p.image_url, 'a imagem') } }),
    },
    'recraft-fundo': {
        tipo: 'ferramenta',
        montar: (p) => ({ model: 'recraft/remove-background', input: { image: link(p.image_url, 'a imagem') } }),
    },
    'topaz-video': {
        tipo: 'ferramenta',
        montar: (p) => ({ model: 'topaz/video-upscale', input: { video_url: link(p.video_url, 'o vídeo'), upscale_factor: escolher(String(p.fator), ['2', '4']) } }),
    },
});

// ================= Itens 2 e 3: avatares, diálogo, edição com máscara e apps de vídeo =================
Object.assign(CATALOGO, {
    'kling-avatar-pro': {
        tipo: 'lipsync',
        montar: (p) => ({
            model: 'kling/ai-avatar-pro',
            input: {
                image_url: link(p.image_url, 'o retrato'),
                audio_url: link(p.audio_url, 'o áudio'),
                prompt: texto(p.prompt, { padrao: 'Uma pessoa falando de forma natural e expressiva para a câmera' }),
            },
        }),
    },
    'omnihuman-1-5': {
        tipo: 'lipsync',
        montar: (p) => {
            const input = {
                image_url: link(p.image_url, 'o retrato'),
                audio_url: link(p.audio_url, 'o áudio'),
                output_resolution: escolher(String(p.resolution || '').replace('p', ''), ['720', '1080'], '1080'),
            };
            const t = texto(p.prompt, { max: 300 });
            if (t) input.prompt = t;
            return { model: 'omnihuman-1-5', input };
        },
    },
    // Alternativa usada automaticamente quando o Multilingual v2 falha no Kie.ai
    'voz-turbo': {
        tipo: 'audio',
        montar: (p) => ({ ...CATALOGO['voz-multilingual'].montar(p), model: 'elevenlabs/text-to-speech-turbo-2-5' }),
    },
    'dialogo-v3': {
        tipo: 'audio',
        montar: (p) => {
            const falas = (Array.isArray(p.dialogue) ? p.dialogue : [])
                .map((f) => ({ text: String(f?.text || '').trim(), voice: f?.voice }))
                .filter((f) => f.text);
            if (!falas.length) throw new PedidoInvalido('Escreva pelo menos uma fala.');
            if (falas.some((f) => !VOZES[f.voice])) throw new PedidoInvalido('Escolha uma voz da lista para cada fala.');
            if (falas.reduce((n, f) => n + f.text.length, 0) > 5000) throw new PedidoInvalido('O diálogo passou de 5000 caracteres.');
            return { model: 'elevenlabs/text-to-dialogue-v3', input: { dialogue: falas, stability: escolher(Number(p.stability), [0, 0.5, 1], 0.5), language_code: 'pt' } };
        },
    },
    'ideogram-v3-edit': {
        tipo: 'edicao',
        montar: (p) => ({
            model: 'ideogram/v3-edit',
            input: {
                prompt: texto(p.prompt, { obrigatorio: true }),
                image_url: link(p.image_url, 'a imagem'),
                mask_url: link(p.mask_url, 'a máscara (pinte a área a mudar)'),
                rendering_speed: escolher(p.resolution, ['BALANCED', 'TURBO', 'QUALITY']),
                expand_prompt: true,
            },
        }),
    },
    'wan-animate-replace': {
        tipo: 'video',
        montar: (p) => ({
            model: 'wan/2-2-animate-replace',
            input: { video_url: link(p.video_url, 'o vídeo'), image_url: link(p.image_url, 'a foto da pessoa'), resolution: escolher(p.resolution, ['480p', '580p', '720p']) },
        }),
    },
    'wan-animate-move': {
        tipo: 'video',
        montar: (p) => ({
            model: 'wan/2-2-animate-move',
            input: { video_url: link(p.video_url, 'o vídeo com o movimento'), image_url: link(p.image_url, 'a foto'), resolution: escolher(p.resolution, ['480p', '580p', '720p']) },
        }),
    },
    'pixverse-extend': {
        tipo: 'video',
        montar: (p) => ({
            model: 'pixverse-v6/extend',
            input: {
                video_url: link(p.video_url, 'o vídeo'),
                prompt: texto(p.prompt, { padrao: 'Continue the scene naturally with smooth motion', max: 5000 }),
                duration: numero(p.duration, 1, 15, 5),
                quality: escolher(p.resolution, ['720p', '540p', '1080p', '360p']),
                seed: Math.floor(Math.random() * 2147483647),
                generate_audio_switch: !!p.audio,
            },
        }),
    },
});

// ================= Vídeo: modelos mais novos (out/2026) =================
// Nomes e limites conferidos na documentação do Kie.ai (docs.kie.ai).
const idsOpcionais = (lista, max) => (Array.isArray(lista) ? lista : []).filter((x) => typeof x === 'string' && x.trim()).slice(0, max);
const PADRAO_MOVIMENTO = 'Movimento natural e cinematográfico';

Object.assign(CATALOGO, {
    // Gemini Omni 1.1 Flash (Google): aceita texto, imagens, áudio, personagens e até 1 vídeo (para editar).
    // Cotas do Kie.ai: imagens (1 cada) + vídeo (2) + personagens (1 cada) <= 7.
    'v-gemini-omni-1-1': {
        tipo: 'video',
        montar: (p) => {
            const modo = p.modo || (p.image_url ? 'quadros' : 'texto');
            const input = {
                prompt: texto(p.prompt, { obrigatorio: modo === 'texto', padrao: modo === 'texto' ? undefined : PADRAO_MOVIMENTO, max: 20000 }),
                duration: escolher(String(p.duration), ['6', '4', '8', '10']),
                resolution: escolher(p.resolution, ['720p', '360p', '1080p', '4k']),
            };
            if (modo === 'quadros') {
                // Quadro inicial (e final, se quiser): não pode misturar com referências, áudio, vídeo ou personagens
                input.first_frame_url = link(p.image_url, 'o quadro inicial');
                if (p.last_image_url) input.last_frame_url = link(p.last_image_url, 'o quadro final');
                return { model: 'google/gemini-omni-flash-1-1', input };
            }
            const imagens = modo === 'referencias' ? links(p.refs, 'as imagens de referência', 7) : [];
            const personagens = idsOpcionais(p.character_ids, 3);
            const audios = idsOpcionais(p.audio_ids, 3);
            let video;
            if (p.video_url) {
                const start = numero(p.video_inicio, 0, 30, 0);
                const ends = numero(p.video_fim, 0, 30, start + 10);
                if (ends <= start) throw new PedidoInvalido('O fim do trecho do vídeo precisa ser depois do início.');
                if (ends - start > 10) throw new PedidoInvalido('O trecho do vídeo pode ter no máximo 10 segundos.');
                video = [{ url: link(p.video_url, 'o vídeo'), start, ends }];
            }
            const cota = imagens.length + (video ? 2 : 0) + personagens.length;
            if (cota > 7) throw new PedidoInvalido(`O Omni aceita até 7 de cota (imagem = 1, vídeo = 2, personagem = 1). Este pedido usa ${cota}.`);
            if (imagens.length) input.image_urls = imagens;
            if (personagens.length) input.character_ids = personagens;
            if (audios.length) input.audio_ids = audios;
            if (video) input.video_list = video;
            if (!video || p.aspect_ratio) input.aspect_ratio = escolher(p.aspect_ratio, ['9:16', '16:9']);
            return { model: 'google/gemini-omni-flash-1-1', input };
        },
    },

    // HappyHorse 1.1: texto para vídeo ou imagem para vídeo (3 a 15 s)
    'v-happyhorse-1-1': {
        tipo: 'video',
        montar: (p) => {
            const modo = p.modo || (p.image_url ? 'quadros' : 'texto');
            if (modo === 'referencias') throw new PedidoInvalido('O HappyHorse aqui funciona com texto ou com uma imagem inicial (modo quadros).');
            const resolution = escolher(p.resolution, ['1080p', '720p']);
            const duration = Math.round(numero(p.duration, 3, 15, 5));
            if (modo === 'quadros') {
                return {
                    model: 'happyhorse-1-1/image-to-video',
                    input: { image_urls: [link(p.image_url, 'a imagem inicial')], prompt: texto(p.prompt, { padrao: PADRAO_MOVIMENTO, max: 5000 }), resolution, duration },
                };
            }
            return {
                model: 'happyhorse-1-1/text-to-video',
                input: {
                    prompt: texto(p.prompt, { obrigatorio: true, max: 5000 }),
                    resolution,
                    aspect_ratio: escolher(p.aspect_ratio, ['9:16', '16:9', '1:1', '4:3', '3:4', '4:5', '5:4', '9:21', '21:9']),
                    duration,
                },
            };
        },
    },

    // Kling 3.0 Omni: só texto para vídeo por aqui (para animar imagem, use v-kling-3)
    'v-kling-3-omni': {
        tipo: 'video',
        montar: (p) => {
            const modo = p.modo || (p.image_url ? 'quadros' : 'texto');
            if (modo !== 'texto') throw new PedidoInvalido('O Kling 3.0 Omni está liberado só para texto para vídeo. Para animar uma imagem, use o v-kling-3.');
            return {
                model: 'kling-3.0-omni/text-to-video',
                input: {
                    prompt: texto(p.prompt, { obrigatorio: true, max: 3072 }),
                    audio: !!p.audio,
                    resolution: escolher(p.resolution, ['720p', '1080p', '4k']),
                    aspect_ratio: escolher(p.aspect_ratio, ['9:16', '16:9', '1:1']),
                    duration: Math.round(numero(p.duration, 3, 15, 5)),
                },
            };
        },
    },

    // MiniMax H3: texto para vídeo, já sai com áudio estéreo (não dá para desligar)
    'v-minimax-h3': {
        tipo: 'video',
        montar: (p) => {
            const modo = p.modo || (p.image_url ? 'quadros' : 'texto');
            if (modo !== 'texto') throw new PedidoInvalido('O MiniMax H3 está liberado só para texto para vídeo.');
            return {
                model: 'minimax-h3/text-to-video',
                input: {
                    prompt: texto(p.prompt, { obrigatorio: true, max: 7000 }),
                    aspect_ratio: escolher(p.aspect_ratio, ['9:16', '16:9', '1:1', '4:3', '3:4', '21:9']),
                    duration: Math.round(numero(p.duration, 4, 15, 6)),
                    // 768P por padrão para poupar créditos; 2K é a opção de máxima qualidade
                    resolution: escolher(p.resolution, ['768P', '2K']),
                },
            };
        },
    },
});

export function montarPedido(tipo, params = {}) {
    const item = CATALOGO[params.model];
    if (!item) throw new PedidoInvalido('Modelo desconhecido.');
    const tipos = Array.isArray(item.tipo) ? item.tipo : [item.tipo];
    if (!tipos.includes(tipo)) throw new PedidoInvalido('Esse modelo não serve para este tipo de geração.');
    return item.montar(params);
}
