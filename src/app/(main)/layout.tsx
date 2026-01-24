import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { BottomNav } from "@/components/bottom-nav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/80">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/fridge" className="text-2xl font-medium text-white font-heading">
                        EatLa!
                    </Link>
                    <LogoutButton />
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 py-6 pb-24">{children}</main>

            {/* Bottom Navigation */}
            <BottomNav />
        </div>
    );
}
