import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRecipes } from "@/lib/ai/recipes";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode =
      (searchParams.get("mode") as "cook_now" | "buy_more") || "cook_now";

    // Get user's ingredients
    const { data: ingredients, error: ingredientsError } = await supabase
      .from("ingredients")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_excluded", false);

    if (ingredientsError) throw ingredientsError;

    // Get user's pantry staples
    const { data: pantryStaples, error: staplesError } = await supabase
      .from("pantry_staples")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_enabled", true);

    if (staplesError) throw staplesError;

    const ingredientNames = (ingredients || []).map((i) => {
      let name = i.name;
      if (i.quantity) {
        name += ` (${i.quantity}${i.unit ? " " + i.unit : ""})`;
      }
      return name;
    });

    const stapleNames = (pantryStaples || []).map((s) => s.name);

    // Generate recipes using SEA-LION
    const recipes = await generateRecipes(ingredientNames, stapleNames, mode);

    return NextResponse.json({ recipes, mode });
  } catch (error) {
    console.error("Recipe generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate recipes" },
      { status: 500 },
    );
  }
}
