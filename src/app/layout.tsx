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
    title: "E-Fridge - Smart Grocery Management",
    description: "Turn your receipts into recipes with AI-powered ingredient tracking",
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
