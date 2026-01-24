import OpenAI from "openai";
import { GoogleGenAI, Modality } from "@google/genai";
import { OPENAI_MODELS, GEMINI_MODELS } from "./models";

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

export async function extractReceiptItems(imageBase64: string): Promise<ExtractedItem[]> {
    const response = await openai.chat.completions.create({
        model: OPENAI_MODELS.GPT_5_MINI,
        messages: [
            {
                role: "system",
                content: `You are an expert at reading grocery receipts and extracting items.
Your task is to:
1. Extract all items from the receipt
2. Identify the quantity and unit if visible
3. Classify each item as either an ingredient (food that can be used in cooking) or non-ingredient (chips, soda, cleaning supplies, toiletries, etc.)

Return a JSON array of items with this structure:
{
  "items": [
    {
      "name": "string - cleaned up item name",
      "quantity": number or null,
      "unit": "string or null (kg, g, pcs, pack, bottle, can, etc.)",
      "isIngredient": boolean,
      "category": "string - produce/meat/dairy/pantry/beverage/snack/household/other"
    }
  ]
}

Focus on Southeast Asian grocery items but handle any items you see.
Clean up abbreviated names to full readable names.
If quantity isn't clear, leave it null.`,
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
                        text: "Extract all items from this receipt. Return only valid JSON.",
                    },
                ],
            },
        ],
        max_tokens: 2000,
        response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content);
    return parsed.items || [];
}

export async function classifyExpiryItems(items: string[]): Promise<{ name: string; needsExpiry: boolean }[]> {
    const response = await openai.chat.completions.create({
        model: OPENAI_MODELS.GPT_5_MINI,
        messages: [
            {
                role: "system",
                content: `You classify grocery items by whether they typically expire quickly and need expiry date tracking.

Items that need expiry tracking (return true):
- Fresh produce (vegetables, fruits, herbs)
- Dairy products (milk, yogurt, cheese, butter)
- Meat and seafood
- Bread and baked goods
- Eggs
- Tofu, tempeh
- Fresh noodles
- Deli items

Items that DON'T need expiry tracking (return false):
- Canned goods
- Dried goods (rice, pasta, beans)
- Oils and vinegars
- Spices and seasonings
- Sauces in bottles
- Frozen items
- Sugar, salt
- Coffee, tea

Return JSON: { "items": [{ "name": "item name", "needsExpiry": boolean }] }`,
            },
            {
                role: "user",
                content: `Classify these items: ${JSON.stringify(items)}`,
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

export async function generateIngredientImage(ingredientName: string): Promise<string> {
    // Use Gemini for image generation
    const response = await genai.models.generateContent({
        model: GEMINI_MODELS.IMAGE_GENERATION,
        contents: `Generate a clean, appetizing photograph of ${ingredientName}.
The image should be:
- On a clean white or light background
- Food photography style
- High quality and realistic
- Centered composition
- Well-lit and appetizing
- Landscape orientation (wide, ~21:9 aspect ratio)`,
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

export async function generateFoodImage(dishName: string, cuisineStyle: string[] = []): Promise<string> {
    const cuisineDesc = cuisineStyle.length > 0 ? cuisineStyle.join(", ") : "Southeast Asian";

    // Use Gemini for food image generation
    const response = await genai.models.generateContent({
        model: GEMINI_MODELS.IMAGE_GENERATION,
        contents: `Generate a beautiful, appetizing photograph of ${dishName}, a ${cuisineDesc} dish.
The image should be:
- Professional food photography style
- Served on an appropriate plate or bowl
- Garnished beautifully
- Warm, inviting lighting
- Shallow depth of field
- Top-down or 45-degree angle view
- High resolution and realistic
- Makes the viewer hungry`,
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
