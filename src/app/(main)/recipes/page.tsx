"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChefHat,
  Clock,
  Users,
  ShoppingCart,
  Check,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface RecipeIngredient {
  name: string;
  quantity?: number;
  unit?: string;
  available: boolean;
}

interface Recipe {
  id: string;
  title: string;
  cuisineStyle: string[];
  ingredients: RecipeIngredient[];
  missingIngredients: { name: string; quantity?: number; unit?: string }[];
  instructions: string[];
  cookTime?: string;
  servings?: number;
  imageUrl?: string;
}

export default function RecipesPage() {
  const [activeTab, setActiveTab] = useState<"cook_now" | "buy_more">(
    "cook_now",
  );
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [useSeaLion, setUseSeaLion] = useState(true);
  const [currentModel, setCurrentModel] = useState<string>("");

  useEffect(() => {
    fetchRecipes(activeTab, useSeaLion);
  }, [activeTab]);

  const fetchRecipes = async (
    mode: "cook_now" | "buy_more",
    seaLion: boolean,
  ) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/recipes?mode=${mode}&model=${seaLion ? "sea-lion" : "gpt"}`,
      );
      const data = await res.json();

      if (res.ok) {
        setRecipes(data.recipes || []);
        setCurrentModel(data.model || "");
      } else {
        toast.error("Failed to generate recipes");
      }
    } catch (error) {
      console.error("Failed to fetch recipes:", error);
      toast.error("Failed to generate recipes");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchRecipes(activeTab, useSeaLion);
  };

  const handleModelToggle = (checked: boolean) => {
    setUseSeaLion(checked);
  };

  const RecipeCard = ({ recipe }: { recipe: Recipe }) => (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setSelectedRecipe(recipe)}
    >
      <div className="relative h-70 w-full overflow-hidden bg-gray-100">
        {recipe.imageUrl ? (
          <Image
            src={recipe.imageUrl}
            alt={recipe.title}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">
            <ChefHat className="w-10 h-10" />
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{recipe.title}</CardTitle>
          <ChefHat className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex flex-wrap gap-1">
          {recipe.cuisineStyle?.map((style) => (
            <Badge key={style} variant="secondary" className="text-xs">
              {style}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          {recipe.cookTime && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {recipe.cookTime}
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {recipe.servings} servings
            </span>
          )}
        </div>

        {/* Ingredients preview */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-700">
            {recipe.ingredients?.length || 0} ingredients
          </p>
          {recipe.missingIngredients &&
            recipe.missingIngredients.length > 0 && (
              <div className="flex items-center gap-1 text-amber-600">
                <ShoppingCart className="w-3 h-3" />
                <span className="text-xs">
                  Need {recipe.missingIngredients.length} more
                </span>
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );

  const RecipeSkeleton = () => (
    <Card>
      <Skeleton className="h-36 w-full" />
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-3/4" />
        <div className="flex gap-1 mt-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-1/2 mb-3" />
        <Skeleton className="h-3 w-1/3" />
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>
          <p className="text-gray-600">
            AI-generated recipes based on your ingredients
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Model Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <div>
              <Label htmlFor="model-toggle" className="font-medium">
                AI Model
              </Label>
              <p className="text-xs text-gray-500">
                {useSeaLion
                  ? "SEA-LION (Southeast Asian specialized)"
                  : "GPT-5 Mini (OpenAI)"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm ${!useSeaLion ? "font-medium" : "text-gray-400"}`}
            >
              GPT
            </span>
            <Switch
              id="model-toggle"
              checked={useSeaLion}
              onCheckedChange={handleModelToggle}
            />
            <span
              className={`text-sm ${useSeaLion ? "font-medium" : "text-gray-400"}`}
            >
              SEA-LION
            </span>
          </div>
        </div>
        {currentModel && (
          <p className="text-xs text-gray-400 mt-2">
            Last generated with: {currentModel}
          </p>
        )}
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "cook_now" | "buy_more")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cook_now" className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            Cook Now
          </TabsTrigger>
          <TabsTrigger value="buy_more" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Buy a Few More
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cook_now" className="mt-4">
          <p className="text-sm text-gray-500 mb-4">
            Recipes you can make with ingredients you already have
          </p>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <RecipeSkeleton key={i} />
              ))}
            </div>
          ) : recipes.length === 0 ? (
            <Card className="p-8 text-center">
              <ChefHat className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="font-medium text-gray-900">No recipes found</h3>
              <p className="text-sm text-gray-500 mt-1">
                Add more ingredients to your fridge to get recipe suggestions
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="buy_more" className="mt-4">
          <p className="text-sm text-gray-500 mb-4">
            Recipes you can make with just a few more items
          </p>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <RecipeSkeleton key={i} />
              ))}
            </div>
          ) : recipes.length === 0 ? (
            <Card className="p-8 text-center">
              <ChefHat className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="font-medium text-gray-900">No recipes found</h3>
              <p className="text-sm text-gray-500 mt-1">
                Add more ingredients to your fridge to get recipe suggestions
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Recipe Detail Dialog */}
      <Dialog
        open={!!selectedRecipe}
        onOpenChange={() => setSelectedRecipe(null)}
      >
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedRecipe && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {selectedRecipe.title}
                </DialogTitle>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedRecipe.cuisineStyle?.map((style) => (
                    <Badge key={style} variant="secondary">
                      {style}
                    </Badge>
                  ))}
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {selectedRecipe.imageUrl && (
                  <div className="relative h-70 w-full overflow-hidden rounded-lg bg-gray-100">
                    <Image
                      src={selectedRecipe.imageUrl}
                      alt={selectedRecipe.title}
                      fill
                      sizes="100vw"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
                {/* Meta info */}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {selectedRecipe.cookTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {selectedRecipe.cookTime}
                    </span>
                  )}
                  {selectedRecipe.servings && (
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {selectedRecipe.servings} servings
                    </span>
                  )}
                </div>

                {/* Ingredients */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Ingredients
                  </h3>
                  <ul className="space-y-1">
                    {selectedRecipe.ingredients?.map((ing, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            ing.available ? "bg-emerald-500" : "bg-gray-300"
                          }`}
                        />
                        <span className={ing.available ? "" : "text-gray-400"}>
                          {ing.quantity} {ing.unit} {ing.name}
                        </span>
                        {ing.available && (
                          <Badge
                            variant="outline"
                            className="text-xs text-emerald-600"
                          >
                            Have
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Missing Ingredients */}
                {selectedRecipe.missingIngredients &&
                  selectedRecipe.missingIngredients.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-amber-700 mb-2 flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" />
                        Shopping List
                      </h3>
                      <ul className="space-y-1">
                        {selectedRecipe.missingIngredients.map((ing, idx) => (
                          <li key={idx} className="text-sm text-amber-700">
                            {ing.quantity} {ing.unit} {ing.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Instructions */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Instructions
                  </h3>
                  <ol className="space-y-3">
                    {selectedRecipe.instructions?.map((step, idx) => (
                      <li key={idx} className="flex gap-3 text-sm">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-medium">
                          {idx + 1}
                        </span>
                        <span className="text-gray-700">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
