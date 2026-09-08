import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({ className, href = "/" }: { className?: string; href?: string }) {
    return (
        <Link href={href} className={cn("font-heading font-medium text-white tracking-tight", className)}>
            EatLa!
        </Link>
    );
}
