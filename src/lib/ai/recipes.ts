import OpenAI from "openai";
import Exa from "exa-js";
import type { Recipe } from "@/types";
import { OPENAI_MODELS, CLOUDFLARE_MODELS, MODEL_DISPLAY_NAMES } from "./models";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const exa = new Exa(process.env.EXA_API_KEY);

// Cloudflare Workers AI endpoint for SEA-LION
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

export interface RecipeSearchResult {
    title: string;
    url: string;
    text: string;
    publishedDate?: string;
}

export async function searchRecipesForClient(ingredients: string[]): Promise<RecipeSearchResult[]> {
    if (ingredients.length === 0) return [];

    try {
        const query = `Southeast Asian recipe with ${ingredients.slice(0, 5).join(", ")}`;
        console.log("Searching Exa for:", query);

        const result = await exa.searchAndContents(query, {
            type: "auto",
            numResults: 6,
            text: { maxCharacters: 500 },
            includeDomains: [
                "seriouseats.com",
                "bonappetit.com",
                "epicurious.com",
                "food52.com",
                "recipetineats.com",
                "woksoflife.com",
                "rasamalaysia.com",
                "mykoreankitchen.com",
                "vietworldkitchen.com",
                "hotthaikitchen.com",
            ],
        });

        return result.results.map((r) => ({
            title: r.title || "",
            url: r.url,
            text: r.text || "",
            publishedDate: r.publishedDate,
        }));
    } catch (error) {
        console.error("Exa search error:", error);
        return [];
    }
}

async function searchRecipes(ingredients: string[]): Promise<RecipeSearchResult[]> {
    if (ingredients.length === 0) return [];

    try {
        const query = `Southeast Asian recipe with ${ingredients.slice(0, 5).join(", ")}`;
        console.log("Searching Exa for:", query);

        const result = await exa.searchAndContents(query, {
            type: "auto",
            numResults: 5,
            text: { maxCharacters: 2000 },
            includeDomains: [
                "seriouseats.com",
                "bonappetit.com",
                "epicurious.com",
                "food52.com",
                "recipetineats.com",
                "woksoflife.com",
                "rasamalaysia.com",
                "mykoreankitchen.com",
                "vietworldkitchen.com",
                "hotthaikitchen.com",
            ],
        });

        return result.results.map((r) => ({
            title: r.title || "",
            url: r.url,
            text: r.text || "",
            publishedDate: r.publishedDate,
        }));
    } catch (error) {
        console.error("Exa search error:", error);
        return [];
    }
}

async function callSeaLion(messages: { role: string; content: string }[]): Promise<string | null> {
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        console.log("Cloudflare credentials not found");
        return null;
    }

    try {
        console.log("Calling SEA-LION API...");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${CLOUDFLARE_MODELS.SEA_LION}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages,
                max_tokens: 16000,
                temperature: 0.7,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("SEA-LION API error:", response.status, errorText);
            return null;
        }

        const data = await response.json();
        console.log("SEA-LION response received:", JSON.stringify(data).slice(0, 500));

        // Response format: { result: { choices: [{ message: { content: "..." } }] } }
        const result = data.result?.choices?.[0]?.message?.content || data.choices?.[0]?.message?.content || data.result?.response;

        if (!result || result.trim() === "") {
            console.log("SEA-LION returned empty response");
            return null;
        }

        return result;
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            console.error("SEA-LION request timed out after 120s");
        } else {
            console.error("SEA-LION request failed:", error);
        }
        return null;
    }
}

async function callOpenAI(messages: { role: string; content: string }[]): Promise<string> {
    const response = await openai.chat.completions.create({
        model: OPENAI_MODELS.GPT_5_MINI,
        messages: messages.map((m) => ({
            role: m.role as "system" | "user" | "assistant",
            content: m.content,
        })),
        response_format: { type: "json_object" },
    });

    return response.choices[0]?.message?.content || "{}";
}

async function generateRecipeImage(title: string): Promise<string | undefined> {
  if (!genai) {
    return undefined;
  }

  try {
    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash-exp-image-generation",
      contents: `Generate a realistic, high-quality food photograph of "${title}".
The image must look like real food photography, not illustration or CGI.
- plated and appetizing, centered composition
- natural lighting, shallow depth of field
- clean, minimal background with no text or people
- landscape orientation (wide, ~3:2 aspect ratio)`,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
  } catch (error) {
    console.error("Failed to generate recipe image:", error);
  }

  return undefined;
}

interface GenerateRecipesResult {
    recipes: Recipe[];
    modelUsed: string;
    searchResults: RecipeSearchResult[];
}

export async function generateRecipes(
    availableIngredients: string[],
    pantryStaples: string[],
    mode: "cook_now" | "buy_more",
    useSeaLion: boolean = true,
): Promise<GenerateRecipesResult> {
    // Handle empty fridge
    if (availableIngredients.length === 0 && pantryStaples.length === 0) {
        return { recipes: [], modelUsed: "none", searchResults: [] };
    }

    // Search for real recipes using Exa to ground the AI
    const allIngredients = [...availableIngredients, ...pantryStaples];
    const recipeSearchResults = await searchRecipes(allIngredients);

    const recipeContext =
        recipeSearchResults.length > 0
            ? `Here are some real recipes for reference and inspiration:

${recipeSearchResults
    .map(
        (r, i) => `
--- Recipe ${i + 1}: ${r.title} ---
Source: ${r.url}
${r.text}
`,
    )
    .join("\n")}`
            : "";

    const systemPrompt = `You are a Southeast Asian culinary expert. Generate practical, delicious recipes based on available ingredients.

You specialize in cuisines from:
- Singapore (Laksa, Hainanese Chicken Rice, Char Kway Teow)
- Malaysia (Nasi Lemak, Rendang, Satay)
- Indonesia (Nasi Goreng, Gado-gado, Soto)
- Thailand (Pad Thai, Green Curry, Tom Yum)
- Vietnam (Pho, Banh Mi, Spring Rolls)
- Philippines (Adobo, Sinigang, Kare-kare)

But you can also suggest non-SEA dishes when appropriate.

${recipeContext}

Use the recipe references above to create DETAILED, AUTHENTIC recipes with:
- Precise measurements and quantities
- Detailed step-by-step instructions (at least 6-8 steps)
- Cooking tips and techniques
- Accurate cook times

You MUST respond with valid JSON only. No explanations, no markdown code blocks, just pure JSON.`;

    const recipeFormat = `{
  "recipes": [
    {
      "id": "1",
      "title": "Detailed Recipe Name",
      "cuisineStyle": ["Malaysian", "Spicy"],
      "ingredients": [
        { "name": "chicken thigh", "quantity": 500, "unit": "g", "available": true },
        { "name": "garlic", "quantity": 4, "unit": "cloves", "available": true }
      ],
      "missingIngredients": [],
      "instructions": [
        "Prepare ingredients: Cut chicken into bite-sized pieces. Mince garlic finely.",
        "Marinate chicken with soy sauce, salt, and pepper for 15 minutes.",
        "Heat 2 tablespoons of oil in a wok over high heat until smoking.",
        "Add garlic and stir-fry for 30 seconds until fragrant.",
        "Add chicken pieces and spread in single layer. Let sear for 2 minutes without stirring.",
        "Flip chicken and cook for another 3 minutes until golden brown.",
        "Add sauce mixture and toss to coat evenly.",
        "Garnish with green onions and serve immediately over steamed rice."
      ],
      "cookTime": "30 mins",
      "servings": 4
    }
  ]
}`;

    const userPrompt =
        mode === "cook_now"
            ? `Generate 3 DETAILED recipes I can cook using ONLY these ingredients.

Available ingredients: ${availableIngredients.length > 0 ? availableIngredients.join(", ") : "None"}
Pantry staples: ${pantryStaples.length > 0 ? pantryStaples.join(", ") : "Salt, pepper, oil, rice"}

Rules:
- Use ONLY ingredients from the lists above
- missingIngredients must be empty array []
- Focus on SEA home cooking
- Include at least 6-8 detailed instruction steps per recipe
- Specify exact quantities and measurements
- Include cooking tips in the instructions

Respond with JSON in this exact format:
${recipeFormat}`
            : `Generate 3 DETAILED recipes I could cook if I buy a few more items.

Available ingredients: ${availableIngredients.length > 0 ? availableIngredients.join(", ") : "None"}
Pantry staples: ${pantryStaples.length > 0 ? pantryStaples.join(", ") : "Salt, pepper, oil, rice"}

Rules:
- Use mostly available ingredients
- Maximum 3 additional ingredients per recipe in missingIngredients
- Focus on SEA home cooking
- Include at least 6-8 detailed instruction steps per recipe
- Specify exact quantities and measurements
- Include cooking tips in the instructions

Respond with JSON in this exact format:
${recipeFormat}`;

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
    ];

    let response: string | null = null;
    let modelUsed = "";

    if (useSeaLion) {
        response = await callSeaLion(messages);
        if (response) {
            modelUsed = MODEL_DISPLAY_NAMES.SEA_LION_WITH_SEARCH;
        }
    }

    if (!response) {
        console.log("Using GPT-4.1 Mini for recipe generation");
        response = await callOpenAI(messages);
        modelUsed = MODEL_DISPLAY_NAMES.GPT_WITH_SEARCH;
    }

    try {
        // Try to parse the response as JSON
        let jsonStr = response.trim();

        // Extract JSON if wrapped in markdown code blocks
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        }

        // Try to find JSON object in the response
        const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
            jsonStr = jsonObjectMatch[0];
        }

        if (!jsonStr || jsonStr === "") {
            console.error("Empty response after parsing");
            return { recipes: [], modelUsed, searchResults: recipeSearchResults };
        }

        const parsed = JSON.parse(jsonStr);
        return {
            recipes: parsed.recipes || [],
            modelUsed,
            searchResults: recipeSearchResults,
        };
    } catch (error) {
        console.error("Failed to parse recipe response:", error);
        console.error("Raw response:", response);
        return { recipes: [], modelUsed, searchResults: recipeSearchResults };
    }
}
