"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Calendar, SkipForward, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface ParsedItem {
    tempId: string;
    name: string;
    quantity?: number;
    unit?: string;
    needsExpiryDate?: boolean;
    expiryDate?: string;
}

interface ReviewedData {
    receiptId: string;
    ingredients: ParsedItem[];
    itemsNeedingExpiry: ParsedItem[];
}

export default function ExpiryPage() {
    const router = useRouter();
    const [data, setData] = useState<ReviewedData | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [expiryDates, setExpiryDates] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const stored = sessionStorage.getItem("reviewedIngredients");
        if (!stored) {
            toast.error("No ingredient data found");
            router.push("/upload");
            return;
        }

        const parsed = JSON.parse(stored) as ReviewedData;
        setData(parsed);
    }, [router]);

    if (!data) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-pulse">Loading...</div>
            </div>
        );
    }

    const itemsNeedingExpiry = data.itemsNeedingExpiry;
    const currentItem = itemsNeedingExpiry[currentIndex];
    const progress = (currentIndex / itemsNeedingExpiry.length) * 100;
    const isComplete = currentIndex >= itemsNeedingExpiry.length;

    const handleSetExpiry = (date: string) => {
        if (currentItem) {
            setExpiryDates({ ...expiryDates, [currentItem.tempId]: date });
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handleSkip = () => {
        setCurrentIndex(currentIndex + 1);
    };

    const handleFinish = async () => {
        setSaving(true);

        try {
            // Merge expiry dates into ingredients
            const ingredientsWithExpiry = data.ingredients.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                expiryDate: expiryDates[item.tempId] || null,
            }));

            const res = await fetch("/api/ingredients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    receiptId: data.receiptId,
                    ingredients: ingredientsWithExpiry,
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
        } finally {
            setSaving(false);
        }
    };

    // Quick freshness options (relative to today)
    const quickOptions = [
        { label: "Use tomorrow", days: 1 },
        { label: "Use in 3 days", days: 3 },
        { label: "Use in 1 week", days: 7 },
        { label: "Use in 2 weeks", days: 14 },
    ];

    const getDateFromDays = (days: number) => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString().split("T")[0];
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Freshness Dates</h1>
                <p className="text-muted-foreground">Add dates so we can propose quick actions instead of reminders</p>
            </div>

            {/* Progress */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{isComplete ? "All done!" : `Item ${currentIndex + 1} of ${itemsNeedingExpiry.length}`}</span>
                    <span>{Math.round(isComplete ? 100 : progress)}%</span>
                </div>
                <Progress value={isComplete ? 100 : progress} className="h-2" />
            </div>

            {!isComplete ? (
                <Card className="overflow-hidden border-amber-500/30">
                    <CardHeader className="bg-gradient-to-r from-amber-950/50 to-orange-950/50">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-amber-500" />
                            {currentItem.name}
                        </CardTitle>
                        <CardDescription>When should you use this? This helps us suggest small actions.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        {/* Quick Options */}
                        <div className="grid grid-cols-2 gap-2">
                            {quickOptions.map((option) => (
                                <Button key={option.days} variant="outline" className="h-12" onClick={() => handleSetExpiry(getDateFromDays(option.days))}>
                                    {option.label}
                                </Button>
                            ))}
                        </div>

                        {/* Manual Date Picker */}
                        <div className="space-y-2">
                            <label className="text-sm text-muted-foreground">Or enter a specific date:</label>
                            <Input
                                type="date"
                                min={new Date().toISOString().split("T")[0]}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        handleSetExpiry(e.target.value);
                                    }
                                }}
                                className="w-full"
                            />
                        </div>

                        {/* Skip Button */}
                        <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleSkip}>
                            <SkipForward className="w-4 h-4 mr-2" />
                            Skip this item
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="overflow-hidden border-emerald-500/30">
                    <CardHeader className="bg-gradient-to-r from-emerald-950/50 to-green-950/50">
                        <CardTitle className="text-xl flex items-center gap-2 text-emerald-400">
                            <Check className="w-5 h-5" />
                            All Set!
                        </CardTitle>
                        <CardDescription>You&apos;ve reviewed all perishable items.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground mb-4">
                            <p>Freshness dates added: {Object.keys(expiryDates).length}</p>
                            <p>Items skipped: {itemsNeedingExpiry.length - Object.keys(expiryDates).length}</p>
                        </div>
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700" size="lg" onClick={handleFinish} disabled={saving}>
                            {saving ? (
                                "Saving..."
                            ) : (
                                <>
                                    Go to My Fridge
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Items Summary */}
            {!isComplete && (
                <div className="flex flex-wrap gap-2">
                    {itemsNeedingExpiry.map((item, index) => (
                        <div
                            key={item.tempId}
                            className={`px-3 py-1 rounded-full text-sm ${
                                index < currentIndex
                                    ? expiryDates[item.tempId]
                                        ? "bg-emerald-950/50 text-emerald-400"
                                        : "bg-muted text-muted-foreground"
                                    : index === currentIndex
                                      ? "bg-amber-950/50 text-amber-400 font-medium"
                                      : "bg-muted text-muted-foreground"
                            }`}
                        >
                            {item.name}
                            {index < currentIndex && expiryDates[item.tempId] && <Check className="w-3 h-3 inline ml-1" />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
