import { createClient } from "@/lib/supabase/server";
import {
  generatePurchaseRecommendations,
  generateInsightSummary,
} from "@/lib/ai/waste-insights";
import type { WastePattern } from "@/types";

export async function GET(request: Request) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Create a streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Helper to send data
        const send = (data: any) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        };

        send({ type: "status", message: "Fetching waste patterns..." });

        // Get waste patterns
        const { data: wastePatterns, error: wasteError } = await supabase.rpc(
          "analyze_waste_patterns",
          { target_user_id: user.id }
        );

        if (wasteError) {
          send({ type: "error", message: "Failed to fetch waste patterns" });
          controller.close();
          return;
        }

        // Transform snake_case to camelCase
        const patterns: WastePattern[] = (wastePatterns || []).map((p: any) => ({
          ingredientName: p.ingredient_name,
          wasteCount: p.waste_count,
          totalCount: p.total_count,
          wasteFrequency: p.waste_frequency,
        }));

        send({ type: "patterns", data: patterns, count: patterns.length });

        // Get all waste events for aggregation
        const { data: allWasteEvents } = await supabase
          .from("waste_events")
          .select("*")
          .eq("user_id", user.id)
          .gte(
            "waste_date",
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          )
          .in("event_type", ["expired", "discarded"]);

        // Aggregate waste events
        const wasteByIngredient = new Map<
          string,
          { count: number; total: number }
        >();

        if (allWasteEvents) {
          const { data: allEvents } = await supabase
            .from("waste_events")
            .select("ingredient_name, event_type")
            .eq("user_id", user.id)
            .gte(
              "waste_date",
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
            );

          const totalByIngredient = new Map<string, number>();
          if (allEvents) {
            allEvents.forEach((event) => {
              const name = event.ingredient_name.toLowerCase();
              totalByIngredient.set(name, (totalByIngredient.get(name) || 0) + 1);
            });
          }

          allWasteEvents.forEach((event) => {
            const name = event.ingredient_name.toLowerCase();
            const current = wasteByIngredient.get(name) || {
              count: 0,
              total: 0,
            };
            wasteByIngredient.set(name, {
              count: current.count + 1,
              total: totalByIngredient.get(name) || current.count + 1,
            });
          });
        }

        const allMostWastedItems = Array.from(wasteByIngredient.entries())
          .map(([name, data]) => ({
            name,
            count: data.count,
            frequency: data.count / data.total,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        const mostWastedItems =
          patterns.length > 0
            ? patterns.slice(0, 5).map((p) => ({
                name: p.ingredientName,
                count: p.wasteCount,
                frequency: p.wasteFrequency,
              }))
            : allMostWastedItems;

        const totalWasteCount =
          patterns.length > 0
            ? patterns.reduce((sum, p) => sum + p.wasteCount, 0)
            : allMostWastedItems.reduce((sum, item) => sum + item.count, 0);

        const totalSavingsPotential = totalWasteCount * 4;

        send({
          type: "stats",
          data: { totalWasteCount, totalSavingsPotential, mostWastedItems },
        });

        // Generate recommendations from patterns OR from all wasted items
        let patternsForAI: WastePattern[];
        
        if (patterns.length > 0) {
          patternsForAI = patterns;
        } else if (allMostWastedItems.length > 0) {
          patternsForAI = allMostWastedItems.map(item => ({
            ingredientName: item.name,
            wasteCount: item.count,
            totalCount: item.count,
            wasteFrequency: item.frequency,
          }));
        } else {
          patternsForAI = [];
        }

        // Generate recommendations if we have any waste data
        if (patternsForAI.length > 0) {
          send({
            type: "status",
            message: "Generating personalized recommendations...",
          });

          const aiRecommendations = await generatePurchaseRecommendations({
            wastePatterns: patternsForAI,
          });

          // Send recommendations one by one
          for (let i = 0; i < aiRecommendations.length; i++) {
            const rec = aiRecommendations[i];
            if (!rec.ingredientName) continue;

            const pattern = patternsForAI.find(
              (p) =>
                p.ingredientName?.toLowerCase() ===
                rec.ingredientName?.toLowerCase()
            );

            if (pattern) {
              // Save to database
              const { data: upsertData, error: upsertError } = await supabase
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
                  { onConflict: "user_id,ingredient_name" }
                );

              if (upsertError) {
                console.error(`Failed to save recommendation for ${rec.ingredientName}:`, upsertError);
              }

              // Stream the recommendation
              send({
                type: "recommendation",
                data: {
                  ...rec,
                  wasteCount: pattern.wasteCount,
                  totalCount: pattern.totalCount,
                  wasteFrequency: pattern.wasteFrequency,
                },
                progress: {
                  current: i + 1,
                  total: aiRecommendations.length,
                },
              });
            }
          }
        }

        // Generate insight summary
        send({ type: "status", message: "Generating insight summary..." });

        const insightSummary = await generateInsightSummary(
          totalWasteCount,
          mostWastedItems,
          totalSavingsPotential
        );

        // Update hash and save insights
        const { data: currentHash } = await supabase.rpc(
          "calculate_waste_data_hash",
          { target_user_id: user.id }
        );

        await supabase.from("shopping_insights").upsert({
          user_id: user.id,
          total_waste_events: patterns.reduce(
            (sum, p) => sum + p.wasteCount,
            0
          ),
          most_wasted_items: mostWastedItems,
          total_savings_potential: totalSavingsPotential,
          insight_summary: insightSummary,
          last_analyzed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          waste_data_hash: currentHash,
          force_regenerate: false,
        });

        send({
          type: "summary",
          data: {
            insightSummary,
            totalWasteEvents: totalWasteCount,
            mostWastedItems,
            totalSavingsPotential,
          },
        });

        send({ type: "complete" });
        controller.close();
      } catch (error) {
        console.error("Streaming error:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: "Generation failed" })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
