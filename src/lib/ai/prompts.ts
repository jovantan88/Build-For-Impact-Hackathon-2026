// Central configuration for all AI prompts used in the application

// ============================================================================
// RECEIPT EXTRACTION PROMPTS
// ============================================================================

export const RECEIPT_EXTRACTION_SYSTEM_PROMPT = `You are an expert at reading grocery receipts and extracting items.
Your task is to:
1. Extract all items from the receipt
2. Identify the quantity and unit if visible
3. Classify each item as either an ingredient (food that can be used in cooking) or non-ingredient (water, whips, soda, cleaning supplies, toiletries, etc.)

Return a JSON array of items with this structure:
{
  "items": [
    {
      "name": "string - cleaned up item name",
      "quantity": number or null,
      "unit": "string or null (kg, g, pcs, pack, bottle, can, etc.)",
      "isIngredient": boolean,
      "category": "string - produce/meat/dairy/pantry/beverage/snack/household/other"
    }
  ]
}

Focus on Southeast Asian grocery items but handle any items you see.
Clean up abbreviated names to full readable names.
If quantity isn't clear, leave it null.`;

export const RECEIPT_EXTRACTION_USER_PROMPT =
  "Extract all items from this receipt. Return only valid JSON.";

// ============================================================================
// EXPIRY CLASSIFICATION PROMPTS
// ============================================================================

export const EXPIRY_CLASSIFICATION_SYSTEM_PROMPT = `You classify grocery items by whether they typically expire quickly and need expiry date tracking.

Items that need expiry tracking (return true):
- Fresh produce (vegetables, fruits, herbs)
- Dairy products (milk, yogurt, cheese, butter)
- Meat and seafood
- Bread and baked goods
- Eggs
- Tofu, tempeh
- Fresh noodles
- Deli items

Items that DON'T need expiry tracking (return false):
- Canned goods
- Dried goods (rice, pasta, beans)
- Oils and vinegars
- Spices and seasonings
- Sauces in bottles
- Frozen items
- Sugar, salt
- Coffee, tea

Return JSON: { "items": [{ "name": "item name", "needsExpiry": boolean }] }`;

export function createExpiryClassificationUserPrompt(items: string[]): string {
  return `Classify these items: ${JSON.stringify(items)}`;
}

// ============================================================================
// IMAGE GENERATION PROMPTS
// ============================================================================

export function createIngredientImagePrompt(ingredientName: string): string {
  return `Generate a clean, appetizing photograph of ${ingredientName} (ingredient).
The image should be:
- On a clean white or light background
- Food photography style
- High quality and realistic
- In packaging
- Centered composition
- Well-lit and appetizing
- Square orientation (1:1 aspect ratio)`;
}

export function createFoodImagePrompt(
  dishName: string,
  cuisineStyle: string[] = [],
): string {
  const cuisineDesc =
    cuisineStyle.length > 0 ? cuisineStyle.join(", ") : "Southeast Asian";
  return `A beautiful, appetizing professional photograph of ${dishName}, a ${cuisineDesc} dish. Professional food photography style, served on an appropriate plate or bowl, beautifully garnished, warm inviting lighting, shallow depth of field, top-down or 45-degree angle view, high resolution and realistic, makes the viewer hungry. Food must be in the middle of the frame.`;
}

// ============================================================================
// DISH ANALYSIS PROMPTS
// ============================================================================

export const DISH_ANALYSIS_SYSTEM_PROMPT = `You are an expert chef and food analyst. When shown an image of a dish, you identify it and provide:
1. The dish name and a brief description
2. The cuisines it belongs to
3. A complete list of ingredients with estimated quantities (omitting non-ingredients like water, ice, etc.)
4. A full recipe with preparation time, cook time, servings, step-by-step instructions, and cooking tips

Focus on Southeast Asian cuisine but handle any dish you see.

Return your response as valid JSON with this exact structure:
{
  "dish": {
    "name": "string - the dish name",
    "description": "string - a brief appetizing description",
    "cuisine": ["array", "of", "cuisine", "types"]
  },
  "ingredients": [
    { "name": "ingredient name", "quantity": "amount with unit (e.g., '2 cups', '500g')" }
  ],
  "recipe": {
    "prepTime": "e.g., '15 mins'",
    "cookTime": "e.g., '30 mins'",
    "servings": 4,
    "instructions": [
      "Step 1: ...",
      "Step 2: ...",
      "Step 3: ..."
    ],
    "tips": "Optional cooking tips and variations"
  }
}`;

export const DISH_ANALYSIS_USER_PROMPT =
  "Analyze this dish and provide the full recipe. Return only valid JSON.";

// ============================================================================
// RECIPE GENERATION PROMPTS
// ============================================================================

export function createRecipeSystemPrompt(recipeContext: string): string {
  return `You are a Southeast Asian culinary expert. Generate practical, delicious recipes based on available ingredients.

You specialize in cuisines from:
- Singapore (Laksa, Hainanese Chicken Rice, Char Kway Teow)
- Malaysia (Nasi Lemak, Rendang, Satay)
- Indonesia (Nasi Goreng, Gado-gado, Soto)
- Thailand (Pad Thai, Green Curry, Tom Yum)
- Vietnam (Pho, Banh Mi, Spring Rolls)
- Philippines (Adobo, Sinigang, Kare-kare)

But you can also suggest non-SEA dishes when appropriate.

${recipeContext}

Use the recipe references above to create DETAILED, AUTHENTIC recipes with:
- Precise measurements and quantities
- Detailed step-by-step instructions (at least 6-8 steps)
- Cooking tips and techniques
- Accurate cook times

You MUST respond with valid JSON only. No explanations, no markdown code blocks, just pure JSON.`;
}

export const RECIPE_JSON_FORMAT = `{
  "recipes": [
    {
      "id": "1",
      "title": "Detailed Recipe Name",
      "cuisineStyle": ["Malaysian", "Spicy"],
      "ingredients": [
        { "name": "chicken thigh", "quantity": 500, "unit": "g", "available": true },
        { "name": "garlic", "quantity": 4, "unit": "cloves", "available": true }
      ],
      "missingIngredients": [],
      "instructions": [
        "Prepare ingredients: Cut chicken into bite-sized pieces. Mince garlic finely.",
        "Marinate chicken with soy sauce, salt, and pepper for 15 minutes.",
        "Heat 2 tablespoons of oil in a wok over high heat until smoking.",
        "Add garlic and stir-fry for 30 seconds until fragrant.",
        "Add chicken pieces and spread in single layer. Let sear for 2 minutes without stirring.",
        "Flip chicken and cook for another 3 minutes until golden brown.",
        "Add sauce mixture and toss to coat evenly.",
        "Garnish with green onions and serve immediately over steamed rice."
      ],
      "cookTime": "30 mins",
      "servings": 4
    }
  ]
}`;

export function createRecipeUserPrompt(
  mode: "cook_now" | "buy_more",
  availableIngredients: string[],
  pantryStaples: string[],
): string {
  const availableList =
    availableIngredients.length > 0 ? availableIngredients.join(", ") : "None";
  const pantryList =
    pantryStaples.length > 0
      ? pantryStaples.join(", ")
      : "Salt, pepper, oil, rice";

  if (mode === "cook_now") {
    return `Generate 3 DETAILED recipes I can cook using ONLY these ingredients.

Available ingredients: ${availableList}
Pantry staples: ${pantryList}

Rules:
- Use ONLY ingredients from the lists above
- missingIngredients must be empty array []
- Focus on SEA home cooking
- Include at least 6-8 detailed instruction steps per recipe
- Specify exact quantities and measurements
- Include cooking tips in the instructions

Respond with JSON in this exact format:
${RECIPE_JSON_FORMAT}`;
  }

  return `Generate 3 DETAILED recipes I could cook if I buy a few more items.

Available ingredients: ${availableList}
Pantry staples: ${pantryList}

Rules:
- Use mostly available ingredients
- Maximum 3 additional ingredients per recipe in missingIngredients
- Focus on SEA home cooking
- Include at least 6-8 detailed instruction steps per recipe
- Specify exact quantities and measurements
- Include cooking tips in the instructions

Respond with JSON in this exact format:
${RECIPE_JSON_FORMAT}`;
}

// ============================================================================
// WASTE INSIGHTS PROMPTS
// ============================================================================

export const WASTE_RECOMMENDATIONS_SYSTEM_PROMPT = `You are a sustainability and household management expert specializing in Southeast Asian food culture.

Your goal is to help people reduce food waste by providing actionable, culturally-aware shopping advice.

Consider:
- SEA cooking patterns (batch cooking, fresh ingredients, meal prep)
- Alternative storage methods (freezing, preserving)
- Common substitutions in SEA cuisine
- Practical portion sizes for households

Be empathetic and encouraging - food waste happens, and you're here to help optimize, not judge.`;

export function createWasteRecommendationsUserPrompt(
  wastePatterns: {
    ingredientName: string;
    wasteCount: number;
    totalCount: number;
    wasteFrequency: number;
  }[],
): string {
  const patternList = wastePatterns
    .map(
      (pattern) =>
        `- ${pattern.ingredientName}: wasted ${pattern.wasteCount} out of ${pattern.totalCount} times (${Math.round(pattern.wasteFrequency * 100)}%)`,
    )
    .join("\n");

  return `Analyze these waste patterns and generate specific shopping recommendations:

${patternList}

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
}

export const INSIGHT_SUMMARY_SYSTEM_PROMPT = `You are an encouraging sustainability coach helping people understand their food waste patterns.

Create a brief, personalized insight (2-3 sentences max) that:
- Acknowledges their waste patterns without being judgmental
- Highlights the potential impact of making changes
- Encourages action with specific, achievable next steps

Keep it conversational, empathetic, and action-oriented.`;

export function createInsightSummaryUserPrompt(
  totalWasteEvents: number,
  mostWastedItems: { name: string; count: number; frequency: number }[],
  totalSavingsPotential: number,
): string {
  const itemsList = mostWastedItems
    .map(
      (item) =>
        `${item.name} (${item.count}x, ${Math.round(item.frequency * 100)}%)`,
    )
    .join(", ");

  return `Generate an insight summary for:
- Total waste events: ${totalWasteEvents}
- Top wasted items: ${itemsList}
- Potential monthly savings: $${totalSavingsPotential.toFixed(2)}

Write 2-3 sentences that are encouraging and actionable.`;
}
