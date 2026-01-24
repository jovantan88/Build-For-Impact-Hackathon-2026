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
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-primary">E-Fridge</CardTitle>
                    <CardDescription>Sign in to manage your ingredients</CardDescription>
                </CardHeader>
                <CardContent>
                    <AuthForm action={loginAction} submitLabel="Sign In" loadingLabel="Signing in..." fields={loginFields} />
                </CardContent>
                <CardFooter className="justify-center">
                    <p className="text-sm text-muted-foreground">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="text-primary hover:underline">
                            Sign up
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
