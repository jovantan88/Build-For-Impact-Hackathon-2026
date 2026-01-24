import OpenAI from "openai";
import type { WastePattern, PurchaseRecommendation } from "@/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GenerateRecommendationsInput {
  wastePatterns: WastePattern[];
  userContext?: {
    householdSize?: number;
    cookingFrequency?: string;
  };
}

interface GeneratedRecommendation {
  ingredientName: string;
  recommendationType: "reduce" | "skip" | "substitute" | "freeze" | "buy_less";
  suggestion: string;
  substituteWith?: string;
  estimatedSavings?: number;
}

/**
 * Uses AI to generate personalized purchase recommendations based on waste patterns
 */
export async function generatePurchaseRecommendations(
  input: GenerateRecommendationsInput,
): Promise<GeneratedRecommendation[]> {
  if (input.wastePatterns.length === 0) {
    return [];
  }

  const systemPrompt = `You are a sustainability and household management expert specializing in Southeast Asian food culture.

Your goal is to help people reduce food waste by providing actionable, culturally-aware shopping advice.

Consider:
- SEA cooking patterns (batch cooking, fresh ingredients, meal prep)
- Alternative storage methods (freezing, preserving)
- Common substitutions in SEA cuisine
- Practical portion sizes for households

Be empathetic and encouraging - food waste happens, and you're here to help optimize, not judge.`;

  const userPrompt = `Analyze these waste patterns and generate specific shopping recommendations:

${input.wastePatterns
  .map(
    (pattern) =>
      `- ${pattern.ingredientName}: wasted ${pattern.wasteCount} out of ${pattern.totalCount} times (${Math.round(pattern.wasteFrequency * 100)}%)`,
  )
  .join("\n")}

For each ingredient with high waste, provide:
1. A specific, actionable recommendation (reduce amount, skip this week, try frozen/preserved version, etc.)
2. If suggesting substitution, recommend a SEA-appropriate alternative
3. Brief reasoning that's helpful but not preachy

Return JSON array with this structure:
[
  {
    "ingredientName": "spinach",
    "recommendationType": "substitute",
    "suggestion": "Try frozen spinach instead - lasts months and works great in curries and stir-fries",
    "substituteWith": "frozen spinach",
    "estimatedSavings": 5.50
  },
  {
    "ingredientName": "milk",
    "recommendationType": "buy_less",
    "suggestion": "Buy half-size cartons or switch to UHT milk for longer shelf life",
    "estimatedSavings": 3.00
  }
]

Recommendation types:
- "reduce": Buy smaller portions
- "skip": Skip this week/reduce frequency
- "substitute": Use preserved/frozen/longer-lasting alternative
- "freeze": Buy fresh but freeze portions
- "buy_less": Reduce quantity per purchase

Keep suggestions practical, culturally relevant, and achievable.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    // Handle both array response and object with recommendations array
    const recommendations = Array.isArray(parsed)
      ? parsed
      : parsed.recommendations || [];

    return recommendations;
  } catch (error) {
    console.error("Failed to generate purchase recommendations:", error);
    // Return fallback recommendations based on frequency
    return input.wastePatterns.map((pattern) => {
      const frequency = pattern.wasteFrequency;
      
      if (frequency >= 0.75) {
        return {
          ingredientName: pattern.ingredientName,
          recommendationType: "skip" as const,
          suggestion: `You've wasted ${pattern.ingredientName} ${pattern.wasteCount} out of ${pattern.totalCount} times. Consider skipping it this week or buying a smaller portion.`,
        };
      } else if (frequency >= 0.5) {
        return {
          ingredientName: pattern.ingredientName,
          recommendationType: "buy_less" as const,
          suggestion: `Try buying half the usual amount of ${pattern.ingredientName} to reduce waste.`,
        };
      } else {
        return {
          ingredientName: pattern.ingredientName,
          recommendationType: "freeze" as const,
          suggestion: `Consider freezing portions of ${pattern.ingredientName} to extend shelf life.`,
        };
      }
    });
  }
}

/**
 * Generates a personalized insight summary based on overall waste patterns
 */
export async function generateInsightSummary(
  totalWasteEvents: number,
  mostWastedItems: { name: string; count: number; frequency: number }[],
  totalSavingsPotential: number,
): Promise<string> {
  if (totalWasteEvents === 0) {
    return "Great job! No waste patterns detected yet. Keep tracking your ingredients to get personalized insights.";
  }

  const systemPrompt = `You are an encouraging sustainability coach helping people understand their food waste patterns.

Create a brief, personalized insight (2-3 sentences max) that:
- Acknowledges their waste patterns without being judgmental
- Highlights the potential impact of making changes
- Encourages action with specific, achievable next steps

Keep it conversational, empathetic, and action-oriented.`;

  const userPrompt = `Generate an insight summary for:
- Total waste events: ${totalWasteEvents}
- Top wasted items: ${mostWastedItems.map((item) => `${item.name} (${item.count}x, ${Math.round(item.frequency * 100)}%)`).join(", ")}
- Potential monthly savings: $${totalSavingsPotential.toFixed(2)}

Write 2-3 sentences that are encouraging and actionable.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_completion_tokens: 150,
    });

    return (
      response.choices[0]?.message?.content ||
      `You've had ${totalWasteEvents} waste events. Following the recommendations could save you about $${totalSavingsPotential.toFixed(2)} per month.`
    );
  } catch (error) {
    console.error("Failed to generate insight summary:", error);
    return `You've had ${totalWasteEvents} waste events. Following the recommendations could save you about $${totalSavingsPotential.toFixed(2)} per month. Small changes can make a big difference!`;
  }
}
