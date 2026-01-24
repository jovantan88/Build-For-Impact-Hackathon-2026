import OpenAI from "openai";
import { GoogleGenAI, Modality } from "@google/genai";
import type { Recipe } from "@/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const geminiApiKey = process.env.GEMINI_API_KEY;
const genai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

// Cloudflare Workers AI endpoint for SEA-LION
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const SEA_LION_MODEL = "@cf/aisingapore/gemma-sea-lion-v4-27b-it";

async function callSeaLionStream(
  messages: { role: string; content: string }[],
): Promise<string | null> {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.log("Cloudflare credentials not found");
    return null;
  }

  try {
    console.log("Calling SEA-LION API (streaming)...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${SEA_LION_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
          max_tokens: 16000,
          temperature: 0.7,
          stream: true,
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SEA-LION API error:", response.status, errorText);
      clearTimeout(timeoutId);
      return null;
    }

    if (!response.body) {
      clearTimeout(timeoutId);
      return null;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let output = "";
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      if (readerDone) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") {
          done = true;
          break;
        }

        try {
          const parsed = JSON.parse(data);
          const token =
            parsed.response ||
            parsed.result?.response ||
            parsed.choices?.[0]?.delta?.content ||
            parsed.result?.choices?.[0]?.delta?.content ||
            parsed.result?.choices?.[0]?.message?.content;
          if (token) {
            output += token;
          }
        } catch {
          // Fallback: append raw data if JSON parsing fails
          output += data;
        }
      }
    }

    clearTimeout(timeoutId);
    const leftover = buffer.trim();
    if (leftover.startsWith("data:")) {
      const data = leftover.slice(5).trim();
      if (data && data !== "[DONE]") {
        try {
          const parsed = JSON.parse(data);
          const token =
            parsed.response ||
            parsed.result?.response ||
            parsed.choices?.[0]?.delta?.content ||
            parsed.result?.choices?.[0]?.delta?.content ||
            parsed.result?.choices?.[0]?.message?.content;
          if (token) {
            output += token;
          }
        } catch {
          output += data;
        }
      }
    }
    
    const finalOutput = output.trim();
    if (!finalOutput) return null;
    
    // Validate that we have complete JSON before returning
    try {
      // Try to extract and validate JSON
      let jsonStr = finalOutput;
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
        // Test parse to ensure it's valid
        JSON.parse(jsonStr);
        return jsonStr;
      }
      return finalOutput;
    } catch (e) {
      console.error("Streamed output is not valid JSON, returning null to trigger fallback");
      return null;
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("SEA-LION stream timed out after 120s");
    } else {
      console.error("SEA-LION streaming request failed:", error);
    }
    return null;
  }
}

async function callSeaLion(
  messages: { role: string; content: string }[],
): Promise<string | null> {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.log("Cloudflare credentials not found");
    return null;
  }

  try {
    console.log("Calling SEA-LION API...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${SEA_LION_MODEL}`,
      {
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
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SEA-LION API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log(
      "SEA-LION response received:",
      JSON.stringify(data).slice(0, 200),
    );

    // Response format: { result: { choices: [{ message: { content: "..." } }] } }
    const result =
      data.result?.choices?.[0]?.message?.content ||
      data.choices?.[0]?.message?.content ||
      data.result?.response;

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

async function callOpenAI(
  messages: { role: string; content: string }[],
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
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
}

export async function generateRecipes(
  availableIngredients: string[],
  pantryStaples: string[],
  mode: "cook_now" | "buy_more",
  useSeaLion: boolean = true,
): Promise<GenerateRecipesResult> {
  // Handle empty fridge
  if (availableIngredients.length === 0 && pantryStaples.length === 0) {
    return { recipes: [], modelUsed: "none" };
  }

  const systemPrompt = `You are a Southeast Asian culinary expert. Generate practical, delicious recipes based on available ingredients.

You specialize in cuisines from:
- Singapore (Laksa, Hainanese Chicken Rice, Char Kway Teow)
- Malaysia (Nasi Lemak, Rendang, Satay)
- Indonesia (Nasi Goreng, Gado-gado, Soto)
- Thailand (Pad Thai, Green Curry, Tom Yum)
- Vietnam (Pho, Banh Mi, Spring Rolls)
- Philippines (Adobo, Sinigang, Kare-kare)

But you can also suggest non-SEA dishes when appropriate.

You MUST respond with valid JSON only. No explanations, no markdown, just pure JSON.`;

  const recipeFormat = `{
  "recipes": [
    {
      "id": "1",
      "title": "Recipe Name",
      "cuisineStyle": ["Malaysian"],
      "ingredients": [
        { "name": "chicken", "quantity": 500, "unit": "g", "available": true }
      ],
      "missingIngredients": [],
      "instructions": ["Step 1", "Step 2", "Step 3"],
      "cookTime": "30 mins",
      "servings": 4
    }
  ]
}`;

  const userPrompt =
    mode === "cook_now"
      ? `Generate 3 recipes I can cook using ONLY these ingredients.

Available ingredients: ${availableIngredients.length > 0 ? availableIngredients.join(", ") : "None"}
Pantry staples: ${pantryStaples.length > 0 ? pantryStaples.join(", ") : "Salt, pepper, oil, rice"}

Rules:
- Use ONLY ingredients from the lists above
- missingIngredients must be empty array []
- Focus on SEA home cooking

Respond with JSON in this exact format:
${recipeFormat}`
      : `Generate 3 recipes I could cook if I buy a few more items.

Available ingredients: ${availableIngredients.length > 0 ? availableIngredients.join(", ") : "None"}
Pantry staples: ${pantryStaples.length > 0 ? pantryStaples.join(", ") : "Salt, pepper, oil, rice"}

Rules:
- Use mostly available ingredients
- Maximum 3 additional ingredients per recipe in missingIngredients
- Focus on SEA home cooking

Respond with JSON in this exact format:
${recipeFormat}`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  let response: string | null = null;
  let modelUsed = "";

  if (useSeaLion) {
    response = await callSeaLionStream(messages);
    if (response) {
      modelUsed = "SEA-LION (Cloudflare)";
    }
  }

  if (!response) {
    if (useSeaLion) {
      response = await callSeaLion(messages);
      if (response) {
        modelUsed = "SEA-LION (Cloudflare)";
      }
    }
  }

  if (!response) {
    console.log("Using GPT-5 Mini for recipe generation");
    response = await callOpenAI(messages);
    modelUsed = "GPT-5 Mini (OpenAI)";
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
      return { recipes: [], modelUsed };
    }

    const parsed = JSON.parse(jsonStr);
    const recipes = parsed.recipes || [];
    const recipesWithImages = await Promise.all(
      recipes.map(async (recipe: Recipe) => ({
        ...recipe,
        imageUrl: await generateRecipeImage(recipe.title),
      })),
    );
    return { recipes: recipesWithImages, modelUsed };
  } catch (error) {
    console.error("Failed to parse recipe response:", error);
    console.error("Raw response length:", response?.length || 0);
    console.error("Raw response preview:", response?.slice(0, 500));
    console.error("Raw response end:", response?.slice(-500));
    return { recipes: [], modelUsed };
  }
}
