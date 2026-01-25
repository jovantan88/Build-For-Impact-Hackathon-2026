"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, ImageIcon, AlertTriangle, Clock, Sparkles, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FridgeShell, FridgeShelf, FridgeNudgeBar } from "./fridge-shell";

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

interface FridgeClientProps {
    initialIngredients: Ingredient[];
    initialPantryStaples: PantryStaple[];
}

export function FridgeClient({ initialIngredients, initialPantryStaples }: FridgeClientProps) {
    const router = useRouter();
    const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
    const [pantryStaples] = useState<PantryStaple[]>(initialPantryStaples);
    const [selectedItem, setSelectedItem] = useState<Ingredient | null>(null);
    const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());

    const autoRequestedRef = useRef<Set<string>>(new Set());
    const imageFetchRequestedRef = useRef<Set<string>>(new Set());

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/ingredients?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                setIngredients(ingredients.filter((i) => i.id !== id));
                setSelectedItem(null);
                toast.success("Item removed");
            }
        } catch {
            toast.error("Failed to delete item");
        }
    };

    const handleGenerateImage = async (id: string, options: { notify?: boolean } = {}) => {
        const { notify = true } = options;
        setGeneratingImages((prev) => new Set(prev).add(id));
        setIngredients((prev) => prev.map((item) => (item.id === id ? { ...item, image_status: "generating" } : item)));

        try {
            const res = await fetch(`/api/ingredients/${id}/image`, { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, image_url: data.imageUrl, image_status: "ready" as const } : i)));
                if (notify) toast.success("Image generated!");
            } else {
                setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, image_status: "pending" } : i)));
            }
        } catch {
            setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, image_status: "pending" } : i)));
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
                setIngredients((prev) => prev.map((item) => (item.id === id ? { ...item, image_url: data.imageUrl } : item)));
            }
        } catch {}
    };

    useEffect(() => {
        const pendingItems = ingredients.filter((item) => !item.image_url && item.image_status === "pending");
        pendingItems.forEach((item) => {
            if (autoRequestedRef.current.has(item.id)) return;
            autoRequestedRef.current.add(item.id);
            handleGenerateImage(item.id, { notify: false });
        });
    }, [ingredients]);

    useEffect(() => {
        const readyItems = ingredients.filter((item) => !item.image_url && item.image_status === "ready");
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
        if (days < 0)
            return (
                <Badge variant="destructive" className="text-[10px] h-5 px-1.5 shadow-sm">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Expired
                </Badge>
            );
        if (days === 0)
            return (
                <Badge className="text-[10px] h-5 px-1.5 bg-red-500 hover:bg-red-600 shadow-sm">
                    <Clock className="w-3 h-3 mr-1" />
                    Today
                </Badge>
            );
        if (days <= 3)
            return (
                <Badge className="text-[10px] h-5 px-1.5 bg-amber-500 hover:bg-amber-600 shadow-sm">
                    <Clock className="w-3 h-3 mr-1" />
                    {days}d left
                </Badge>
            );
        return null;
    };

    const buildActionNudge = (item: Ingredient): ActionNudge | null => {
        if (!item.expiry_date) return null;
        const days = getDaysUntilExpiry(item.expiry_date);
        if (days < 0) return { id: item.id, title: `Rescue ${item.name}`, message: "Cook or freeze it now.", ctaLabel: "Rescue", days, intent: "urgent" };
        if (days <= 1) return { id: item.id, title: `Eat ${item.name}`, message: `Use ${item.name} today.`, ctaLabel: "Cook", days, intent: "now" };
        if (days <= 3) return { id: item.id, title: `Plan ${item.name}`, message: "Use within 3 days.", ctaLabel: "Plan", days, intent: "soon" };
        return null;
    };

    const nudges = ingredients
        .map((item) => buildActionNudge(item))
        .filter((nudge): nudge is ActionNudge => Boolean(nudge))
        .sort((a, b) => a.days - b.days)
        .slice(0, 3);

    const selectedNudge = selectedItem ? buildActionNudge(selectedItem) : null;
    const selectedActionBadge = selectedItem?.expiry_date ? getActionBadge(selectedItem.expiry_date) : null;

    const itemsPerRow = 4;
    const totalShelves = Math.max(2, Math.ceil(ingredients.length / itemsPerRow));

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12 [scrollbar-gutter:stable]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Fridge</h1>
                    <p className="text-muted-foreground">
                        {ingredients.length} ingredient{ingredients.length !== 1 ? "s" : ""} loaded
                    </p>
                </div>
                <Button className="shadow-md" onClick={() => router.push("/upload")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Items
                </Button>
            </div>

            <FridgeShell
                topPanelContent={
                    nudges.length > 0 ? (
                        <FridgeNudgeBar>
                            <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full animate-pulse", nudges[0].intent === "urgent" ? "bg-red-500" : "bg-amber-500")} />
                                <span className="text-sm font-medium truncate">{nudges[0].message}</span>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs text-blue-300 hover:text-blue-200 hover:bg-blue-500/20"
                                onClick={() => router.push("/recipes")}
                            >
                                {nudges[0].ctaLabel} <ChefHat className="w-3 h-3 ml-1" />
                            </Button>
                        </FridgeNudgeBar>
                    ) : (
                        <FridgeNudgeBar isEmpty />
                    )
                }
            >
                {ingredients.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <div className="w-20 h-20 rounded-full bg-white/60 flex items-center justify-center mb-4 shadow-inner">
                            <ImageIcon className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-lg font-medium">It's empty in here</p>
                        <Button variant="link" onClick={() => router.push("/upload")}>
                            Upload a receipt to fill it up
                        </Button>
                    </div>
                )}

                {Array.from({ length: totalShelves }).map((_, shelfIndex) => {
                    const itemsOnShelf = ingredients.slice(shelfIndex * itemsPerRow, (shelfIndex + 1) * itemsPerRow);
                    if (itemsOnShelf.length === 0) return null;

                    return (
                        <FridgeShelf key={shelfIndex}>
                            {itemsOnShelf.map((item) => (
                                <FridgeItem
                                    key={item.id}
                                    item={item}
                                    onClick={() => setSelectedItem(item)}
                                    getActionBadge={getActionBadge}
                                    isGenerating={generatingImages.has(item.id)}
                                />
                            ))}
                        </FridgeShelf>
                    );
                })}
            </FridgeShell>

            {/* Pantry Staples */}
            {pantryStaples.length > 0 && (
                <div className="bg-card border rounded-xl p-4 shadow-sm">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pantry Staples</h2>
                    <div className="flex flex-wrap gap-2">
                        {pantryStaples
                            .filter((s) => s.is_enabled)
                            .map((staple) => (
                                <Badge key={staple.id} variant="secondary" className="font-normal">
                                    {staple.name}
                                </Badge>
                            ))}
                    </div>
                </div>
            )}

            <ItemDialog
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
                onGenerateImage={handleGenerateImage}
                onDelete={handleDelete}
                isGenerating={selectedItem ? generatingImages.has(selectedItem.id) : false}
                nudge={selectedNudge}
                badge={selectedActionBadge}
            />
        </div>
    );
}

function FridgeItem({
    item,
    onClick,
    getActionBadge,
    isGenerating,
}: {
    item: Ingredient;
    onClick: () => void;
    getActionBadge: (date: string) => React.ReactNode;
    isGenerating: boolean;
}) {
    const badge = item.expiry_date ? getActionBadge(item.expiry_date) : null;

    return (
        <div className="group relative flex flex-col items-center cursor-pointer transition-transform hover:-translate-y-1" onClick={onClick}>
            <div className="w-full aspect-square rounded-xl bg-white/90 border-2 border-white shadow-md transition-all overflow-hidden relative group-hover:shadow-xl group-hover:border-primary/20">
                {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-300">
                        {isGenerating || item.image_status === "generating" ? (
                            <Sparkles className="w-8 h-8 animate-pulse text-amber-400" />
                        ) : (
                            <ImageIcon className="w-8 h-8" />
                        )}
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                {badge && <div className="absolute top-2 right-2 z-10 shadow-sm">{badge}</div>}
            </div>

            <div className="mt-2 text-center w-full px-1">
                <p className="text-sm font-semibold text-slate-700 truncate">{item.name}</p>
                {item.quantity || item.unit ? (
                    <p className="text-xs text-slate-400 truncate font-medium">
                        {item.quantity} {item.unit}
                    </p>
                ) : (
                    <p className="text-xs text-transparent select-none">-</p>
                )}
            </div>
        </div>
    );
}

function ItemDialog({
    item,
    onClose,
    onGenerateImage,
    onDelete,
    isGenerating,
    nudge,
    badge,
}: {
    item: Ingredient | null;
    onClose: () => void;
    onGenerateImage: (id: string) => void;
    onDelete: (id: string) => void;
    isGenerating: boolean;
    nudge: ActionNudge | null;
    badge: React.ReactNode;
}) {
    return (
        <Dialog open={!!item} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-gradient-to-b from-slate-50 to-slate-100 border-slate-300">
                {item && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-xl flex items-center justify-between text-slate-900">
                                {item.name}
                                {badge}
                            </DialogTitle>
                            <DialogDescription className="text-slate-600">
                                {item.quantity ? `${item.quantity} ${item.unit || ""}` : "In stock"}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="aspect-video bg-white/60 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200 relative group">
                                {item.image_url ? (
                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-4 rounded-full shadow-sm bg-slate-100">
                                            {isGenerating ? (
                                                <Sparkles className="w-6 h-6 animate-spin text-amber-500" />
                                            ) : (
                                                <ImageIcon className="w-6 h-6 text-slate-600" />
                                            )}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onGenerateImage(item.id);
                                            }}
                                            disabled={isGenerating}
                                        >
                                            {isGenerating ? "Magic working..." : "Generate Photo"}
                                        </Button>
                                    </div>
                                )}
                            </div>
                            {nudge && (
                                <div
                                    className={cn(
                                        "p-3 rounded-lg border text-sm flex gap-3",
                                        nudge.intent === "urgent"
                                            ? "bg-red-50 border-red-200 text-red-700"
                                            : "bg-emerald-50 border-emerald-200 text-emerald-700",
                                    )}
                                >
                                    <ChefHat className="w-5 h-5 shrink-0" />
                                    <div>
                                        <p className="font-semibold mb-1">{nudge.title}</p>
                                        <p className="opacity-90">{nudge.message}</p>
                                    </div>
                                </div>
                            )}
                            {item.expiry_date && (
                                <div className="flex items-center gap-2 text-sm text-slate-600 p-2 bg-white/50 border border-slate-200 rounded">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                        Expires: {new Date(item.expiry_date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                                    </span>
                                </div>
                            )}
                            <div className="flex gap-2 pt-2">
                                <Button variant="destructive" className="flex-1" onClick={() => onDelete(item.id)}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Consumed / Remove
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
