import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DiscoverResult } from "@/types";

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;

interface RunPodResponse {
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

async function callRunPodEndpoint(image: string): Promise<RunPodResponse> {
  if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID) {
    throw new Error("RunPod credentials not configured");
  }

  const response = await fetch(
    `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/runsync`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RUNPOD_API_KEY}`,
      },
      body: JSON.stringify({
        input: { image },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`RunPod API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  if (result.status === "FAILED") {
    throw new Error(result.error || "RunPod job failed");
  }

  return result.output;
}

function normalizeIngredientName(name: string): string {
  return name.toLowerCase().trim().replace(/s$/, "");
}

function compareIngredients(
  requiredIngredients: { name: string; quantity?: string }[],
  userIngredients: string[],
  pantryStaples: string[]
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
        normalizedName.includes(available)
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
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    // Call RunPod endpoint to analyze the dish
    const runpodResult = await callRunPodEndpoint(image);

    if (runpodResult.error) {
      return NextResponse.json(
        { error: runpodResult.error },
        { status: 500 }
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
      runpodResult.ingredients || [],
      userIngredientNames,
      stapleNames
    );

    const result: DiscoverResult = {
      dish: runpodResult.dish,
      ingredients: comparedIngredients,
      recipe: runpodResult.recipe,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Discover analysis error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to analyze dish",
      },
      { status: 500 }
    );
  }
}
