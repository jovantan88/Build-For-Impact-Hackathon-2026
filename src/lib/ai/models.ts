// Central configuration for all AI models used in the application

// OpenAI Models
export const OPENAI_MODELS = {
    GPT_5_MINI: "gpt-5-mini",
} as const;

// Google Gemini Models
export const GEMINI_MODELS = {
    IMAGE_GENERATION: "gemini-3-pro-image-preview",
} as const;

// Cloudflare Workers AI Models (SEA-LION)
export const CLOUDFLARE_MODELS = {
    SEA_LION: "@cf/aisingapore/gemma-sea-lion-v4-27b-it",
} as const;

// Model keys used in API requests and caching
export const MODEL_KEYS = {
    SEA_LION: "sea-lion",
    GPT: "gpt",
} as const;

// Display names for UI
export const MODEL_DISPLAY_NAMES = {
    SEA_LION: "SEA-LION (Southeast Asian specialized)",
    SEA_LION_SHORT: "SEA-LION",
    GPT: "GPT-5 Mini (OpenAI)",
    GPT_SHORT: "GPT",
    SEA_LION_WITH_SEARCH: "SEA-LION + Exa Search",
    GPT_WITH_SEARCH: "GPT-5 Mini + Exa Search",
} as const;

// Type exports for type safety
export type OpenAIModel = (typeof OPENAI_MODELS)[keyof typeof OPENAI_MODELS];
export type GeminiModel = (typeof GEMINI_MODELS)[keyof typeof GEMINI_MODELS];
export type CloudflareModel = (typeof CLOUDFLARE_MODELS)[keyof typeof CLOUDFLARE_MODELS];
export type ModelKey = (typeof MODEL_KEYS)[keyof typeof MODEL_KEYS];
