import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface FridgeShellProps {
    children: React.ReactNode;
    topPanelContent?: React.ReactNode;
}

export function FridgeShell({ children, topPanelContent }: FridgeShellProps) {
    return (
        <div className="relative rounded-3xl bg-gradient-to-b from-slate-200 to-slate-300 shadow-2xl overflow-hidden border-4 border-slate-400">
            {/* Fridge handle */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-28 bg-gradient-to-r from-slate-400 to-slate-500 rounded-full shadow-inner z-20" />

            {/* Top panel */}
            <div className="bg-gradient-to-b from-slate-700 to-slate-800 text-slate-100 p-2 border-b-4 border-slate-400 relative overflow-hidden min-h-[52px] flex items-center">
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5 pointer-events-none" />
                <div className="flex-1 relative z-10">{topPanelContent}</div>
            </div>

            {/* Fridge interior */}
            <div className="bg-gradient-to-b from-[#e8eef3] to-[#d9e2eb] min-h-[400px] relative">
                {/* Interior lighting */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/5 pointer-events-none" />
                <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/10 to-transparent pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/10 to-transparent pointer-events-none" />

                <div className="p-5 relative z-10 space-y-1">{children}</div>
            </div>

            {/* Bottom seal */}
            <div className="h-3 bg-gradient-to-b from-slate-300 to-slate-400 border-t border-slate-400" />
        </div>
    );
}

export function FridgeShelf({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 px-1 relative z-10">{children}</div>
            {/* Glass shelf */}
            <div className="mt-3 h-3 relative mx-[-1.25rem]">
                <div className="absolute inset-x-0 h-1.5 bg-gradient-to-b from-cyan-100/60 to-cyan-200/40 border-y border-cyan-300/30 shadow-sm" />
                <div className="absolute inset-x-0 top-1.5 h-1.5 bg-gradient-to-b from-slate-300/50 to-transparent" />
            </div>
        </div>
    );
}

export function FridgeNudgeBar({ children, isEmpty }: { children?: React.ReactNode; isEmpty?: boolean }) {
    return (
        <div
            className={cn(
                "w-full bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-700/50 flex flex-row gap-2 items-center justify-between",
                isEmpty && "h-[36px]",
            )}
        >
            {children}
        </div>
    );
}

export function FridgeItemSkeleton() {
    return (
        <div className="flex flex-col items-center">
            <div className="w-full aspect-square rounded-xl bg-white/80 border border-white shadow-md overflow-hidden">
                <Skeleton className="w-full h-full bg-slate-200/60" />
            </div>
            <Skeleton className="h-3 w-3/4 mt-2 bg-slate-300/60" />
            <Skeleton className="h-2 w-1/2 mt-1 bg-slate-300/40" />
        </div>
    );
}
