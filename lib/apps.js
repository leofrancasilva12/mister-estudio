// Apps: ferramentas prontas, cada uma com suas entradas e um prompt já pensado.
// As de imagem usam o Nano Banana Pro (edição com referências); as de vídeo usam Wan Animate e PixVerse.

const IMG = 'image/jpeg,image/png,image/webp';
const VID = 'video/mp4,video/quicktime';
const QUALIDADE = { chave: 'res', tipo: 'segmentado', rotulo: 'Qualidade', opcoes: [['1K', '1K'], ['2K', '2K'], ['4K', '4K']], padrao: '2K' };

// Monta um pedido de edição de imagem no Nano Banana Pro
const imagem = (prompt, refs, v, proporcao = 'auto') => ({
    tipo: 'edicao',
    params: { model: 'nano-banana-pro', prompt, images_list: refs, aspect_ratio: proporcao, resolution: v.res || '2K' },
    modeloCusto: 'nano-banana-pro',
    opcoesCusto: { modo: 'editar', res: v.res || '2K' },
    midia: 'imagem',
    proporcao,
});

export const APPS = [
    // ---------------- Imagem ----------------
    {
        id: 'personagens', nome: 'Personagens', texto: 'Salve um rosto e use em qualquer cena, sempre igual', icone: 'retrato', grupo: 'imagem', especial: true,
    },
    {
        id: 'pincel', nome: 'Editar com pincel', texto: 'Pinte a área e diga o que colocar no lugar', icone: 'editar', grupo: 'imagem', especial: true,
    },
    {
        id: 'trocar-rosto', nome: 'Trocar rosto', texto: 'Põe o rosto de uma foto no corpo de outra', icone: 'rosto', grupo: 'imagem',
        aviso: 'Use só rostos de pessoas que autorizaram.',
        entradas: [{ chave: 'base', rotulo: 'Foto base (corpo e cena)', vazio: 'Anexar foto base' }, { chave: 'rosto', rotulo: 'Rosto', vazio: 'Anexar foto do rosto' }],
        campos: [QUALIDADE],
        montar: (v, u) => imagem('Take the person in the first image and replace only their face with the face from the second image. Keep the original pose, body, hair, clothing, lighting, background and camera angle. Match skin tone and lighting so it looks seamless and photorealistic.', [u.base, u.rosto], v),
        detalhes: () => 'Trocar rosto',
    },
    {
        id: 'trocar-roupa', nome: 'Trocar roupa', texto: 'Veste a pessoa com a roupa de outra foto', icone: 'retrato', grupo: 'imagem',
        entradas: [{ chave: 'pessoa', rotulo: 'Pessoa', vazio: 'Anexar foto da pessoa' }, { chave: 'roupa', rotulo: 'Roupa', vazio: 'Anexar foto da roupa' }],
        campos: [QUALIDADE],
        montar: (v, u) => imagem('Dress the person from the first image in the outfit shown in the second image. Keep the person’s face, body, pose and background unchanged. Realistic fabric, fit, folds and lighting.', [u.pessoa, u.roupa], v),
        detalhes: () => 'Trocar roupa',
    },
    {
        id: 'produto-na-cena', nome: 'Produto na cena', texto: 'Coloca o seu produto em qualquer cenário', icone: 'produto', grupo: 'imagem',
        entradas: [{ chave: 'produto', rotulo: 'Produto', vazio: 'Anexar foto do produto' }],
        campos: [
            { chave: 'cena', tipo: 'texto', rotulo: 'Cenário', placeholder: 'Ex.: sobre mármore branco com folhas verdes e luz de manhã', obrigatorio: true },
            { chave: 'proporcao', tipo: 'proporcao', rotulo: 'Proporção', opcoes: ['1:1', '4:5', '9:16', '16:9', '3:4'], padrao: '4:5' },
            QUALIDADE,
        ],
        montar: (v, u) => imagem(`Place the product from the image into this scene: ${v.cena}. Keep the product exactly as it is: same shape, colors, label text and logo. Realistic scale, contact shadows, reflections and lighting. Professional advertising photo.`, [u.produto], v, v.proporcao),
        detalhes: (v) => `Produto na cena · ${v.proporcao}`,
    },
    {
        id: 'mudar-fundo', nome: 'Mudar fundo', texto: 'Troca o cenário e mantém a pessoa ou o produto', icone: 'imagem', grupo: 'imagem',
        entradas: [{ chave: 'foto', rotulo: 'Foto', vazio: 'Anexar foto' }],
        campos: [{ chave: 'cena', tipo: 'texto', rotulo: 'Novo fundo', placeholder: 'Ex.: praia ao pôr do sol, desfocada', obrigatorio: true }, QUALIDADE],
        montar: (v, u) => imagem(`Replace the background behind the main subject with: ${v.cena}. Keep the subject exactly the same (face, body, product, clothing). Match the lighting, color and shadows to the new background so it looks real.`, [u.foto], v),
        detalhes: () => 'Mudar fundo',
    },
    {
        id: 'novo-angulo', nome: 'Novo ângulo', texto: 'Mostra a mesma cena de outro ponto de vista', icone: 'orbita', grupo: 'imagem',
        entradas: [{ chave: 'foto', rotulo: 'Foto', vazio: 'Anexar foto' }],
        campos: [
            { chave: 'angulo', tipo: 'pilulas', rotulo: 'Ângulo', padrao: 'perfil-esq', opcoes: [['frente', 'De frente'], ['perfil-esq', 'Perfil esquerdo'], ['perfil-dir', 'Perfil direito'], ['cima', 'De cima'], ['baixo', 'De baixo'], ['costas', 'De costas'], ['close', 'Close']] },
            QUALIDADE,
        ],
        montar: (v, u) => {
            const angulo = { frente: 'straight front view', 'perfil-esq': 'left side profile view', 'perfil-dir': 'right side profile view', cima: 'high angle view from above', baixo: 'low angle view from below', costas: 'back view', close: 'tight close-up view' }[v.angulo];
            return imagem(`Show the exact same subject and scene from a ${angulo}. Keep identity, clothing, colors, materials and environment consistent with the original. Photorealistic.`, [u.foto], v);
        },
        detalhes: (v) => `Novo ângulo · ${v.angulo}`,
    },
    {
        id: 'retrato-profissional', nome: 'Retrato profissional', texto: 'Uma selfie vira foto de perfil caprichada', icone: 'retrato', grupo: 'imagem',
        entradas: [{ chave: 'selfie', rotulo: 'Selfie', vazio: 'Anexar selfie' }],
        campos: [
            { chave: 'estilo', tipo: 'pilulas', rotulo: 'Estilo', padrao: 'corporativo', opcoes: [['corporativo', 'Corporativo'], ['estudio', 'Estúdio branco'], ['ar-livre', 'Ao ar livre'], ['editorial', 'Editorial']] },
            { chave: 'proporcao', tipo: 'proporcao', rotulo: 'Proporção', opcoes: ['1:1', '4:5', '3:4'], padrao: '4:5' },
            QUALIDADE,
        ],
        montar: (v, u) => {
            const estilo = { corporativo: 'professional corporate headshot, neutral gray studio background, soft key light, business attire', estudio: 'clean studio portrait on a white background with soft beauty lighting', 'ar-livre': 'outdoor portrait with soft natural light and a blurred city background', editorial: 'editorial magazine portrait with dramatic soft light' }[v.estilo];
            return imagem(`Turn this photo into a ${estilo}. Keep the person’s face and identity exactly the same, natural skin texture, flattering framing from the chest up.`, [u.selfie], v, v.proporcao);
        },
        detalhes: (v) => `Retrato · ${v.estilo}`,
    },
    {
        id: 'pele', nome: 'Pele perfeita', texto: 'Retoque natural, sem cara de filtro', icone: 'faisca', grupo: 'imagem',
        entradas: [{ chave: 'retrato', rotulo: 'Retrato', vazio: 'Anexar retrato' }],
        campos: [{ chave: 'intensidade', tipo: 'segmentado', rotulo: 'Intensidade', opcoes: [['leve', 'Leve'], ['media', 'Média']], padrao: 'leve' }, QUALIDADE],
        montar: (v, u) => imagem(`Retouch the skin of the person ${v.intensidade === 'leve' ? 'very subtly' : 'moderately'}: even out skin tone, reduce blemishes, redness and shine, while keeping pores and natural texture. Keep identity, makeup, hair, clothing and background unchanged.`, [u.retrato], v),
        detalhes: (v) => `Pele · ${v.intensidade}`,
    },
    {
        id: 'expandir', nome: 'Expandir imagem', texto: 'Aumenta a foto para outro formato, continuando a cena', icone: 'ampliar', grupo: 'imagem',
        entradas: [{ chave: 'foto', rotulo: 'Foto', vazio: 'Anexar foto' }],
        campos: [{ chave: 'proporcao', tipo: 'proporcao', rotulo: 'Novo formato', opcoes: ['16:9', '9:16', '1:1', '4:5', '21:9', '3:2'], padrao: '16:9' }, QUALIDADE],
        montar: (v, u) => imagem(`Extend this image outward to fill a ${v.proporcao} frame. Keep the original content unchanged in the center and continue the scene, background and lighting naturally beyond the original edges.`, [u.foto], v, v.proporcao),
        detalhes: (v) => `Expandir · ${v.proporcao}`,
    },

    // ---------------- Vídeo ----------------
    {
        id: 'trocar-pessoa-video', nome: 'Trocar pessoa no vídeo', texto: 'A pessoa da foto assume o lugar de quem está no vídeo', icone: 'video', grupo: 'video',
        aviso: 'Use só pessoas que autorizaram. Vídeo de até 10 MB.',
        entradas: [{ chave: 'video', rotulo: 'Vídeo', vazio: 'Anexar vídeo (até 10 MB)', aceita: VID, limiteMb: 10 }, { chave: 'foto', rotulo: 'Pessoa nova', vazio: 'Anexar foto da pessoa' }],
        campos: [{ chave: 'res', tipo: 'segmentado', rotulo: 'Resolução', opcoes: [['480p', '480p'], ['580p', '580p'], ['720p', '720p']], padrao: '720p' }],
        montar: (v, u) => ({ tipo: 'video', params: { model: 'wan-animate-replace', video_url: u.video, image_url: u.foto, resolution: v.res }, modeloCusto: 'wan-animate-replace', opcoesCusto: { res: v.res }, midia: 'video', proporcao: '16:9' }),
        detalhes: (v) => `Trocar pessoa · ${v.res}`,
    },
    {
        id: 'copiar-movimento', nome: 'Copiar movimento', texto: 'A pessoa da foto faz a dança ou o gesto do vídeo', icone: 'orbita', grupo: 'video',
        entradas: [{ chave: 'video', rotulo: 'Vídeo com o movimento', vazio: 'Anexar vídeo (até 10 MB)', aceita: VID, limiteMb: 10 }, { chave: 'foto', rotulo: 'Quem vai se mexer', vazio: 'Anexar foto' }],
        campos: [{ chave: 'res', tipo: 'segmentado', rotulo: 'Resolução', opcoes: [['480p', '480p'], ['580p', '580p'], ['720p', '720p']], padrao: '720p' }],
        montar: (v, u) => ({ tipo: 'video', params: { model: 'wan-animate-move', video_url: u.video, image_url: u.foto, resolution: v.res }, modeloCusto: 'wan-animate-move', opcoesCusto: { res: v.res }, midia: 'video', proporcao: '9:16' }),
        detalhes: (v) => `Copiar movimento · ${v.res}`,
    },
    {
        id: 'estender-video', nome: 'Estender vídeo', texto: 'Continua um vídeo por mais alguns segundos', icone: 'seta', grupo: 'video',
        entradas: [{ chave: 'video', rotulo: 'Vídeo', vazio: 'Anexar vídeo', aceita: VID }],
        campos: [
            { chave: 'continuacao', tipo: 'texto', rotulo: 'O que acontece depois (opcional)', placeholder: 'Ex.: a câmera se afasta e mostra a praia inteira' },
            { chave: 'dur', tipo: 'segmentado', rotulo: 'Segundos a mais', opcoes: [[5, '5 s'], [8, '8 s'], [10, '10 s'], [15, '15 s']], padrao: 5 },
            { chave: 'res', tipo: 'segmentado', rotulo: 'Qualidade', opcoes: [['540p', '540p'], ['720p', '720p'], ['1080p', '1080p']], padrao: '720p' },
            { chave: 'audio', tipo: 'segmentado', rotulo: 'Som', opcoes: [['nao', 'Sem som'], ['sim', 'Com som']], padrao: 'nao' },
        ],
        montar: (v, u) => ({ tipo: 'video', params: { model: 'pixverse-extend', video_url: u.video, prompt: v.continuacao, duration: v.dur, resolution: v.res, audio: v.audio === 'sim' }, modeloCusto: 'pixverse-extend', opcoesCusto: { res: v.res, dur: v.dur, audio: v.audio === 'sim' }, midia: 'video', proporcao: '16:9' }),
        detalhes: (v) => `Estender · +${v.dur} s · ${v.res}`,
    },
    {
        id: 'transicao', nome: 'Transição', texto: 'Um vídeo que vai de uma imagem até outra', icone: 'refazer', grupo: 'video', link: '/video?modo=imagem',
    },
];

export const appPorId = (id) => APPS.find((a) => a.id === id);
