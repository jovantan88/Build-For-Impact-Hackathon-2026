"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, X, Plus, Trash2, ArrowRight, Undo2 } from "lucide-react";
import { toast } from "sonner";

interface ParsedItem {
  tempId: string;
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
  needsExpiryDate?: boolean;
}

interface ParsedReceipt {
  receiptId: string;
  ingredients: ParsedItem[];
  excludedItems: ParsedItem[];
}

export default function ReviewPage() {
  const router = useRouter();
  const [data, setData] = useState<ParsedReceipt | null>(null);
  const [ingredients, setIngredients] = useState<ParsedItem[]>([]);
  const [excludedItems, setExcludedItems] = useState<ParsedItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("parsedReceipt");
    if (!stored) {
      toast.error("No receipt data found");
      router.push("/upload");
      return;
    }

    const parsed = JSON.parse(stored) as ParsedReceipt;
    setData(parsed);
    setIngredients(parsed.ingredients);
    setExcludedItems(parsed.excludedItems);
  }, [router]);

  const handleRemoveIngredient = (tempId: string) => {
    const item = ingredients.find((i) => i.tempId === tempId);
    if (item) {
      setIngredients(ingredients.filter((i) => i.tempId !== tempId));
      setExcludedItems([...excludedItems, item]);
    }
  };

  const handleRestoreItem = (tempId: string) => {
    const item = excludedItems.find((i) => i.tempId === tempId);
    if (item) {
      setExcludedItems(excludedItems.filter((i) => i.tempId !== tempId));
      setIngredients([...ingredients, { ...item, needsExpiryDate: false }]);
    }
  };

  const handleUpdateIngredient = (
    tempId: string,
    field: "name" | "quantity" | "unit",
    value: string | number
  ) => {
    setIngredients(
      ingredients.map((item) =>
        item.tempId === tempId ? { ...item, [field]: value } : item
      )
    );
  };

  const handleAddManualItem = () => {
    const newItem: ParsedItem = {
      tempId: crypto.randomUUID(),
      name: "New Item",
      quantity: 1,
      unit: "pcs",
      needsExpiryDate: false,
    };
    setIngredients([...ingredients, newItem]);
    setEditingId(newItem.tempId);
  };

  const handleContinue = () => {
    // Filter items that need expiry dates
    const itemsNeedingExpiry = ingredients.filter((i) => i.needsExpiryDate);

    if (itemsNeedingExpiry.length > 0) {
      // Store updated data and go to expiry flow
      sessionStorage.setItem(
        "reviewedIngredients",
        JSON.stringify({
          receiptId: data?.receiptId,
          ingredients,
          itemsNeedingExpiry,
        })
      );
      router.push("/expiry");
    } else {
      // No items need expiry, save directly
      saveIngredients(ingredients);
    }
  };

  const saveIngredients = async (items: ParsedItem[]) => {
    try {
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptId: data?.receiptId,
          ingredients: items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
          })),
        }),
      });

      if (!res.ok) {
        toast.error("Failed to save ingredients");
        return;
      }

      sessionStorage.removeItem("parsedReceipt");
      sessionStorage.removeItem("reviewedIngredients");
      toast.success("Ingredients added to your fridge!");
      router.push("/fridge");
    } catch {
      toast.error("Something went wrong");
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Review Items</h1>
        <p className="text-gray-600">
          We found {ingredients.length} ingredients. Edit or remove as needed.
        </p>
      </div>

      {/* Ingredients List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600" />
                Ingredients ({ingredients.length})
              </CardTitle>
              <CardDescription>These will be added to your fridge</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleAddManualItem}>
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {ingredients.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No ingredients yet</p>
          ) : (
            <div className="space-y-2">
              {ingredients.map((item) => (
                <div
                  key={item.tempId}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group"
                >
                  {editingId === item.tempId ? (
                    <>
                      <Input
                        value={item.name}
                        onChange={(e) =>
                          handleUpdateIngredient(item.tempId, "name", e.target.value)
                        }
                        className="flex-1"
                        autoFocus
                      />
                      <Input
                        type="number"
                        value={item.quantity || ""}
                        onChange={(e) =>
                          handleUpdateIngredient(
                            item.tempId,
                            "quantity",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-20"
                        placeholder="Qty"
                      />
                      <Input
                        value={item.unit || ""}
                        onChange={(e) =>
                          handleUpdateIngredient(item.tempId, "unit", e.target.value)
                        }
                        className="w-20"
                        placeholder="Unit"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => setEditingId(item.tempId)}
                      >
                        <p className="font-medium">{item.name}</p>
                        {(item.quantity || item.unit) && (
                          <p className="text-sm text-gray-500">
                            {item.quantity} {item.unit}
                          </p>
                        )}
                      </div>
                      {item.needsExpiryDate && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          Needs expiry
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemoveIngredient(item.tempId)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Excluded Items */}
      {excludedItems.length > 0 && (
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-gray-600">
              <Trash2 className="w-5 h-5" />
              Excluded Items ({excludedItems.length})
            </CardTitle>
            <CardDescription>
              Non-ingredient items. Click to restore if needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {excludedItems.map((item) => (
                <Badge
                  key={item.tempId}
                  variant="secondary"
                  className="cursor-pointer hover:bg-emerald-100 transition-colors"
                  onClick={() => handleRestoreItem(item.tempId)}
                >
                  {item.name}
                  <Undo2 className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={handleContinue}
          disabled={ingredients.length === 0}
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
