// packages/ai/router/modelRegistry.ts

export const MODEL_REGISTRY = {
  CHEAP: {
    model: "llama-3-8b-8192", // Groq's cheap model
    costPer1k: 0.0001,
    quality: 0.6,
    latencyMs: 150
  },
  BALANCED: {
    model: "llama-3.3-70b-versatile", // Groq's balanced model
    costPer1k: 0.0006,
    quality: 0.85,
    latencyMs: 400
  },
  PREMIUM: {
    model: "mixtral-8x7b-32768", // Alternative premium or could be gpt-4 via another provider
    costPer1k: 0.002,
    quality: 0.95,
    latencyMs: 800
  }
};

export type ModelTier = keyof typeof MODEL_REGISTRY;
export type ModelConfig = typeof MODEL_REGISTRY[ModelTier];
