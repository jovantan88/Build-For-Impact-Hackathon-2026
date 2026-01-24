import OpenAI from "openai";
import type { Recipe } from "@/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cloudflare Workers AI endpoint for SEA-LION
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const SEA_LION_MODEL = "@cf/aisingapore/gemma-sea-lion-v4-27b-it";

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
          max_tokens: 4000,
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
    model: "gpt-4.1-mini",
    messages: messages.map((m) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    })),
    response_format: { type: "json_object" },
  });

  return response.choices[0]?.message?.content || "{}";
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
    response = await callSeaLion(messages);
    if (response) {
      modelUsed = "SEA-LION (Cloudflare)";
    }
  }

  if (!response) {
    console.log("Using GPT-4.1 Mini for recipe generation");
    response = await callOpenAI(messages);
    modelUsed = "GPT-4.1 Mini (OpenAI)";
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
    return { recipes: parsed.recipes || [], modelUsed };
  } catch (error) {
    console.error("Failed to parse recipe response:", error);
    console.error("Raw response:", response);
    return { recipes: [], modelUsed };
  }
}
