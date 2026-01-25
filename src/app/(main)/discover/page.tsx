"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Check,
  X,
  Clock,
  Users,
  ChefHat,
} from "lucide-react";
import { toast } from "sonner";
import { DiscoverResult } from "@/types";

type AnalysisStage = "idle" | "uploading" | "analyzing" | "comparing" | "ready";

export default function DiscoverPage() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<AnalysisStage>("idle");
  const [result, setResult] = useState<DiscoverResult | null>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Resize image to reduce upload size
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_SIZE) {
          height = (height * MAX_SIZE) / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = (width * MAX_SIZE) / height;
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        setImage(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleAnalyze = async () => {
    if (!image) {
      toast.error("Please select an image first");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      setStage("uploading");
      await new Promise((resolve) => setTimeout(resolve, 500));

      setStage("analyzing");
      const res = await fetch("/api/discover/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });

      setStage("comparing");
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to analyze dish");
        setStage("idle");
        return;
      }

      setResult(data);
      setStage("ready");
      toast.success("Dish identified successfully!");
    } catch {
      toast.error("Something went wrong");
      setStage("idle");
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setImage(null);
    setResult(null);
    setStage("idle");
  };

  const getStageMessage = () => {
    switch (stage) {
      case "uploading":
        return "Uploading image...";
      case "analyzing":
        return "AI is analyzing the dish...";
      case "comparing":
        return "Comparing with your ingredients...";
      default:
        return "Analyze Dish";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Discover</h1>
        <p className="text-muted-foreground">
          Take a photo of any dish to find out what it is and how to make it
        </p>
      </div>

      {/* Image Upload Section */}
      {!result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Dish Photo
            </CardTitle>
            <CardDescription>
              Our AI will identify the dish and show you how to make it
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!image ? (
              <div className="border-2 border-dashed rounded-xl p-8 text-center border-border hover:border-primary/50 transition-colors">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      Take or upload a photo of a dish
                    </p>
                    <p className="text-sm text-muted-foreground">
                      We&apos;ll identify it and show you the recipe
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleInputChange}
                        className="hidden"
                      />
                      <Button variant="outline" asChild>
                        <span>
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Browse Files
                        </span>
                      </Button>
                    </label>
                    <label>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleInputChange}
                        className="hidden"
                      />
                      <Button variant="outline" asChild>
                        <span>
                          <Camera className="w-4 h-4 mr-2" />
                          Take Photo
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden border">
                  <img
                    src={image}
                    alt="Dish preview"
                    className="w-full max-h-80 object-contain bg-muted"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={resetState}
                    disabled={loading}
                  >
                    Choose Different Image
                  </Button>
                  <Button
                    className="flex-1 bg-primary hover:bg-primary/90"
                    onClick={handleAnalyze}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {getStageMessage()}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Analyze Dish
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {result && (
        <div className="space-y-4">
          {/* Dish Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{result.dish.name}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    {result.dish.cuisine.map((c) => (
                      <Badge key={c} variant="secondary">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={resetState}>
                  Try Another
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{result.dish.description}</p>
              {image && (
                <div className="mt-4 rounded-lg overflow-hidden border">
                  <img
                    src={image}
                    alt={result.dish.name}
                    className="w-full max-h-64 object-cover"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ingredients Comparison Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ingredients</CardTitle>
              <CardDescription>
                Compared with your fridge and pantry staples
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary */}
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1 text-green-600">
                  <Check className="w-4 h-4" />
                  <span>{result.ingredients.have.length} you have</span>
                </div>
                <div className="flex items-center gap-1 text-red-500">
                  <X className="w-4 h-4" />
                  <span>{result.ingredients.missing.length} you need</span>
                </div>
              </div>

              {/* Ingredients You Have */}
              {result.ingredients.have.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-600 mb-2">
                    You Have:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.ingredients.have.map((ing) => (
                      <Badge
                        key={ing}
                        variant="outline"
                        className="border-green-500 text-green-600 bg-green-50"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        {ing}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Ingredients You Need */}
              {result.ingredients.missing.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-500 mb-2">You Need:</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.ingredients.missing.map((ing) => (
                      <Badge
                        key={ing}
                        variant="outline"
                        className="border-red-400 text-red-500 bg-red-50"
                      >
                        <X className="w-3 h-3 mr-1" />
                        {ing}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Ingredient List */}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Full Ingredient List:</h4>
                <ul className="space-y-1 text-sm">
                  {result.ingredients.all.map((ing, i) => (
                    <li key={i} className="flex items-center gap-2">
                      {ing.available ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-red-400" />
                      )}
                      <span className={ing.available ? "" : "text-muted-foreground"}>
                        {ing.name}
                        {ing.quantity && (
                          <span className="text-muted-foreground ml-1">
                            ({ing.quantity})
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Recipe Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ChefHat className="w-5 h-5" />
                Recipe
              </CardTitle>
              <div className="flex gap-4 text-sm text-muted-foreground">
                {result.recipe.prepTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Prep: {result.recipe.prepTime}</span>
                  </div>
                )}
                {result.recipe.cookTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Cook: {result.recipe.cookTime}</span>
                  </div>
                )}
                {result.recipe.servings && (
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{result.recipe.servings} servings</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="space-y-3">
                {result.recipe.instructions.map((instruction, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-medium">
                      {i + 1}
                    </span>
                    <span className="text-sm">{instruction}</span>
                  </li>
                ))}
              </ol>

              {result.recipe.tips && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Tips:</h4>
                  <p className="text-sm text-muted-foreground">
                    {result.recipe.tips}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tips Card */}
      {!result && (
        <Card className="bg-primary/5 border-primary/30">
          <CardContent className="pt-6">
            <h3 className="font-medium text-primary mb-2">
              Tips for best results:
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Make sure the dish is clearly visible and well-lit</li>
              <li>• Include the entire dish in the frame</li>
              <li>• Works best with prepared/cooked dishes</li>
              <li>• Southeast Asian dishes have the best recognition</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
