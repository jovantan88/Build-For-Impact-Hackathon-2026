import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchRecipesForClient } from "@/lib/ai/recipes";
import OpenAI from "openai";
import { OPENAI_MODELS, CLOUDFLARE_MODELS, MODEL_KEYS, MODEL_DISPLAY_NAMES } from "@/lib/ai/models";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    const { searchParams } = new URL(request.url);
    const mode = (searchParams.get("mode") as "cook_now" | "buy_more") || "cook_now";
    const model = searchParams.get("model") || MODEL_KEYS.SEA_LION;

    // Get user's ingredients
    const { data: ingredients } = await supabase.from("ingredients").select("*").eq("user_id", user.id).eq("is_excluded", false);

    // Get user's pantry staples
    const { data: pantryStaples } = await supabase.from("pantry_staples").select("*").eq("user_id", user.id).eq("is_enabled", true);

    const ingredientNames = (ingredients || []).map((i) => {
        let name = i.name;
        if (i.quantity) {
            name += ` (${i.quantity}${i.unit ? " " + i.unit : ""})`;
        }
        return name;
    });

    const stapleNames = (pantryStaples || []).map((s) => s.name);
    const allIngredients = [...ingredientNames, ...stapleNames];

    // Create a streaming response
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // Step 1: Send search results first
                controller.enqueue(encoder.encode(`event: search_start\ndata: {}\n\n`));

                const searchResults = await searchRecipesForClient(allIngredients);
                controller.enqueue(encoder.encode(`event: search_results\ndata: ${JSON.stringify(searchResults)}\n\n`));

                // Build prompts
                const recipeContext =
                    searchResults.length > 0
                        ? `Here are some real recipes for reference:\n${searchResults.map((r, i) => `--- Recipe ${i + 1}: ${r.title} ---\nSource: ${r.url}\n${r.text}`).join("\n\n")}`
                        : "";

                const systemPrompt = `You are a Southeast Asian culinary expert. Generate practical, delicious recipes.

${recipeContext}

You MUST respond with valid JSON only. No markdown code blocks.`;

                const recipeFormat = `{"recipes":[{"id":"1","title":"Recipe Name","cuisineStyle":["Malaysian"],"ingredients":[{"name":"chicken","quantity":500,"unit":"g","available":true}],"missingIngredients":[],"instructions":["Step 1","Step 2"],"cookTime":"30 mins","servings":4}]}`;

                const userPrompt =
                    mode === "cook_now"
                        ? `Generate 3 DETAILED recipes using ONLY these ingredients.
Available: ${ingredientNames.join(", ") || "None"}
Pantry: ${stapleNames.join(", ") || "Salt, pepper, oil, rice"}
Rules: missingIngredients must be empty [], 6-8 detailed steps.
JSON format: ${recipeFormat}`
                        : `Generate 3 DETAILED recipes with a few extra items.
Available: ${ingredientNames.join(", ") || "None"}
Pantry: ${stapleNames.join(", ") || "Salt, pepper, oil, rice"}
Rules: Max 3 items in missingIngredients, 6-8 detailed steps.
JSON format: ${recipeFormat}`;

                const messages = [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ];

                // Step 2: Stream recipe generation
                controller.enqueue(encoder.encode(`event: generation_start\ndata: {"model":"${model}"}\n\n`));

                let fullResponse = "";
                let modelUsed = "";

                if (model === MODEL_KEYS.SEA_LION && CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_API_TOKEN) {
                    // Use Cloudflare Workers AI streaming
                    modelUsed = MODEL_DISPLAY_NAMES.SEA_LION_WITH_SEARCH;

                    const response = await fetch(
                        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${CLOUDFLARE_MODELS.SEA_LION}`,
                        {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                messages,
                                max_tokens: 4000,
                                temperature: 0.7,
                                stream: true,
                            }),
                        },
                    );

                    if (!response.ok || !response.body) {
                        throw new Error("SEA-LION streaming failed");
                    }

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split("\n");

                        for (const line of lines) {
                            if (line.startsWith("data: ")) {
                                const data = line.slice(6);
                                if (data === "[DONE]") continue;

                                try {
                                    const parsed = JSON.parse(data);
                                    const content = parsed.response || parsed.choices?.[0]?.delta?.content || "";
                                    if (content) {
                                        fullResponse += content;
                                        controller.enqueue(encoder.encode(`event: chunk\ndata: ${JSON.stringify({ content })}\n\n`));
                                    }
                                } catch {
                                    // Skip unparseable chunks
                                }
                            }
                        }
                    }
                } else {
                    // Use OpenAI streaming
                    modelUsed = MODEL_DISPLAY_NAMES.GPT_WITH_SEARCH;

                    const stream = await openai.chat.completions.create({
                        model: OPENAI_MODELS.GPT_5_MINI,
                        messages: messages.map((m) => ({
                            role: m.role as "system" | "user" | "assistant",
                            content: m.content,
                        })),
                        response_format: { type: "json_object" },
                        stream: true,
                    });

                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || "";
                        if (content) {
                            fullResponse += content;
                            controller.enqueue(encoder.encode(`event: chunk\ndata: ${JSON.stringify({ content })}\n\n`));
                        }
                    }
                }

                // Step 3: Parse and send final result
                let recipes = [];
                try {
                    let jsonStr = fullResponse.trim();
                    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
                    if (jsonMatch) jsonStr = jsonMatch[1].trim();
                    const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
                    if (jsonObjectMatch) jsonStr = jsonObjectMatch[0];

                    const parsed = JSON.parse(jsonStr);
                    recipes = parsed.recipes || [];
                } catch (e) {
                    console.error("Parse error:", e);
                }

                controller.enqueue(
                    encoder.encode(
                        `event: complete\ndata: ${JSON.stringify({
                            recipes,
                            modelUsed,
                            searchResults,
                        })}\n\n`,
                    ),
                );
            } catch (error) {
                console.error("Stream error:", error);
                controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "Generation failed" })}\n\n`));
            } finally {
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
