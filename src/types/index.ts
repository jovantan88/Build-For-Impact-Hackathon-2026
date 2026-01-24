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
