import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Save ingredients to the fridge
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ingredients, receiptId } = await request.json();

    if (!ingredients || !Array.isArray(ingredients)) {
      return NextResponse.json(
        { error: "Ingredients array is required" },
        { status: 400 },
      );
    }

    const ingredientsToInsert = ingredients.map(
      (item: {
        name: string;
        quantity?: number;
        unit?: string;
        expiryDate?: string;
      }) => ({
        user_id: user.id,
        receipt_id: receiptId || null,
        name: item.name,
        quantity: item.quantity || null,
        unit: item.unit || null,
        expiry_date: item.expiryDate || null,
        image_url: null,
        image_status: "pending",
        is_pantry_staple: false,
        is_excluded: false,
      }),
    );

    const { data, error } = await supabase
      .from("ingredients")
      .insert(ingredientsToInsert)
      .select();

    if (error) {
      console.error("Insert error:", error);
      throw error;
    }

    return NextResponse.json({ ingredients: data });
  } catch (error) {
    console.error("Save ingredients error:", error);
    return NextResponse.json(
      { error: "Failed to save ingredients" },
      { status: 500 },
    );
  }
}

// Get all ingredients for the user's fridge
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: ingredients, error: ingredientsError } = await supabase
      .from("ingredients")
      .select("id,name,quantity,unit,expiry_date,image_status,is_pantry_staple")
      .eq("user_id", user.id)
      .eq("is_excluded", false)
      .order("created_at", { ascending: false });

    if (ingredientsError) throw ingredientsError;

    const { data: pantryStaples, error: staplesError } = await supabase
      .from("pantry_staples")
      .select("*")
      .eq("user_id", user.id);

    if (staplesError) throw staplesError;

    const ingredientsSafe = (ingredients || []).map((item) => ({
      ...item,
      image_url: null,
    }));

    return NextResponse.json({ ingredients: ingredientsSafe, pantryStaples });
  } catch (error) {
    console.error("Get ingredients error:", error);
    return NextResponse.json(
      { error: "Failed to get ingredients" },
      { status: 500 },
    );
  }
}

// Delete an ingredient
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Ingredient ID is required" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("ingredients")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete ingredient error:", error);
    return NextResponse.json(
      { error: "Failed to delete ingredient" },
      { status: 500 },
    );
  }
}
