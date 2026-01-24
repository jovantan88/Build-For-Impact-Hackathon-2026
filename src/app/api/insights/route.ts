import { createClient } from "@/lib/supabase/server";
import {
  generatePurchaseRecommendations,
  generateInsightSummary,
} from "@/lib/ai/waste-insights";
import { NextResponse } from "next/server";
import type { WastePattern } from "@/types";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get waste patterns from the last 30 days
    const { data: wastePatterns, error: wasteError } = await supabase.rpc(
      "analyze_waste_patterns",
      { target_user_id: user.id },
    );

    if (wasteError) {
      console.error("Error fetching waste patterns:", wasteError);
      return NextResponse.json(
        { error: "Failed to fetch waste patterns" },
        { status: 500 },
      );
    }

    const patterns = (wastePatterns || []) as WastePattern[];
    console.log("Waste patterns from RPC:", patterns);

    // Also get all waste events to show in "Most Wasted Items" even if they don't meet pattern threshold
    const { data: allWasteEvents, error: allWasteError } = await supabase
      .from("waste_events")
      .select("*")
      .eq("user_id", user.id)
      .gte("waste_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .in("event_type", ["expired", "discarded"]);

    if (allWasteError) {
      console.error("Error fetching all waste events:", allWasteError);
    }

    // Aggregate waste events by ingredient
    const wasteByIngredient = new Map<string, { count: number; total: number }>();
    
    if (allWasteEvents) {
      // First, get all events (including 'used') to calculate total
      const { data: allEvents } = await supabase
        .from("waste_events")
        .select("ingredient_name, event_type")
        .eq("user_id", user.id)
        .gte("waste_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Count total events per ingredient
      const totalByIngredient = new Map<string, number>();
      if (allEvents) {
        allEvents.forEach((event) => {
          const name = event.ingredient_name.toLowerCase();
          totalByIngredient.set(name, (totalByIngredient.get(name) || 0) + 1);
        });
      }

      // Count waste events
      allWasteEvents.forEach((event) => {
        const name = event.ingredient_name.toLowerCase();
        const current = wasteByIngredient.get(name) || { count: 0, total: 0 };
        wasteByIngredient.set(name, {
          count: current.count + 1,
          total: totalByIngredient.get(name) || current.count + 1,
        });
      });
    }

    // Convert to array and sort by count
    const allMostWastedItems = Array.from(wasteByIngredient.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        frequency: data.count / data.total,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // If no patterns, return early but with waste data
    if (patterns.length === 0 && allMostWastedItems.length === 0) {
      return NextResponse.json({
        hasInsights: false,
        message:
          "Not enough data yet. Keep tracking your ingredients for personalized insights!",
        recommendations: [],
        insights: {
          totalWasteEvents: 0,
          mostWastedItems: [],
          totalSavingsPotential: 0,
          insightSummary:
            "Great job! No waste patterns detected yet. Keep tracking your ingredients to get personalized insights.",
        },
      });
    }

    // Use all wasted items if patterns is empty
    const mostWastedItems = patterns.length > 0
      ? patterns.slice(0, 5).map((p) => ({
          name: p.ingredientName,
          count: p.wasteCount,
          frequency: p.wasteFrequency,
        }))
      : allMostWastedItems;
    
    console.log("Most wasted items:", mostWastedItems);

    // Calculate savings potential (estimate $3-5 per wasted item)
    const totalWasteCount = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.wasteCount, 0)
      : allMostWastedItems.reduce((sum, item) => sum + item.count, 0);
    
    const totalSavingsPotential = totalWasteCount * 4; // $4 average per wasted item

    
    console.log("Total waste count:", totalWasteCount);
    console.log("Total savings potential:", totalSavingsPotential);
    // Generate AI recommendations only if we have patterns
    const aiRecommendations = patterns.length > 0
      ? await generatePurchaseRecommendations({ wastePatterns: patterns })
      : [];

    // Generate insight summary
    const insightSummary = await generateInsightSummary(
      totalWasteCount,
      mostWastedItems,
      totalSavingsPotential,
    );

    // Upsert recommendations to database
    for (const rec of aiRecommendations) {
      // Skip if ingredientName is missing
      if (!rec.ingredientName) {
        console.warn("Skipping recommendation with missing ingredientName:", rec);
        continue;
      }

      const pattern = patterns.find(
        (p) =>
          p.ingredientName?.toLowerCase() ===
          rec.ingredientName?.toLowerCase(),
      );

      if (pattern) {
        await supabase
          .from("purchase_recommendations")
          .upsert(
            {
              user_id: user.id,
              ingredient_name: rec.ingredientName,
              recommendation_type: rec.recommendationType,
              waste_frequency: pattern.wasteFrequency,
              total_occurrences: pattern.totalCount,
              wasted_occurrences: pattern.wasteCount,
              suggestion: rec.suggestion,
              substitute_with: rec.substituteWith,
              is_active: true,
              is_dismissed: false,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id,ingredient_name",
            },
          );
      }
    }

    // Upsert shopping insights
    await supabase
      .from("shopping_insights")
      .upsert({
        user_id: user.id,
        total_waste_events: patterns.reduce((sum, p) => sum + p.wasteCount, 0),
        most_wasted_items: mostWastedItems,
        total_savings_potential: totalSavingsPotential,
        insight_summary: insightSummary,
        last_analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    const response = {
      hasInsights: true,
      recommendations: aiRecommendations
        .filter((rec) => rec.ingredientName) // Filter out invalid recommendations
        .map((rec) => {
          const pattern = patterns.find(
            (p) =>
              p.ingredientName?.toLowerCase() ===
              rec.ingredientName?.toLowerCase(),
          );
          return {
            ...rec,
            wasteCount: pattern?.wasteCount || 0,
            totalCount: pattern?.totalCount || 0,
            wasteFrequency: pattern?.wasteFrequency || 0,
          };
        }),
      insights: {
        totalWasteEvents: totalWasteCount,
        mostWastedItems,
        totalSavingsPotential,
        insightSummary,
      },
    };
    
    console.log("Returning response:", JSON.stringify(response, null, 2));
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error generating waste insights:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 },
    );
  }
}

// Mark a recommendation as dismissed
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ingredientName, action } = await request.json();

    if (!ingredientName || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Update recommendation based on action
    if (action === "dismiss") {
      await supabase
        .from("purchase_recommendations")
        .update({
          is_dismissed: true,
          is_active: false,
        })
        .eq("user_id", user.id)
        .eq("ingredient_name", ingredientName);
    } else if (action === "accept") {
      await supabase
        .from("purchase_recommendations")
        .update({
          is_active: true,
          is_dismissed: false,
        })
        .eq("user_id", user.id)
        .eq("ingredient_name", ingredientName);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating recommendation:", error);
    return NextResponse.json(
      { error: "Failed to update recommendation" },
      { status: 500 },
    );
  }
}
