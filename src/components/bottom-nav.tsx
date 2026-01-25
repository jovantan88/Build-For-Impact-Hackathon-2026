"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Refrigerator, Upload, ChefHat, Lightbulb } from "lucide-react";

const navItems = [
  { href: "/upload", icon: Upload, label: "Upload" },
  { href: "/fridge", icon: Refrigerator, label: "Fridge" },
  { href: "/recipes", icon: ChefHat, label: "Recipes" },
  { href: "/insights", icon: Lightbulb, label: "Insights" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/90 border-t border-border backdrop-blur-sm z-50">
      <div className="max-w-5xl mx-auto px-4 py-2 flex justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
