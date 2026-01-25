import OpenAI from "openai";
import { GoogleGenAI, Modality } from "@google/genai";
import { OPENAI_MODELS, GEMINI_MODELS } from "./models";
import {
  RECEIPT_EXTRACTION_SYSTEM_PROMPT,
  RECEIPT_EXTRACTION_USER_PROMPT,
  EXPIRY_CLASSIFICATION_SYSTEM_PROMPT,
  createExpiryClassificationUserPrompt,
  createIngredientImagePrompt,
  createFoodImagePrompt,
} from "./prompts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ExtractedItem {
  name: string;
  quantity?: number;
  unit?: string;
  isIngredient: boolean;
  category?: string;
}

export async function extractReceiptItems(
  imageBase64: string,
): Promise<ExtractedItem[]> {
  const response = await openai.chat.completions.create({
    model: OPENAI_MODELS.GPT_5_MINI,
    messages: [
      {
        role: "system",
        content: RECEIPT_EXTRACTION_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
            },
          },
          {
            type: "text",
            text: RECEIPT_EXTRACTION_USER_PROMPT,
          },
        ],
      },
    ],
    max_completion_tokens: 4000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  const parsed = JSON.parse(content);
  return parsed.items || [];
}

export async function classifyExpiryItems(
  items: string[],
): Promise<{ name: string; needsExpiry: boolean }[]> {
  const response = await openai.chat.completions.create({
    model: OPENAI_MODELS.GPT_5_MINI,
    messages: [
      {
        role: "system",
        content: EXPIRY_CLASSIFICATION_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: createExpiryClassificationUserPrompt(items),
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return items.map((name) => ({ name, needsExpiry: false }));
  }

  const parsed = JSON.parse(content);
  return parsed.items || [];
}

export async function generateIngredientImage(
  ingredientName: string,
): Promise<string> {
  // Use Gemini for image generation
  const response = await genai.models.generateContent({
    model: GEMINI_MODELS.IMAGE_GENERATION,
    contents: createIngredientImagePrompt(ingredientName),
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });

  // Extract image from response
  if (response.candidates && response.candidates[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        // Return as base64 data URL
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error("No image generated");
}

export async function generateFoodImage(
  dishName: string,
  cuisineStyle: string[] = [],
): Promise<string> {
  const prompt = createFoodImagePrompt(dishName, cuisineStyle);

  // Use Gemini for image generation
  const response = await genai.models.generateContent({
    model: GEMINI_MODELS.IMAGE_GENERATION,
    contents: prompt,
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });

  // Extract image from response
  if (response.candidates && response.candidates[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        // Return as base64 data URL
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error("No image generated");
}
