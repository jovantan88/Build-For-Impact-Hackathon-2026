import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthForm } from "@/components/auth-form";
import { login } from "../actions";

const loginFields = [
    { name: "email", label: "Email", type: "email", placeholder: "you@example.com" },
    { name: "password", label: "Password", type: "password", placeholder: "••••••••" },
];

async function loginAction(_prevState: { error: string | null }, formData: FormData) {
    "use server";
    return login(formData);
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-6xl overflow-hidden py-0">
                <div className="grid lg:grid-cols-2">
                    {/* Left side - Login Form */}
                    <div className="p-8">
                        <CardHeader className="text-center px-0">
                            <CardTitle className="text-3xl font-medium text-white font-heading">EatLa!</CardTitle>
                            <CardDescription className="text-base">Sign in to manage your ingredients</CardDescription>
                        </CardHeader>
                        <CardContent className="px-0">
                            <AuthForm action={loginAction} submitLabel="Sign In" loadingLabel="Signing in..." fields={loginFields} />
                        </CardContent>
                        <CardFooter className="justify-center px-0 pt-2">
                            <p className="text-sm text-muted-foreground">
                                Don&apos;t have an account?{" "}
                                <Link href="/signup" className="text-primary hover:underline">
                                    Sign up
                                </Link>
                            </p>
                        </CardFooter>
                    </div>

                    {/* Right side - Chef Image */}
                    <div className="hidden lg:block relative">
                        <img
                            src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=80"
                            alt="Professional chef cooking"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        <div className="absolute bottom-8 left-8 right-8 text-white">
                            <h2 className="text-3xl font-bold font-heading mb-2">Cook smarter, waste less</h2>
                            <p className="text-lg text-white/90">Transform your ingredients into delicious recipes with AI</p>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
