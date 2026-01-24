import { Skeleton } from "@/components/ui/skeleton";
import { FridgeShell, FridgeShelf, FridgeNudgeBar, FridgeItemSkeleton } from "./fridge-shell";

export default function FridgeLoading() {
    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12 [scrollbar-gutter:stable]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Fridge</h1>
                    <p className="text-muted-foreground">Checking inventory...</p>
                </div>
                <Skeleton className="h-10 w-28" />
            </div>

            <FridgeShell
                topPanelContent={
                    <FridgeNudgeBar>
                        <div className="flex items-center gap-2">
                            <Skeleton className="w-2 h-2 rounded-full bg-slate-600/80" />
                            <Skeleton className="h-4 w-32 bg-slate-600/50 rounded" />
                        </div>
                        <Skeleton className="h-6 w-14 bg-slate-600/50 rounded-md" />
                    </FridgeNudgeBar>
                }
            >
                {/* Shelf 1 */}
                <FridgeShelf>
                    {[0, 1, 2, 3].map((i) => (
                        <FridgeItemSkeleton key={i} />
                    ))}
                </FridgeShelf>

                {/* Shelf 2 */}
                <FridgeShelf>
                    {[0, 1, 2, 3].map((i) => (
                        <FridgeItemSkeleton key={i} />
                    ))}
                </FridgeShelf>
            </FridgeShell>
        </div>
    );
}
