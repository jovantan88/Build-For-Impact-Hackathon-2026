import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandMark } from "@/components/brand-mark";

interface AuthShellProps {
    title: string;
    description: string;
    children: React.ReactNode;
    footer: React.ReactNode;
    imageTitle: string;
    imageSubtitle: string;
}

export function AuthShell({ title, description, children, footer, imageTitle, imageSubtitle }: AuthShellProps) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-6xl overflow-hidden py-0">
                <div className="grid lg:grid-cols-2">
                    <div className="p-8">
                        <CardHeader className="text-center px-0 space-y-2">
                            <BrandMark className="text-3xl" />
                            <CardTitle className="text-lg font-medium text-foreground">{title}</CardTitle>
                            <CardDescription className="text-base">{description}</CardDescription>
                        </CardHeader>
                        <CardContent className="px-0">{children}</CardContent>
                        <CardFooter className="justify-center px-0 pt-2">{footer}</CardFooter>
                    </div>

                    <div className="hidden lg:block relative min-h-[480px]">
                        <Image
                            src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=80"
                            alt="Home cooking in a kitchen"
                            fill
                            className="object-cover"
                            sizes="50vw"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                        <div className="absolute bottom-8 left-8 right-8 text-white">
                            <h2 className="text-3xl font-heading font-semibold mb-2">{imageTitle}</h2>
                            <p className="text-lg text-white/90">{imageSubtitle}</p>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
