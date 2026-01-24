"use client";

import { useState, useEffect } from "react";
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
import { Plus, Trash2, ImageIcon, AlertTriangle, Clock } from "lucide-react";
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

export default function FridgePage() {
  const router = useRouter();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [pantryStaples, setPantryStaples] = useState<PantryStaple[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Ingredient | null>(null);
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());

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

  const handleGenerateImage = async (id: string) => {
    setGeneratingImages((prev) => new Set(prev).add(id));

    try {
      const res = await fetch(`/api/ingredients/${id}/image`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        setIngredients(
          ingredients.map((i) =>
            i.id === id
              ? { ...i, image_url: data.imageUrl, image_status: "ready" as const }
              : i
          )
        );
        toast.success("Image generated!");
      } else {
        toast.error("Failed to generate image");
      }
    } catch {
      toast.error("Failed to generate image");
    } finally {
      setGeneratingImages((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getExpiryBadge = (expiryDate: string | null) => {
    if (!expiryDate) return null;

    const days = getDaysUntilExpiry(expiryDate);

    if (days < 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    } else if (days === 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Today
        </Badge>
      );
    } else if (days <= 3) {
      return (
        <Badge className="text-xs bg-amber-500 hover:bg-amber-600">
          <Clock className="w-3 h-3 mr-1" />
          {days}d left
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="text-xs">
          {days}d left
        </Badge>
      );
    }
  };

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
          {ingredients.map((item) => (
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
                {item.expiry_date && (
                  <div className="absolute top-2 right-2">
                    {getExpiryBadge(item.expiry_date)}
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
          ))}
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

                {/* Expiry */}
                {selectedItem.expiry_date && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Expires:</span>
                    {getExpiryBadge(selectedItem.expiry_date)}
                    <span className="text-sm text-gray-500">
                      ({new Date(selectedItem.expiry_date).toLocaleDateString()})
                    </span>
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
