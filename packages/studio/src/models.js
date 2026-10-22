// Modelos do Kie.ai disponíveis no Estúdio.
// Este arquivo só descreve o que aparece na tela (nomes e opções).
// Quem traduz isso para a API do Kie.ai é o servidor: lib/kie/catalogo.js
// Para adicionar um modelo, ele precisa existir nos DOIS arquivos, com o mesmo "id".

const opcoes = (lista, padrao) => ({ type: 'string', enum: lista, default: padrao ?? lista[0] });

const PROPORCOES_NANO = ['auto', '1:1', '4:5', '5:4', '3:4', '4:3', '2:3', '3:2', '9:16', '16:9', '21:9', '1:4', '4:1', '1:8', '8:1'];
const PROPORCOES_SEEDREAM = ['1:1', '4:3', '3:4', '16:9', '9:16', '2:3', '3:2', '21:9'];
const PROPORCOES_FLUX = ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3'];
const PROPORCOES_GPT = ['1:1', '2:3', '3:2'];

// ==========================================
// Texto para imagem
// ==========================================
export const t2iModels = [
  {
    id: 'nano-banana-2',
    name: 'Nano Banana 2',
    family: 'google',
    inputs: {
      aspect_ratio: opcoes(PROPORCOES_NANO, '1:1'),
      resolution: opcoes(['1K', '2K', '4K'], '1K'),
    },
  },
  {
    id: 'seedream-4.5',
    name: 'Seedream 4.5',
    family: 'bytedance',
    inputs: {
      aspect_ratio: opcoes(PROPORCOES_SEEDREAM, '1:1'),
      quality: opcoes(['basic', 'high'], 'basic'),
    },
  },
  {
    id: 'flux-2-pro',
    name: 'Flux 2 Pro',
    family: 'flux',
    inputs: {
      aspect_ratio: opcoes(PROPORCOES_FLUX, '1:1'),
      resolution: opcoes(['1K', '2K'], '1K'),
    },
  },
  {
    id: 'gpt-image-1.5',
    name: 'GPT Image 1.5',
    family: 'openai',
    inputs: {
      aspect_ratio: opcoes(PROPORCOES_GPT, '1:1'),
      quality: opcoes(['medium', 'high'], 'medium'),
    },
  },
];

export const getModelById = (id) => t2iModels.find(m => m.id === id);

export const getAspectRatiosForModel = (modelId) => {
  const model = getModelById(modelId);
  if (!model) return ['1:1'];
  return model.inputs?.aspect_ratio?.enum || ['1:1'];
};

// ==========================================
// Texto para vídeo
// ==========================================
export const t2vModels = [
  {
    id: 'seedance-2',
    name: 'Seedance 2',
    family: 'bytedance',
    inputs: {
      aspect_ratio: opcoes(['16:9', '9:16', '1:1', '4:3', '3:4', '21:9']),
      duration: { type: 'int', enum: [5, 8, 10, 15], default: 5 },
      resolution: opcoes(['720p', '480p', '1080p']),
      mode: opcoes(['Com áudio', 'Sem áudio']),
    },
  },
  {
    id: 'kling-2.6',
    name: 'Kling 2.6',
    family: 'kling',
    inputs: {
      aspect_ratio: opcoes(['16:9', '9:16', '1:1']),
      duration: { type: 'int', enum: [5, 10], default: 5 },
      mode: opcoes(['Sem áudio', 'Com áudio']),
    },
  },
];

export const getVideoModelById = (id) => t2vModels.find(m => m.id === id);

export const getAspectRatiosForVideoModel = (modelId) => {
  const model = getVideoModelById(modelId);
  if (!model) return ['16:9'];
  return model.inputs?.aspect_ratio?.enum || ['16:9'];
};

export const getDurationsForModel = (modelId) => {
  const model = getVideoModelById(modelId);
  if (!model) return [5];
  return model.inputs?.duration?.enum || [];
};

export const getResolutionsForVideoModel = (modelId) => {
  const model = getVideoModelById(modelId);
  return model?.inputs?.resolution?.enum || [];
};

// ==========================================
// Imagem para imagem (edição e referências)
// ==========================================
export const i2iModels = [
  {
    id: 'nano-banana-2-edit',
    name: 'Nano Banana 2',
    family: 'google',
    maxImages: 10,
    inputs: {
      aspect_ratio: opcoes(PROPORCOES_NANO, 'auto'),
      resolution: opcoes(['1K', '2K', '4K'], '1K'),
    },
  },
  {
    id: 'seedream-4.5-edit',
    name: 'Seedream 4.5 Edit',
    family: 'bytedance',
    maxImages: 14,
    inputs: {
      aspect_ratio: opcoes(PROPORCOES_SEEDREAM, '1:1'),
      quality: opcoes(['basic', 'high'], 'basic'),
    },
  },
  {
    id: 'flux-2-pro-edit',
    name: 'Flux 2 Pro Edit',
    family: 'flux',
    maxImages: 8,
    inputs: {
      aspect_ratio: opcoes(['auto', ...PROPORCOES_FLUX], 'auto'),
      resolution: opcoes(['1K', '2K'], '1K'),
    },
  },
  {
    id: 'gpt-image-1.5-edit',
    name: 'GPT Image 1.5 Edit',
    family: 'openai',
    maxImages: 16,
    inputs: {
      aspect_ratio: opcoes(PROPORCOES_GPT, '1:1'),
      quality: opcoes(['medium', 'high'], 'medium'),
    },
  },
];

// ==========================================
// Imagem para vídeo
// ==========================================
export const i2vModels = [
  {
    id: 'seedance-2-i2v',
    name: 'Seedance 2',
    family: 'bytedance',
    inputs: {
      aspect_ratio: opcoes(['adaptive', '16:9', '9:16', '1:1', '4:3', '3:4', '21:9']),
      duration: { type: 'int', enum: [5, 8, 10, 15], default: 5 },
      resolution: opcoes(['720p', '480p', '1080p']),
      mode: opcoes(['Com áudio', 'Sem áudio']),
    },
  },
  {
    id: 'kling-2.6-i2v',
    name: 'Kling 2.6',
    family: 'kling',
    inputs: {
      duration: { type: 'int', enum: [5, 10], default: 5 },
      mode: opcoes(['Sem áudio', 'Com áudio']),
    },
  },
  {
    id: 'hailuo-2.3',
    name: 'Hailuo 2.3',
    family: 'minimax',
    inputs: {
      duration: { type: 'int', enum: [6, 10], default: 6 },
      resolution: opcoes(['768P', '1080P']),
    },
  },
];

export const getI2IModelById = (id) => i2iModels.find(m => m.id === id);
export const getI2VModelById = (id) => i2vModels.find(m => m.id === id);

export const getAspectRatiosForI2IModel = (modelId) => {
  const model = getI2IModelById(modelId);
  return model?.inputs?.aspect_ratio?.enum || ['1:1'];
};

export const getAspectRatiosForI2VModel = (modelId) => {
  const model = getI2VModelById(modelId);
  return model?.inputs?.aspect_ratio?.enum || [];
};

export const getDurationsForI2VModel = (modelId) => {
  const model = getI2VModelById(modelId);
  return model?.inputs?.duration?.enum || [];
};

export const getResolutionsForI2VModel = (modelId) => {
  const model = getI2VModelById(modelId);
  return model?.inputs?.resolution?.enum || [];
};

export const getModesForModel = (modelId) => {
  const model = [...t2vModels, ...i2vModels].find(m => m.id === modelId);
  return model?.inputs?.mode?.enum || [];
};

export const getResolutionsForI2IModel = (modelId) => {
  const model = getI2IModelById(modelId);
  return model?.inputs?.resolution?.enum || model?.inputs?.quality?.enum || [];
};

// Nome do campo de qualidade de um modelo de texto para imagem ('resolution', 'quality' ou null)
export const getQualityFieldForModel = (modelId) => {
  const model = getModelById(modelId);
  if (model?.inputs?.resolution) return 'resolution';
  if (model?.inputs?.quality) return 'quality';
  return null;
};

export const getResolutionsForModel = (modelId) => {
  const model = getModelById(modelId);
  return model?.inputs?.resolution?.enum || model?.inputs?.quality?.enum || [];
};

export const getQualityFieldForI2IModel = (modelId) => {
  const model = getI2IModelById(modelId);
  if (model?.inputs?.resolution) return 'resolution';
  if (model?.inputs?.quality) return 'quality';
  return null;
};

export const getMaxImagesForI2IModel = (modelId) => getI2IModelById(modelId)?.maxImages || 1;

// ==========================================
// Vídeo para vídeo: nenhum por enquanto no Kie.ai
// (o botão de enviar vídeo some sozinho quando a lista está vazia)
// ==========================================
export const v2vModels = [];
export const getV2VModelById = (id) => v2vModels.find(m => m.id === id);

// ==========================================
// Lip sync
// ==========================================
export const lipsyncModels = [
  {
    id: 'infinitalk',
    name: 'InfiniteTalk',
    family: 'infinitalk',
    category: 'image',
    hasPrompt: true,
    description: 'Faz um retrato falar a partir de um áudio. Áudio até 10 MB.',
    inputs: { resolution: opcoes(['480p', '720p']) },
  },
  {
    id: 'kling-avatar',
    name: 'Kling Avatar',
    family: 'kling',
    category: 'image',
    hasPrompt: true,
    description: 'Avatar falante em 720p, com expressões naturais. Áudio até 5 minutos.',
  },
  {
    id: 'lipsync-video',
    name: 'Lip Sync de vídeo',
    family: 'volcengine',
    category: 'video',
    hasPrompt: false,
    description: 'Troca a fala de um vídeo existente pelo áudio enviado. Uma pessoa de frente.',
  },
];

export const getLipSyncModelById = (id) => lipsyncModels.find(m => m.id === id);

export const getResolutionsForLipSyncModel = (id) => getLipSyncModelById(id)?.inputs?.resolution?.enum || [];

export const imageLipSyncModels = lipsyncModels.filter(m => m.category === 'image');
export const videoLipSyncModels = lipsyncModels.filter(m => m.category === 'video');
