export const IMAGE_MODELS = [
  {
    id: "bytedance-seed/seedream-4.5",
    name: "Seedream 4.5",
    description: "Alta calidad y detalle",
    limit: 5
  },
  {
    id: "sourceful/riverflow-v2-fast",
    name: "Riverflow V2 Fast",
    description: "Generación ultra rápida",
    limit: 10
  }
];

export const CHAT_MODELS = [
  {
    id: "nvidia/llama-3.1-nemotron-70b-instruct",
    name: "Nemotron 70B",
    limit: 10
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B",
    limit: 10
  },
  {
    id: "z-ai/glm-4.5-air:free",
    name: "GLM 4.5 Air",
    limit: 10
  },
  {
    id: "deepseek/deepseek-r1:free",
    name: "DeepSeek R1",
    limit: Infinity
  }
];

export const getModelLimit = (modelId: string) => {
  const imageModel = IMAGE_MODELS.find(m => m.id === modelId);
  if (imageModel) return imageModel.limit;
  
  const chatModel = CHAT_MODELS.find(m => m.id === modelId);
  if (chatModel) return chatModel.limit;
  
  return 10; // Default limit
};
