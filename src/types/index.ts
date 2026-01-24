export interface ReceiptItem {
  name: string;
  quantity?: number;
  unit?: string;
  isIngredient: boolean;
}

export interface ParsedReceipt {
  items: ReceiptItem[];
  excludedItems: ReceiptItem[];
}

export interface IngredientWithExpiry {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  needsExpiryDate: boolean;
  expiryDate?: Date;
}

export interface Recipe {
  id: string;
  title: string;
  cuisineStyle: string[];
  ingredients: {
    name: string;
    quantity?: number;
    unit?: string;
    available: boolean;
  }[];
  missingIngredients: {
    name: string;
    quantity?: number;
    unit?: string;
  }[];
  instructions: string[];
  cookTime?: string;
  servings?: number;
  imageUrl?: string;
}

export interface FridgeItem {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  expiryDate?: Date;
  imageUrl?: string;
  imageStatus: "pending" | "generating" | "ready";
  isPantryStaple: boolean;
  daysUntilExpiry?: number;
}

export interface WasteEvent {
  id: string;
  userId: string;
  ingredientName: string;
  quantity?: number;
  unit?: string;
  eventType: "expired" | "discarded" | "used";
  originalPurchaseDate?: Date;
  wasteDate: Date;
  notes?: string;
}

export interface PurchaseRecommendation {
  id: string;
  userId: string;
  ingredientName: string;
  recommendationType: "reduce" | "skip" | "substitute" | "freeze" | "buy_less";
  wasteFrequency: number; // 0-1, e.g., 0.75 = wasted 3 out of 4 times
  totalOccurrences: number;
  wastedOccurrences: number;
  suggestion: string;
  substituteWith?: string;
  isActive: boolean;
  isDismissed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShoppingInsights {
  id: string;
  userId: string;
  totalWasteEvents: number;
  mostWastedItems: {
    name: string;
    count: number;
    frequency: number;
  }[];
  totalSavingsPotential: number;
  insightSummary?: string;
  lastAnalyzedAt?: Date;
}

export interface WastePattern {
  ingredientName: string;
  wasteCount: number;
  totalCount: number;
  wasteFrequency: number;
}

// Items that typically expire quickly and need expiry date prompts
export const QUICK_EXPIRY_ITEMS = [
  "milk",
  "yogurt",
  "cream",
  "cheese",
  "butter",
  "eggs",
  "meat",
  "chicken",
  "beef",
  "pork",
  "fish",
  "seafood",
  "shrimp",
  "tofu",
  "tempeh",
  "bread",
  "vegetables",
  "fruits",
  "lettuce",
  "spinach",
  "herbs",
  "cilantro",
  "basil",
  "mint",
  "sprouts",
  "mushrooms",
  "berries",
  "salad",
  "deli",
  "sausage",
  "bacon",
  "ham",
];

// Default pantry staples for SEA cooking
export const DEFAULT_PANTRY_STAPLES = [
  "Salt",
  "Pepper",
  "Sugar",
  "Rice",
  "Cooking oil",
  "Soy sauce",
  "Fish sauce",
  "Oyster sauce",
  "Sesame oil",
  "Garlic",
  "Onion",
  "Ginger",
  "Chili",
  "Vinegar",
  "Coconut milk",
  "Curry powder",
  "Turmeric",
  "Cumin",
  "Coriander",
  "Lemongrass",
];
