import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthForm } from "@/components/auth-form";
import { signup } from "../actions";

const signupFields = [
    { name: "email", label: "Email", type: "email", placeholder: "you@example.com" },
    { name: "password", label: "Password", type: "password", placeholder: "••••••••" },
    { name: "confirmPassword", label: "Confirm Password", type: "password", placeholder: "••••••••" },
];

async function signupAction(_prevState: { error: string | null }, formData: FormData) {
    "use server";
    return signup(formData);
}

export default function SignupPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-primary">Create Account</CardTitle>
                    <CardDescription>Start managing your groceries smarter</CardDescription>
                </CardHeader>
                <CardContent>
                    <AuthForm action={signupAction} submitLabel="Create Account" loadingLabel="Creating account..." fields={signupFields} />
                </CardContent>
                <CardFooter className="justify-center">
                    <p className="text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link href="/login" className="text-primary hover:underline">
                            Sign in
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
