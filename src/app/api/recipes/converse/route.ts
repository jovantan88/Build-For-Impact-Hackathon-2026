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

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { transcript, model: requestedModel } = body;

    if (!transcript || transcript.trim() === "") {
        return new Response(JSON.stringify({ error: "No transcript provided" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const model = requestedModel || MODEL_KEYS.SEA_LION;

    const { data: ingredients } = await supabase.from("ingredients").select("*").eq("user_id", user.id).eq("is_excluded", false);

    const { data: pantryStaples } = await supabase.from("pantry_staples").select("*").eq("user_id", user.id).eq("is_enabled", true);

    const ingredientNames = (ingredients || []).map((i) => i.name);
    const stapleNames = (pantryStaples || []).map((s) => s.name);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                controller.enqueue(encoder.encode(`event: search_start\ndata: {}\n\n`));

                const searchResults = await searchRecipesForClient(ingredientNames);
                controller.enqueue(encoder.encode(`event: search_results\ndata: ${JSON.stringify(searchResults)}\n\n`));

                const recipeContext =
                    searchResults.length > 0
                        ? `Here are some real recipes for reference:\n${searchResults.map((r, i) => `--- Recipe ${i + 1}: ${r.title} ---\nSource: ${r.url}\n${r.text}`).join("\n\n")}`
                        : "";

                const systemPrompt = `You are a Southeast Asian culinary expert. Generate practical, delicious recipes based on the user's voice request.

You specialize in cuisines from Singapore, Malaysia, Indonesia, Thailand, Vietnam, and Philippines.

${recipeContext}

The user has these ingredients available in their fridge: ${ingredientNames.length > 0 ? ingredientNames.join(", ") : "Various common ingredients"}
Pantry staples available: ${stapleNames.length > 0 ? stapleNames.join(", ") : "Salt, pepper, oil, rice, garlic, onion"}

You MUST respond with valid JSON only. No markdown code blocks, no explanations.`;

                const recipeFormat = `{"recipes":[{"id":"1","title":"Recipe Name","cuisineStyle":["Malaysian"],"ingredients":[{"name":"chicken","quantity":500,"unit":"g","available":true}],"missingIngredients":[{"name":"lemongrass","quantity":2,"unit":"stalks"}],"instructions":["Step 1","Step 2","Step 3","Step 4","Step 5","Step 6"],"cookTime":"30 mins","servings":4}]}`;

                const userPrompt = `The user said: "${transcript}"

Based on this voice request, generate 3 DETAILED recipes that match what they're asking for.

Rules:
- Match the user's request (cuisine type, dish preference, dietary restrictions, etc.)
- Mark ingredients as available:true if they're in the user's fridge, available:false otherwise
- Include 6-8 detailed instruction steps per recipe
- Specify exact quantities and measurements
- If they mentioned specific ingredients, try to use those
- If they mentioned a cuisine or dish type, focus on that

Respond with JSON in this format: ${recipeFormat}`;

                const messages = [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ];

                console.log(messages)

                controller.enqueue(encoder.encode(`event: generation_start\ndata: {"model":"${model}"}\n\n`));

                let fullResponse = "";
                let modelUsed = "";

                if (model === MODEL_KEYS.SEA_LION && CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_API_TOKEN) {
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
                                }
                            }
                        }
                    }
                } else {
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
                            transcript,
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