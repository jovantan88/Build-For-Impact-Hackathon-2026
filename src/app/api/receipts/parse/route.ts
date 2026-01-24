import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractReceiptItems, classifyExpiryItems } from "@/lib/ai";

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
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    // Remove data URL prefix if present
    const base64Image = image.replace(/^data:image\/\w+;base64,/, "");

    // Extract items from receipt using AI
    const extractedItems = await extractReceiptItems(base64Image);

    // Separate ingredients from non-ingredients
    const ingredients = extractedItems.filter((item) => item.isIngredient);
    const excludedItems = extractedItems.filter((item) => !item.isIngredient);

    // Classify which items need expiry dates
    const ingredientNames = ingredients.map((i) => i.name);
    const expiryClassification = await classifyExpiryItems(ingredientNames);

    // Create a map for quick lookup
    const expiryMap = new Map(
      expiryClassification.map((item) => [
        item.name.toLowerCase(),
        item.needsExpiry,
      ]),
    );

    // Create receipt record
    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .insert({
        user_id: user.id,
        raw_text: JSON.stringify(extractedItems),
      })
      .select()
      .single();

    if (receiptError) {
      console.error("Receipt insert error:", receiptError);
      throw receiptError;
    }

    // Format response with expiry info
    const ingredientsWithExpiry = ingredients.map((item) => ({
      ...item,
      needsExpiryDate: expiryMap.get(item.name.toLowerCase()) ?? false,
      tempId: crypto.randomUUID(),
    }));

    return NextResponse.json({
      receiptId: receipt.id,
      ingredients: ingredientsWithExpiry,
      excludedItems: excludedItems.map((item) => ({
        ...item,
        tempId: crypto.randomUUID(),
      })),
    });
  } catch (error) {
    console.error("Receipt parsing error:", error);
    return NextResponse.json(
      { error: "Failed to parse receipt" },
      { status: 500 },
    );
  }
}
