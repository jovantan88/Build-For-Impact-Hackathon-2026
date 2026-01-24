"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, ShoppingBag, Lightbulb, X, Check, AlertCircle, Leaf, DollarSign } from "lucide-react";

interface Recommendation {
    ingredientName: string;
    recommendationType: "reduce" | "skip" | "substitute" | "freeze" | "buy_less";
    suggestion: string;
    substituteWith?: string;
    wasteCount: number;
    totalCount: number;
    wasteFrequency: number;
    estimatedSavings?: number;
}

interface Insights {
    totalWasteEvents: number;
    mostWastedItems: {
        name: string;
        count: number;
        frequency: number;
    }[];
    totalSavingsPotential: number;
    insightSummary: string;
}

interface InsightsData {
    hasInsights: boolean;
    message?: string;
    recommendations: Recommendation[];
    insights: Insights;
}

const recommendationColors = {
    reduce: "bg-blue-100 text-blue-800 border-blue-200",
    skip: "bg-orange-100 text-orange-800 border-orange-200",
    substitute: "bg-purple-100 text-purple-800 border-purple-200",
    freeze: "bg-cyan-100 text-cyan-800 border-cyan-200",
    buy_less: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

const recommendationIcons = {
    reduce: TrendingDown,
    skip: X,
    substitute: ShoppingBag,
    freeze: AlertCircle,
    buy_less: TrendingDown,
};

export default function InsightsPage() {
    const [data, setData] = useState<InsightsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [dismissedItems, setDismissedItems] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchInsights();
    }, []);

    const fetchInsights = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/insights");
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error("Error fetching insights:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = async (ingredientName: string) => {
        try {
            await fetch("/api/insights", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ingredientName, action: "dismiss" }),
            });
            setDismissedItems((prev) => new Set(prev).add(ingredientName));
        } catch (error) {
            console.error("Error dismissing recommendation:", error);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Shopping Insights</h1>
                    <p className="text-muted-foreground mt-1">Personalized recommendations to reduce waste</p>
                </div>

                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!data?.hasInsights) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Shopping Insights</h1>
                    <p className="text-muted-foreground mt-1">Personalized recommendations to reduce waste</p>
                </div>

                <Card>
                    <CardContent className="py-12 text-center">
                        <Lightbulb className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">Not Enough Data Yet</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            {data?.message ||
                                "Keep tracking your ingredients for a few weeks. We'll analyze your patterns and suggest ways to reduce waste and save money!"}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const activeRecommendations = data.recommendations.filter((rec) => !dismissedItems.has(rec.ingredientName));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Shopping Insights</h1>
                <p className="text-muted-foreground mt-1">Personalized recommendations to reduce waste</p>
            </div>

            {/* Summary Card */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <Leaf className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg text-foreground mb-2">Your Waste Pattern Summary</h3>
                            <p className="text-foreground mb-4">{data.insights.insightSummary}</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-card p-3 rounded-lg border">
                                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                        <AlertCircle className="w-4 h-4" />
                                        <span>Waste Events</span>
                                    </div>
                                    <div className="text-2xl font-bold text-foreground">{data.insights.totalWasteEvents || 0}</div>
                                </div>
                                <div className="bg-card p-3 rounded-lg border">
                                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                        <DollarSign className="w-4 h-4" />
                                        <span>Potential Savings</span>
                                    </div>
                                    <div className="text-2xl font-bold text-primary">${(data.insights.totalSavingsPotential || 0).toFixed(0)}/mo</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Most Wasted Items */}
            {data.insights.mostWastedItems.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingDown className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                            Most Wasted Items
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {data.insights.mostWastedItems
                                .filter((item) => item && item.name && item.count > 0)
                                .map((item) => (
                                    <div key={item.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                        <div>
                                            <div className="font-medium text-foreground capitalize">{item.name}</div>
                                            <div className="text-sm text-muted-foreground">
                                                Wasted {item.count} {item.count === 1 ? "time" : "times"}
                                            </div>
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className={
                                                (item.frequency || 0) >= 0.75
                                                    ? "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300"
                                                    : (item.frequency || 0) >= 0.5
                                                      ? "bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300"
                                                      : "bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300"
                                            }
                                        >
                                            {Math.round((item.frequency || 0) * 100)}% waste rate
                                        </Badge>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recommendations */}
            {activeRecommendations.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-primary" />
                        Your Shopping Recommendations
                    </h2>

                    {activeRecommendations.map((rec) => {
                        const Icon = recommendationIcons[rec.recommendationType];
                        return (
                            <Card key={rec.ingredientName} className="border-l-4 border-l-primary">
                                <CardContent className="pt-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className={`p-2 rounded-lg ${recommendationColors[rec.recommendationType]}`}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-lg text-foreground capitalize mb-1">{rec.ingredientName}</h3>
                                                    <div className="text-sm text-muted-foreground mb-2">
                                                        Wasted {rec.wasteCount || 0} out of {rec.totalCount || 0} times (
                                                        {Math.round((rec.wasteFrequency || 0) * 100)}%)
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-muted p-4 rounded-lg mb-3">
                                                <div className="flex items-start gap-2">
                                                    <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                                                    <p className="text-foreground">{rec.suggestion}</p>
                                                </div>
                                            </div>

                                            {rec.substituteWith && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/30">
                                                        Try instead: {rec.substituteWith}
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDismiss(rec.ingredientName)}
                                            className="text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="mt-4 pt-4 border-t flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handleDismiss(rec.ingredientName)} className="flex-1">
                                            Not Helpful
                                        </Button>
                                        <Button size="sm" className="flex-1" onClick={() => handleDismiss(rec.ingredientName)}>
                                            <Check className="w-4 h-4 mr-2" />
                                            Will Try This
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {activeRecommendations.length === 0 && data.recommendations.length > 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Check className="w-16 h-16 text-primary mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">All Caught Up!</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            You've reviewed all recommendations. Keep tracking your ingredients to get new insights.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
