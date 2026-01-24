import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateIngredientImage } from "@/lib/ai";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the ingredient
    const { data: ingredient, error: fetchError } = await supabase
      .from("ingredients")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !ingredient) {
      return NextResponse.json(
        { error: "Ingredient not found" },
        { status: 404 },
      );
    }

    // Update status to generating
    await supabase
      .from("ingredients")
      .update({ image_status: "generating" })
      .eq("id", id);

    // Generate image using Gemini (Nano Banana)
    const imageUrl = await generateIngredientImage(ingredient.name);

    // Update with the generated image
    await supabase
      .from("ingredients")
      .update({ image_url: imageUrl, image_status: "ready" })
      .eq("id", id);

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Image generation error:", error);

    // Update status back to pending on failure
    const { id } = await params;
    const supabase = await createClient();
    await supabase
      .from("ingredients")
      .update({ image_status: "pending" })
      .eq("id", id);

    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { data: ingredient, error } = await supabase
      .from("ingredients")
      .select("image_url")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !ingredient) {
      return NextResponse.json(
        { error: "Ingredient not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ imageUrl: ingredient.image_url || null });
  } catch (error) {
    console.error("Image fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch image" },
      { status: 500 },
    );
  }
}
