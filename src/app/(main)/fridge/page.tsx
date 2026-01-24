import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FridgeClient } from "./fridge-client";

export default async function FridgePage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: ingredients } = await supabase
        .from("ingredients")
        .select("id,name,quantity,unit,expiry_date,image_status,is_pantry_staple")
        .eq("user_id", user.id)
        .eq("is_excluded", false)
        .order("created_at", { ascending: false });

    const { data: pantryStaples } = await supabase.from("pantry_staples").select("*").eq("user_id", user.id);

    const ingredientsSafe = (ingredients || []).map((item) => ({
        ...item,
        image_url: null,
        image_status: item.image_status as "pending" | "generating" | "ready",
    }));

    return <FridgeClient initialIngredients={ingredientsSafe} initialPantryStaples={pantryStaples || []} />;
}
