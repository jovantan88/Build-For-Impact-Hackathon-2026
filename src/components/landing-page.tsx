import Link from "next/link";
import { Camera, ChefHat, Leaf, Mic, Refrigerator, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";

const features = [
    {
        icon: Upload,
        title: "Receipt to fridge",
        body: "Photograph an NTUC, Giant, or wet-market receipt. EatLa extracts ingredients and leaves the household junk behind.",
    },
    {
        icon: Refrigerator,
        title: "A fridge you can see",
        body: "Expiry dates live on a visual fridge, not a spreadsheet. What is about to spoil is the first thing you notice.",
    },
    {
        icon: Sparkles,
        title: "Discover a dish",
        body: "Snap a plate of food. EatLa names the dish, lists the ingredients, and tells you what you already have at home.",
    },
    {
        icon: ChefHat,
        title: "SEA-LION recipes",
        body: "Recipes grounded in laksa, rendang, pho, and weeknight stir-fries — generated from what is actually in your fridge.",
    },
    {
        icon: Mic,
        title: "Talk it through",
        body: "Say what you feel like eating. EatLa transcribes the request and cooks up recipes that match.",
    },
    {
        icon: Leaf,
        title: "Waste insights",
        body: "After a few weeks of use, shopping advice shrinks the spinach you keep throwing and the milk that never gets finished.",
    },
];

const steps = [
    {
        step: "01",
        title: "Upload a receipt",
        body: "A photo is enough. The parser reads line items, quantities, and what is actually food.",
    },
    {
        step: "02",
        title: "Confirm what you bought",
        body: "Review the list, set expiry dates on fresh produce, and drop it into your fridge.",
    },
    {
        step: "03",
        title: "Cook what is left",
        body: "SEA-LION writes detailed recipes from remaining ingredients, or tells you the two items worth buying.",
    },
];

const demoShelves = [
    [
        { name: "Eggs", qty: "12 pcs" },
        { name: "Tofu", qty: "1 pack" },
        { name: "Kangkong", qty: "1 bunch" },
    ],
    [
        { name: "Chicken thigh", qty: "500 g" },
        { name: "Belacan", qty: "1 block" },
        { name: "Coconut milk", qty: "1 can" },
    ],
    [
        { name: "Chili padi", qty: "8 pcs" },
        { name: "Lemongrass", qty: "3 stalks" },
        { name: "Rice", qty: "2 kg" },
    ],
];

export function LandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
                    <BrandMark className="text-2xl" />
                    <nav className="flex items-center gap-2">
                        <Button variant="ghost" asChild>
                            <Link href="/login">Sign in</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/signup">Get started</Link>
                        </Button>
                    </nav>
                </div>
            </header>

            <main>
                <section className="relative overflow-hidden">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.35_0.08_160_/_0.35),_transparent_55%)]" />
                    <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
                        <div className="space-y-6">
                            <p className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-primary">
                                Finalist · Build for Impact 2026
                            </p>
                            <h1 className="font-heading text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl lg:text-6xl">
                                Cook what you already bought.
                            </h1>
                            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                                EatLa is an AI fridge for Southeast Asian kitchens. Photograph a receipt, watch expiry dates, and let{" "}
                                <span className="text-foreground">SEA-LION</span> turn leftovers into dinner before they go to waste.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <Button size="lg" asChild>
                                    <Link href="/signup">Start cooking smarter</Link>
                                </Button>
                                <Button size="lg" variant="outline" asChild>
                                    <Link href="/login">I already have an account</Link>
                                </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Built for the 2026 Build for Impact Hackathon during Singapore AI Research Week — sustainability track,
                                powered by AI Singapore&apos;s SEA-LION.
                            </p>
                        </div>

                        <LandingFridge />
                    </div>
                </section>

                <section className="border-t border-border">
                    <div className="mx-auto max-w-6xl px-4 py-20">
                        <div className="max-w-2xl">
                            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">What it does</p>
                            <h2 className="mt-3 font-heading text-3xl font-semibold sm:text-4xl">From receipt to recipe, without the guilt trip.</h2>
                            <p className="mt-4 text-muted-foreground">
                                Household food waste is usually a purchasing problem, not a cooking one. EatLa closes that loop.
                            </p>
                        </div>
                        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {features.map((feature) => (
                                <article key={feature.title} className="rounded-2xl border border-border bg-card p-6">
                                    <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <feature.icon className="size-5" />
                                    </div>
                                    <h3 className="font-heading text-xl font-semibold">{feature.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-t border-border bg-card/40">
                    <div className="mx-auto max-w-6xl px-4 py-20">
                        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">How it works</p>
                        <h2 className="mt-3 font-heading text-3xl font-semibold sm:text-4xl">Three steps between grocery run and dinner.</h2>
                        <ol className="mt-12 grid gap-6 lg:grid-cols-3">
                            {steps.map((item) => (
                                <li key={item.step} className="rounded-2xl border border-border bg-background p-6">
                                    <span className="font-heading text-sm text-primary">{item.step}</span>
                                    <h3 className="mt-3 font-heading text-2xl font-semibold">{item.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                <section className="border-t border-border">
                    <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 lg:grid-cols-2">
                        <div>
                            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Built around SEA-LION</p>
                            <h2 className="mt-3 font-heading text-3xl font-semibold sm:text-4xl">A local model for local kitchens.</h2>
                            <p className="mt-4 leading-relaxed text-muted-foreground">
                                The hackathon asked teams to find a real use for{" "}
                                <a
                                    href="https://aisingapore.org/aiproducts/sea-lion/"
                                    className="text-foreground underline underline-offset-4 hover:text-primary"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    SEA-LION
                                </a>
                                , AI Singapore&apos;s Southeast Asian language model. EatLa uses it for recipe generation over Cloudflare
                                Workers AI, with optional web grounding, and a vision worker based on Qwen-SEA-LION for dish recognition.
                            </p>
                            <p className="mt-4 leading-relaxed text-muted-foreground">
                                GPT and Gemini fill in receipt parsing and food photography. The product still works if SEA-LION is
                                offline — but SEA-LION is the default chef.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card p-6">
                            <p className="text-sm text-muted-foreground">Stack</p>
                            <ul className="mt-4 space-y-3 text-sm">
                                <li className="flex justify-between gap-4 border-b border-border pb-3">
                                    <span className="text-muted-foreground">App</span>
                                    <span>Next.js, TypeScript, Tailwind</span>
                                </li>
                                <li className="flex justify-between gap-4 border-b border-border pb-3">
                                    <span className="text-muted-foreground">Data</span>
                                    <span>Supabase Auth + Postgres</span>
                                </li>
                                <li className="flex justify-between gap-4 border-b border-border pb-3">
                                    <span className="text-muted-foreground">Recipes</span>
                                    <span>SEA-LION + Exa</span>
                                </li>
                                <li className="flex justify-between gap-4 border-b border-border pb-3">
                                    <span className="text-muted-foreground">Vision</span>
                                    <span>OpenAI + Gemini + SEA-LION VL</span>
                                </li>
                                <li className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">Track</span>
                                    <span>Sustainability</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section className="border-t border-border">
                    <div className="mx-auto max-w-6xl px-4 py-20">
                        <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-card to-background px-6 py-12 text-center sm:px-12">
                            <Camera className="mx-auto mb-4 size-8 text-primary" />
                            <h2 className="font-heading text-3xl font-semibold sm:text-4xl">Finalist at Build for Impact 2026</h2>
                            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                                Hosted by Build Learning during the 40th AAAI Conference and Singapore AI Research Week. EatLa was
                                selected as a finalist for a two-day prototype that treats food waste as a systems problem — and
                                SEA-LION as the cook who already knows the region.
                            </p>
                            <div className="mt-8 flex flex-wrap justify-center gap-3">
                                <Button size="lg" asChild>
                                    <Link href="/signup">Try EatLa</Link>
                                </Button>
                                <Button size="lg" variant="outline" asChild>
                                    <a
                                        href="https://www.sginnovate.com/event/2026-build-impact-hackathon"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        About the hackathon
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-border">
                <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <p>EatLa · Finalist, Build for Impact Hackathon 2026</p>
                    <p>Built with SEA-LION, for Southeast Asian home cooks.</p>
                </div>
            </footer>
        </div>
    );
}

function LandingFridge() {
    return (
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="relative overflow-hidden rounded-3xl border-4 border-slate-400 bg-gradient-to-b from-slate-200 to-slate-300 shadow-2xl">
                <div className="absolute right-3 top-1/2 z-20 h-28 w-3 -translate-y-1/2 rounded-full bg-gradient-to-r from-slate-400 to-slate-500 shadow-inner" />
                <div className="relative flex min-h-12 items-center overflow-hidden border-b-4 border-slate-400 bg-gradient-to-b from-slate-700 to-slate-800 px-3 py-2 text-slate-100">
                    <p className="text-xs font-medium text-amber-200">Kangkong expires tomorrow · cook it tonight</p>
                </div>
                <div className="relative min-h-[340px] bg-gradient-to-b from-[#e8eef3] to-[#d9e2eb] p-5">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/5" />
                    <div className="relative z-10 space-y-4">
                        {demoShelves.map((shelf) => (
                            <div key={shelf[0].name}>
                                <div className="grid grid-cols-3 gap-3">
                                    {shelf.map((item) => (
                                        <div key={item.name} className="flex flex-col items-center">
                                            <div className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-white bg-white/90 shadow-md">
                                                <span className="px-1 text-center text-[11px] font-semibold leading-tight text-slate-700 sm:text-xs">
                                                    {item.name}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-[10px] font-medium text-slate-500">{item.qty}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="relative mx-[-0.5rem] mt-3 h-3">
                                    <div className="absolute inset-x-0 h-1.5 border-y border-cyan-300/30 bg-gradient-to-b from-cyan-100/60 to-cyan-200/40" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="h-3 border-t border-slate-400 bg-gradient-to-b from-slate-300 to-slate-400" />
            </div>
        </div>
    );
}
