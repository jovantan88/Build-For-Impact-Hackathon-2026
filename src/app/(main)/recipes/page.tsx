"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChefHat, Clock, Users, ShoppingCart, Check, RefreshCw, Sparkles, Mic } from "lucide-react";
import { toast } from "sonner";
import { MODEL_KEYS, MODEL_DISPLAY_NAMES } from "@/lib/ai/models";
import { ConverseDialog } from "@/components/converse-dialog";

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

interface SearchResult {
    title: string;
    url: string;
    text: string;
}

interface CachedRecipes {
    recipes: Recipe[];
    searchResults: SearchResult[];
    modelUsed: string;
    timestamp: number;
}

const CACHE_KEY_PREFIX = "efridge_recipes_";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCacheKey(mode: string, model: string): string {
    return `${CACHE_KEY_PREFIX}${mode}_${model}`;
}

function getFromCache(mode: string, model: string): CachedRecipes | null {
    try {
        const key = getCacheKey(mode, model);
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const data = JSON.parse(cached) as CachedRecipes;
        if (Date.now() - data.timestamp > CACHE_DURATION) {
            localStorage.removeItem(key);
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

function setCache(mode: string, model: string, data: Omit<CachedRecipes, "timestamp">): void {
    try {
        const key = getCacheKey(mode, model);
        localStorage.setItem(key, JSON.stringify({ ...data, timestamp: Date.now() }));
    } catch {
        // localStorage might be full
    }
}

export default function RecipesPage() {
    const [activeTab, setActiveTab] = useState<"cook_now" | "buy_more">("cook_now");
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [useSeaLion, setUseSeaLion] = useState(true);
    const [currentModel, setCurrentModel] = useState<string>("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null);
    const [streamingText, setStreamingText] = useState<string>("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [converseDialogOpen, setConverseDialogOpen] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchRecipesStreaming = useCallback(async (mode: "cook_now" | "buy_more", seaLion: boolean, forceRefresh = false) => {
        const modelKey = seaLion ? MODEL_KEYS.SEA_LION : MODEL_KEYS.GPT;

        // Check cache first (unless force refresh)
        if (!forceRefresh) {
            const cached = getFromCache(mode, modelKey);
            if (cached) {
                setRecipes(cached.recipes);
                setSearchResults(cached.searchResults);
                setCurrentModel(cached.modelUsed + " (cached)");
                setLoading(false);
                return;
            }
        }

        // Abort any existing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setLoading(true);
        setIsStreaming(true);
        setStreamingText("");
        setSearchResults([]);
        setRecipes([]);

        try {
            const response = await fetch(`/api/recipes/stream?mode=${mode}&model=${modelKey}`, { signal: abortControllerRef.current.signal });

            if (!response.ok || !response.body) {
                throw new Error("Failed to start stream");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.trim()) continue;

                    const eventMatch = line.match(/event: (\w+)/);
                    const dataMatch = line.match(/data: ([\s\S]+)/);

                    if (!eventMatch || !dataMatch) continue;

                    const eventType = eventMatch[1];
                    const data = dataMatch[1];

                    switch (eventType) {
                        case "search_start":
                            // Search started
                            break;

                        case "search_results":
                            try {
                                const results = JSON.parse(data);
                                setSearchResults(results);
                            } catch {}
                            break;

                        case "generation_start":
                            // Generation started
                            break;

                        case "chunk":
                            try {
                                const { content } = JSON.parse(data);
                                setStreamingText((prev) => prev + content);
                            } catch {}
                            break;

                        case "complete":
                            try {
                                const { recipes: finalRecipes, modelUsed, searchResults: finalSearch } = JSON.parse(data);
                                setRecipes(finalRecipes);
                                setCurrentModel(modelUsed);
                                setSearchResults(finalSearch);

                                // Cache the results
                                setCache(mode, modelKey, {
                                    recipes: finalRecipes,
                                    searchResults: finalSearch,
                                    modelUsed,
                                });
                            } catch {}
                            setIsStreaming(false);
                            break;

                        case "error":
                            toast.error("Failed to generate recipes");
                            setIsStreaming(false);
                            break;
                    }
                }
            }
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                // Request was aborted, ignore
                return;
            }
            console.error("Streaming error:", error);
            toast.error("Failed to generate recipes");
        } finally {
            setLoading(false);
            setIsStreaming(false);
        }
    }, []);

    useEffect(() => {
        fetchRecipesStreaming(activeTab, useSeaLion);

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [activeTab, fetchRecipesStreaming, useSeaLion]);

    const handleRefresh = () => {
        fetchRecipesStreaming(activeTab, useSeaLion, true);
    };

    const handleModelToggle = (checked: boolean) => {
        setUseSeaLion(checked);
    };

    const handleConverseRecipes = (newRecipes: Recipe[], newSearchResults: SearchResult[], modelUsed: string) => {
        setRecipes(newRecipes);
        setSearchResults(newSearchResults);
        setCurrentModel(modelUsed + " (voice)");
        setLoading(false);
        setIsStreaming(false);
    };

    const handleGenerateImage = useCallback(async (recipe: Recipe) => {
        console.log(`Generating image for: ${recipe.title}`);
        try {
            const res = await fetch("/api/recipes/image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dishName: recipe.title,
                    cuisineStyle: recipe.cuisineStyle,
                }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error(`Image API error for ${recipe.title}:`, res.status, errorText);
                return;
            }

            const data = await res.json();

            if (data.imageUrl) {
                console.log(`Image generated successfully for: ${recipe.title}`);
                setRecipes((prevRecipes) => prevRecipes.map((r) => (r.id === recipe.id ? { ...r, imageUrl: data.imageUrl } : r)));
                setSelectedRecipe((prev) => (prev?.id === recipe.id ? { ...prev, imageUrl: data.imageUrl } : prev));
            } else {
                console.error(`No imageUrl in response for ${recipe.title}:`, data);
            }
        } catch (error) {
            console.error(`Failed to generate image for ${recipe.title}:`, error);
        }
    }, []);

    // Track which recipe IDs we've already started generating images for
    const generatingImagesRef = useRef<Set<string>>(new Set());

    // Automatically generate images for all recipes in parallel when ready
    useEffect(() => {
        const generateMissingImages = async () => {
            // Wait for loading to complete
            if (isStreaming || loading) return;
            
            // Need recipes to exist
            if (recipes.length === 0) return;

            const recipesWithoutImages = recipes.filter((r) => !r.imageUrl && !generatingImagesRef.current.has(r.id));
            if (recipesWithoutImages.length === 0) return;

            console.log(`Auto-generating images for ${recipesWithoutImages.length} recipes...`);

            // Mark all as generating
            recipesWithoutImages.forEach(recipe => generatingImagesRef.current.add(recipe.id));
            setGeneratingImageFor("all");

            // Generate all images in parallel for faster loading
            const results = await Promise.allSettled(
                recipesWithoutImages.map(recipe => handleGenerateImage(recipe))
            );

            console.log(`Image generation complete. Success: ${results.filter(r => r.status === 'fulfilled').length}, Failed: ${results.filter(r => r.status === 'rejected').length}`);

            setGeneratingImageFor(null);
        };

        // Use setTimeout to ensure this runs after the component has fully updated
        const timeout = setTimeout(() => {
            generateMissingImages();
        }, 100);

        return () => clearTimeout(timeout);
    }, [recipes, isStreaming, loading, handleGenerateImage]);

    // Clear the ref when recipes change entirely (e.g., tab switch or refresh)
    useEffect(() => {
        generatingImagesRef.current.clear();
    }, [activeTab, useSeaLion]);

    const RecipeCard = ({ recipe }: { recipe: Recipe }) => (
        <Card className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden" onClick={() => setSelectedRecipe(recipe)}>
            <div className="h-40 bg-gradient-to-br from-amber-100 to-orange-100 relative">
                {recipe.imageUrl ? (
                    <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        {generatingImageFor === "all" ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 border-3 border-amber-300 border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs text-amber-600">Generating...</span>
                            </div>
                        ) : (
                            <ChefHat className="w-12 h-12 text-amber-300" />
                        )}
                    </div>
                )}
            </div>
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-1">{recipe.title}</CardTitle>
                </div>
                <div className="flex flex-wrap gap-1">
                    {recipe.cuisineStyle?.slice(0, 2).map((style) => (
                        <Badge key={style} variant="secondary" className="text-xs">
                            {style}
                        </Badge>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    {recipe.cookTime && (
                        <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {recipe.cookTime}
                        </span>
                    )}
                    {recipe.servings && (
                        <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {recipe.servings}
                        </span>
                    )}
                </div>

                {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-500">
                        <ShoppingCart className="w-3 h-3" />
                        <span className="text-xs">Need {recipe.missingIngredients.length} more</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    const RecipeSkeleton = () => (
        <Card className="overflow-hidden">
            <Skeleton className="h-40 w-full" />
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

    const SearchResultText = ({ result }: { result: SearchResult }) => (
        <div className="flex items-start gap-2 text-sm">
            <span className="text-muted-foreground">•</span>
            <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
            >
                {result.title}
            </a>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Recipes</h1>
                    <p className="text-muted-foreground">AI-generated recipes based on your ingredients</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading || isStreaming}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading || isStreaming ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* Model Toggle */}
            <Card className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <div>
                            <Label htmlFor="model-toggle" className="font-medium">
                                AI Model
                            </Label>
                            <p className="text-xs text-muted-foreground">{useSeaLion ? MODEL_DISPLAY_NAMES.SEA_LION : MODEL_DISPLAY_NAMES.GPT}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-sm ${!useSeaLion ? "font-medium" : "text-muted-foreground"}`}>{MODEL_DISPLAY_NAMES.GPT_SHORT}</span>
                        <Switch id="model-toggle" checked={useSeaLion} onCheckedChange={handleModelToggle} />
                        <span className={`text-sm ${useSeaLion ? "font-medium" : "text-muted-foreground"}`}>{MODEL_DISPLAY_NAMES.SEA_LION_SHORT}</span>
                    </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-primary" />
                        <span className="text-sm text-muted-foreground">Describe what you want to cook</span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConverseDialogOpen(true)}
                        disabled={loading || isStreaming}
                    >
                        <Mic className="w-4 h-4 mr-2" />
                        Converse
                    </Button>
                </div>
                {currentModel && <p className="text-xs text-muted-foreground mt-2">Last generated with: {currentModel}</p>}
            </Card>

            {/* Search Results - Text List */}
            {searchResults.length > 0 && (
                <div className="space-y-2 pb-2">
                    <div className="text-sm text-muted-foreground">
                        Similar recipes found online:
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                        {searchResults.map((result) => (
                            <SearchResultText key={result.url} result={result} />
                        ))}
                    </div>
                </div>
            )}

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "cook_now" | "buy_more")}>
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
                    <p className="text-sm text-muted-foreground mb-4">Recipes you can make with ingredients you already have</p>
                    {loading && !isStreaming ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {[...Array(3)].map((_, i) => (
                                <RecipeSkeleton key={i} />
                            ))}
                        </div>
                    ) : recipes.length === 0 && !isStreaming ? (
                        <Card className="p-8 text-center">
                            <ChefHat className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="font-medium text-foreground">No recipes found</h3>
                            <p className="text-sm text-muted-foreground mt-1">Add more ingredients to your fridge to get recipe suggestions</p>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {recipes.map((recipe) => (
                                <RecipeCard key={recipe.id} recipe={recipe} />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="buy_more" className="mt-4">
                    <p className="text-sm text-muted-foreground mb-4">Recipes you can make with just a few more items</p>
                    {loading && !isStreaming ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {[...Array(3)].map((_, i) => (
                                <RecipeSkeleton key={i} />
                            ))}
                        </div>
                    ) : recipes.length === 0 && !isStreaming ? (
                        <Card className="p-8 text-center">
                            <ChefHat className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="font-medium text-foreground">No recipes found</h3>
                            <p className="text-sm text-muted-foreground mt-1">Add more ingredients to your fridge to get recipe suggestions</p>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {recipes.map((recipe) => (
                                <RecipeCard key={recipe.id} recipe={recipe} />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Streaming Text Preview */}
            {isStreaming && streamingText && (
                <Card className="p-4 bg-muted">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        <span className="text-sm font-medium text-foreground">Generating recipes...</span>
                    </div>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">{streamingText.slice(-500)}</pre>
                </Card>
            )}

            {/* Recipe Detail Dialog */}
            <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
                <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                    {selectedRecipe && (
                        <>
                            <div className="h-48 -mx-6 -mt-6 mb-4 bg-gradient-to-br from-amber-100 to-orange-100 relative">
                                {selectedRecipe.imageUrl ? (
                                    <img src={selectedRecipe.imageUrl} alt={selectedRecipe.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        {generatingImageFor === "all" ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-12 h-12 border-3 border-amber-300 border-t-transparent rounded-full animate-spin" />
                                                <span className="text-sm text-amber-600">Generating image...</span>
                                            </div>
                                        ) : (
                                            <ChefHat className="w-16 h-16 text-amber-300" />
                                        )}
                                    </div>
                                )}
                            </div>

                            <DialogHeader>
                                <DialogTitle className="text-xl">{selectedRecipe.title}</DialogTitle>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {selectedRecipe.cuisineStyle?.map((style) => (
                                        <Badge key={style} variant="secondary">
                                            {style}
                                        </Badge>
                                    ))}
                                </div>
                            </DialogHeader>

                            <div className="space-y-6">
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
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

                                <div>
                                    <h3 className="font-semibold text-foreground mb-2">Ingredients</h3>
                                    <ul className="space-y-1">
                                        {selectedRecipe.ingredients?.map((ing, idx) => (
                                            <li key={idx} className="flex items-center gap-2 text-sm">
                                                <span className={`w-2 h-2 rounded-full ${ing.available ? "bg-primary" : "bg-muted-foreground"}`} />
                                                <span className={ing.available ? "" : "text-muted-foreground"}>
                                                    {ing.quantity} {ing.unit} {ing.name}
                                                </span>
                                                {ing.available && (
                                                    <Badge variant="outline" className="text-xs text-primary">
                                                        Have
                                                    </Badge>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {selectedRecipe.missingIngredients && selectedRecipe.missingIngredients.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-amber-700 dark:text-amber-500 mb-2 flex items-center gap-2">
                                            <ShoppingCart className="w-4 h-4" />
                                            Shopping List
                                        </h3>
                                        <ul className="space-y-1">
                                            {selectedRecipe.missingIngredients.map((ing, idx) => (
                                                <li key={idx} className="text-sm text-amber-700 dark:text-amber-500">
                                                    {ing.quantity} {ing.unit} {ing.name}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div>
                                    <h3 className="font-semibold text-foreground mb-2">Instructions</h3>
                                    <ol className="space-y-3">
                                        {selectedRecipe.instructions?.map((step, idx) => (
                                            <li key={idx} className="flex gap-3 text-sm">
                                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-foreground">{step}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Converse Dialog */}
            <ConverseDialog
                open={converseDialogOpen}
                onOpenChange={setConverseDialogOpen}
                useSeaLion={useSeaLion}
                onRecipesGenerated={handleConverseRecipes}
            />
        </div>
    );
}
