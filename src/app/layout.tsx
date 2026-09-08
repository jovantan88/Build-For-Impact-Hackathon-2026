import type { Metadata } from "next";
import { Newsreader, DM_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const newsreader = Newsreader({
    variable: "--font-newsreader",
    subsets: ["latin"],
    display: "swap",
});

const dmSans = DM_Sans({
    variable: "--font-dm-sans",
    subsets: ["latin"],
    display: "swap",
});

export const metadata: Metadata = {
    title: {
        default: "EatLa — Cook smarter, waste less",
        template: "%s · EatLa",
    },
    description:
        "AI fridge companion for Southeast Asian kitchens. Scan receipts, track expiry, and cook with SEA-LION. Finalist at the 2026 Build for Impact Hackathon.",
    keywords: ["EatLa", "food waste", "SEA-LION", "Southeast Asian recipes", "Build for Impact", "hackathon"],
    openGraph: {
        title: "EatLa — Cook smarter, waste less",
        description:
            "Scan a grocery receipt, track what you have, and let SEA-LION turn leftovers into dinner. Finalist at Build for Impact 2026.",
        type: "website",
        locale: "en_SG",
    },
    twitter: {
        card: "summary_large_image",
        title: "EatLa — Cook smarter, waste less",
        description: "AI fridge companion for Southeast Asian kitchens. Finalist at Build for Impact 2026.",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body className={`${newsreader.variable} ${dmSans.variable} antialiased font-sans`}>
                {children}
                <Toaster />
            </body>
        </html>
    );
}
