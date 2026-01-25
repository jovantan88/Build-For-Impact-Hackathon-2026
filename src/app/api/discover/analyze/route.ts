import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DiscoverResult } from "@/types";
import OpenAI from "openai";
import { OPENAI_MODELS } from "@/lib/ai/models";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface DishAnalysisResponse {
  dish: {
    name: string;
    description: string;
    cuisine: string[];
  };
  ingredients: { name: string; quantity?: string }[];
  recipe: {
    prepTime?: string;
    cookTime?: string;
    servings?: number;
    instructions: string[];
    tips?: string;
  };
  error?: string;
}

async function analyzeDishWithGPT(
  image: string,
): Promise<DishAnalysisResponse> {
  const response = await openai.chat.completions.create({
    model: OPENAI_MODELS.GPT_5_MINI,
    messages: [
      {
        role: "system",
        content: `You are an expert chef and food analyst. When shown an image of a dish, you identify it and provide:
1. The dish name and a brief description
2. The cuisines it belongs to
3. A complete list of ingredients with estimated quantities
4. A full recipe with preparation time, cook time, servings, step-by-step instructions, and cooking tips

Focus on Southeast Asian cuisine but handle any dish you see.

Return your response as valid JSON with this exact structure:
{
  "dish": {
    "name": "string - the dish name",
    "description": "string - a brief appetizing description",
    "cuisine": ["array", "of", "cuisine", "types"]
  },
  "ingredients": [
    { "name": "ingredient name", "quantity": "amount with unit (e.g., '2 cups', '500g')" }
  ],
  "recipe": {
    "prepTime": "e.g., '15 mins'",
    "cookTime": "e.g., '30 mins'",
    "servings": 4,
    "instructions": [
      "Step 1: ...",
      "Step 2: ...",
      "Step 3: ..."
    ],
    "tips": "Optional cooking tips and variations"
  }
}`,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: image.startsWith("data:")
                ? image
                : `data:image/jpeg;base64,${image}`,
            },
          },
          {
            type: "text",
            text: "Analyze this dish and provide the full recipe. Return only valid JSON.",
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

  return JSON.parse(content);
}

function normalizeIngredientName(name: string): string {
  return name.toLowerCase().trim().replace(/s$/, "");
}

function compareIngredients(
  requiredIngredients: { name: string; quantity?: string }[],
  userIngredients: string[],
  pantryStaples: string[],
): {
  all: { name: string; quantity?: string; available: boolean }[];
  have: string[];
  missing: string[];
} {
  const availableSet = new Set([
    ...userIngredients.map(normalizeIngredientName),
    ...pantryStaples.map(normalizeIngredientName),
  ]);

  const have: string[] = [];
  const missing: string[] = [];
  const all: { name: string; quantity?: string; available: boolean }[] = [];

  for (const ingredient of requiredIngredients) {
    const normalizedName = normalizeIngredientName(ingredient.name);

    const isAvailable = Array.from(availableSet).some(
      (available) =>
        available.includes(normalizedName) ||
        normalizedName.includes(available),
    );

    all.push({
      name: ingredient.name,
      quantity: ingredient.quantity,
      available: isAvailable,
    });

    if (isAvailable) {
      have.push(ingredient.name);
    } else {
      missing.push(ingredient.name);
    }
  }

  return { all, have, missing };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Analyze the dish using GPT-5-mini with vision
    const analysisResult = await analyzeDishWithGPT(image);

    if (analysisResult.error) {
      return NextResponse.json(
        { error: analysisResult.error },
        { status: 500 },
      );
    }

    // Fetch user's fridge ingredients
    const { data: ingredients, error: ingredientsError } = await supabase
      .from("ingredients")
      .select("name")
      .eq("user_id", user.id)
      .eq("is_excluded", false);

    if (ingredientsError) throw ingredientsError;

    // Fetch user's pantry staples
    const { data: pantryStaples, error: staplesError } = await supabase
      .from("pantry_staples")
      .select("name")
      .eq("user_id", user.id)
      .eq("is_enabled", true);

    if (staplesError) throw staplesError;

    const userIngredientNames = (ingredients || []).map((i) => i.name);
    const stapleNames = (pantryStaples || []).map((s) => s.name);

    // Compare ingredients
    const comparedIngredients = compareIngredients(
      analysisResult.ingredients || [],
      userIngredientNames,
      stapleNames,
    );

    const result: DiscoverResult = {
      dish: analysisResult.dish,
      ingredients: comparedIngredients,
      recipe: analysisResult.recipe,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Discover analysis error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to analyze dish",
      },
      { status: 500 },
    );
  }
}
