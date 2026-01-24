"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  ImageIcon,
  AlertTriangle,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface Ingredient {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  expiry_date: string | null;
  image_url: string | null;
  image_status: "pending" | "generating" | "ready";
  is_pantry_staple: boolean;
}

interface PantryStaple {
  id: string;
  name: string;
  is_enabled: boolean;
}

interface ActionNudge {
  id: string;
  title: string;
  message: string;
  ctaLabel: string;
  days: number;
  intent: "urgent" | "now" | "soon";
}

export default function FridgePage() {
  const router = useRouter();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [pantryStaples, setPantryStaples] = useState<PantryStaple[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Ingredient | null>(null);
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());
  const autoRequestedRef = useRef<Set<string>>(new Set());
  const imageFetchRequestedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    try {
      const res = await fetch("/api/ingredients");
      const data = await res.json();

      if (res.ok) {
        setIngredients(data.ingredients || []);
        setPantryStaples(data.pantryStaples || []);
      }
    } catch (error) {
      console.error("Failed to fetch ingredients:", error);
      toast.error("Failed to load fridge");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/ingredients?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setIngredients(ingredients.filter((i) => i.id !== id));
        setSelectedItem(null);
        toast.success("Item removed");
      }
    } catch {
      toast.error("Failed to delete item");
    }
  };

  const handleGenerateImage = async (
    id: string,
    options: { notify?: boolean } = {},
  ) => {
    const { notify = true } = options;
    setGeneratingImages((prev) => new Set(prev).add(id));
    setIngredients((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, image_status: "generating" } : item,
      ),
    );

    try {
      const res = await fetch(`/api/ingredients/${id}/image`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        setIngredients((prev) =>
          prev.map((i) =>
            i.id === id
              ? { ...i, image_url: data.imageUrl, image_status: "ready" as const }
              : i,
          ),
        );
        if (notify) {
          toast.success("Image generated!");
        }
      } else {
        setIngredients((prev) =>
          prev.map((i) =>
            i.id === id ? { ...i, image_status: "pending" } : i,
          ),
        );
        if (notify) {
          toast.error("Failed to generate image");
        }
      }
    } catch {
      setIngredients((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, image_status: "pending" } : i,
        ),
      );
      if (notify) {
        toast.error("Failed to generate image");
      }
    } finally {
      setGeneratingImages((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const fetchIngredientImage = async (id: string) => {
    try {
      const res = await fetch(`/api/ingredients/${id}/image`);
      const data = await res.json();

      if (res.ok && data.imageUrl) {
        setIngredients((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, image_url: data.imageUrl } : item,
          ),
        );
      }
    } catch {
      // Silent fail - UI will keep showing placeholder
    }
  };

  useEffect(() => {
    const pendingItems = ingredients.filter(
      (item) => !item.image_url && item.image_status === "pending",
    );

    pendingItems.forEach((item) => {
      if (autoRequestedRef.current.has(item.id)) return;
      autoRequestedRef.current.add(item.id);
      handleGenerateImage(item.id, { notify: false });
    });
  }, [ingredients]);

  useEffect(() => {
    const readyItems = ingredients.filter(
      (item) => !item.image_url && item.image_status === "ready",
    );

    readyItems.forEach((item) => {
      if (imageFetchRequestedRef.current.has(item.id)) return;
      imageFetchRequestedRef.current.add(item.id);
      fetchIngredientImage(item.id);
    });
  }, [ingredients]);

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getActionBadge = (expiryDate: string | null) => {
    if (!expiryDate) return null;

    const days = getDaysUntilExpiry(expiryDate);

    if (days < 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Rescue now
        </Badge>
      );
    } else if (days === 0) {
      return (
        <Badge className="text-xs bg-emerald-600 hover:bg-emerald-700">
          <Clock className="w-3 h-3 mr-1" />
          Cook today
        </Badge>
      );
    } else if (days <= 3) {
      return (
        <Badge className="text-xs bg-amber-500 hover:bg-amber-600">
          <Clock className="w-3 h-3 mr-1" />
          Plan a meal
        </Badge>
      );
    }

    return null;
  };

  const buildActionNudge = (item: Ingredient): ActionNudge | null => {
    if (!item.expiry_date) return null;
    const days = getDaysUntilExpiry(item.expiry_date);

    if (days < 0) {
      return {
        id: item.id,
        title: `Rescue ${item.name}`,
        message: "Cook or freeze it now. I can guide you.",
        ctaLabel: "Find a quick recipe",
        days,
        intent: "urgent",
      };
    }

    if (days <= 1) {
      return {
        id: item.id,
        title: `Quick ${item.name} dish`,
        message: `5-minute ${item.name} dish? I can walk you through it now.`,
        ctaLabel: "Cook now",
        days,
        intent: "now",
      };
    }

    if (days <= 3) {
      return {
        id: item.id,
        title: `Plan ${item.name}`,
        message: "Pick a quick recipe this week and I'll guide you.",
        ctaLabel: "See recipes",
        days,
        intent: "soon",
      };
    }

    return null;
  };

  const nudges = ingredients
    .map((item) => buildActionNudge(item))
    .filter((nudge): nudge is ActionNudge => Boolean(nudge))
    .sort((a, b) => a.days - b.days)
    .slice(0, 3);

  const getNudgeBadgeStyles = (intent: ActionNudge["intent"]) => {
    if (intent === "urgent") {
      return "bg-red-100 text-red-700";
    }
    if (intent === "now") {
      return "bg-emerald-100 text-emerald-700";
    }
    return "bg-amber-100 text-amber-700";
  };

  const getNudgeLabel = (intent: ActionNudge["intent"]) => {
    if (intent === "urgent") return "Rescue";
    if (intent === "now") return "Do now";
    return "Plan";
  };

  const selectedNudge = selectedItem ? buildActionNudge(selectedItem) : null;
  const selectedActionBadge = selectedItem?.expiry_date
    ? getActionBadge(selectedItem.expiry_date)
    : null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Fridge</h1>
          <p className="text-gray-600">Loading your ingredients...</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-32 w-full" />
              <CardContent className="p-3">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Fridge</h1>
          <p className="text-gray-600">
            {ingredients.length} ingredients in your fridge
          </p>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => router.push("/upload")}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Items
        </Button>
      </div>

      {nudges.length > 0 && (
        <Card className="border-emerald-100 bg-emerald-50/40">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800">
              <Sparkles className="w-4 h-4" />
              <h2 className="font-semibold">Action Nudges</h2>
            </div>
            <p className="text-sm text-emerald-700">
              We skip reminders and propose a small next step.
            </p>
            <div className="space-y-2">
              {nudges.map((nudge) => (
                <div
                  key={nudge.id}
                  className="flex flex-col gap-3 rounded-lg border border-emerald-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={getNudgeBadgeStyles(nudge.intent)}>
                        {getNudgeLabel(nudge.intent)}
                      </Badge>
                      <p className="text-sm font-semibold text-gray-900">
                        {nudge.title}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">{nudge.message}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => router.push("/recipes")}
                  >
                    {nudge.ctaLabel}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {ingredients.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Your fridge is empty</h3>
              <p className="text-sm text-gray-500">
                Upload a receipt to add ingredients
              </p>
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => router.push("/upload")}
            >
              Upload Receipt
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {ingredients.map((item) => {
            const actionBadge = getActionBadge(item.expiry_date);
            return (
              <Card
                key={item.id}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedItem(item)}
              >
                <div className="h-32 bg-gray-100 flex items-center justify-center relative">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : generatingImages.has(item.id) ||
                    item.image_status === "generating" ? (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                      <span className="text-xs">Generating...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-xs">No image</span>
                    </div>
                  )}
                  {actionBadge && (
                    <div className="absolute top-2 right-2">
                      {actionBadge}
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <h3 className="font-medium text-gray-900 truncate">
                    {item.name}
                  </h3>
                  {(item.quantity || item.unit) && (
                    <p className="text-sm text-gray-500">
                      {item.quantity} {item.unit}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pantry Staples Section */}
      {pantryStaples.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-700">Pantry Staples</h2>
          <div className="flex flex-wrap gap-2">
            {pantryStaples
              .filter((s) => s.is_enabled)
              .map((staple) => (
                <Badge
                  key={staple.id}
                  variant="outline"
                  className="text-sm py-1 px-3"
                >
                  {staple.name}
                </Badge>
              ))}
          </div>
        </div>
      )}

      {/* Item Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedItem.name}</DialogTitle>
                <DialogDescription>
                  {selectedItem.quantity && (
                    <span>
                      {selectedItem.quantity} {selectedItem.unit}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Image */}
                <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                  {selectedItem.image_url ? (
                    <img
                      src={selectedItem.image_url}
                      alt={selectedItem.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <ImageIcon className="w-12 h-12" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateImage(selectedItem.id);
                        }}
                        disabled={generatingImages.has(selectedItem.id)}
                      >
                        {generatingImages.has(selectedItem.id)
                          ? "Generating..."
                          : "Generate Image"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Freshness */}
                {selectedItem.expiry_date && (
                  <div className="space-y-2">
                    {selectedNudge && selectedActionBadge && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          Suggested action:
                        </span>
                        {selectedActionBadge}
                      </div>
                    )}
                    {selectedNudge && (
                      <p className="text-sm text-gray-700">
                        {selectedNudge.message}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Freshness date:{" "}
                      {new Date(selectedItem.expiry_date).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleDelete(selectedItem.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove from Fridge
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
