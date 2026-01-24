import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFoodImage } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dishName, cuisineStyle } = await request.json();

    if (!dishName) {
      return NextResponse.json({ error: "Dish name is required" }, { status: 400 });
    }

    const imageUrl = await generateFoodImage(dishName, cuisineStyle || []);

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Recipe image generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
