import OpenAI from "openai";
import type { Recipe } from "@/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cloudflare Workers AI endpoint for SEA-LION
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const SEA_LION_MODEL = "@cf/aisingapore/gemma-sea-lion-v4-27b-it";

async function callSeaLion(messages: { role: string; content: string }[]) {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    // Fallback to OpenAI if Cloudflare credentials not configured
    console.log("Cloudflare credentials not found, falling back to OpenAI");
    return callOpenAIFallback(messages);
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${SEA_LION_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    }
  );

  if (!response.ok) {
    console.error("SEA-LION API error:", await response.text());
    return callOpenAIFallback(messages);
  }

  const data = await response.json();
  return data.result?.response || "";
}

async function callOpenAIFallback(messages: { role: string; content: string }[]) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages.map((m) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    })),
    response_format: { type: "json_object" },
  });

  return response.choices[0]?.message?.content || "";
}

export async function generateRecipes(
  availableIngredients: string[],
  pantryStaples: string[],
  mode: "cook_now" | "buy_more"
): Promise<Recipe[]> {
  const systemPrompt = `You are a Southeast Asian culinary expert. Generate practical, delicious recipes based on available ingredients.

You specialize in cuisines from:
- Singapore (Laksa, Hainanese Chicken Rice, Char Kway Teow)
- Malaysia (Nasi Lemak, Rendang, Satay)
- Indonesia (Nasi Goreng, Gado-gado, Soto)
- Thailand (Pad Thai, Green Curry, Tom Yum)
- Vietnam (Pho, Banh Mi, Spring Rolls)
- Philippines (Adobo, Sinigang, Kare-kare)

But you can also suggest non-SEA dishes when appropriate.

Return JSON format:
{
  "recipes": [
    {
      "id": "unique-id",
      "title": "Recipe Name",
      "cuisineStyle": ["Thai", "Spicy"],
      "ingredients": [
        { "name": "ingredient", "quantity": 200, "unit": "g", "available": true }
      ],
      "missingIngredients": [
        { "name": "ingredient", "quantity": 1, "unit": "tbsp" }
      ],
      "instructions": ["Step 1...", "Step 2..."],
      "cookTime": "30 mins",
      "servings": 2
    }
  ]
}`;

  const userPrompt =
    mode === "cook_now"
      ? `Generate 3-5 recipes I can cook RIGHT NOW using ONLY these ingredients:

Available ingredients: ${availableIngredients.join(", ")}
Pantry staples I have: ${pantryStaples.join(", ")}

Rules:
- ONLY use ingredients from the lists above
- missingIngredients array should be EMPTY
- Prioritize using ingredients that might expire soon
- Focus on practical, everyday SEA home cooking`
      : `Generate 3-5 recipes I could cook if I buy a FEW MORE items:

Available ingredients: ${availableIngredients.join(", ")}
Pantry staples I have: ${pantryStaples.join(", ")}

Rules:
- Use mostly available ingredients
- Suggest maximum 3 additional ingredients per recipe
- Additional items should be common and easy to find
- Focus on practical, everyday SEA home cooking`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const response = await callSeaLion(messages);

  try {
    // Try to parse the response as JSON
    let jsonStr = response;

    // Extract JSON if wrapped in markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr);
    return parsed.recipes || [];
  } catch (error) {
    console.error("Failed to parse recipe response:", error);
    console.error("Raw response:", response);
    return [];
  }
}
