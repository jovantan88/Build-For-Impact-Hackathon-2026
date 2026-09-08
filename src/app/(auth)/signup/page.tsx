import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { signup } from "../actions";

export const metadata: Metadata = {
    title: "Create account",
};

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
        <AuthShell
            title="Create your account"
            description="Start managing groceries the way a SEA kitchen actually works"
            imageTitle="Your next meal is already in the fridge"
            imageSubtitle="Scan a receipt. EatLa keeps the rest honest."
            footer={
                <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/login" className="text-primary hover:underline">
                        Sign in
                    </Link>
                </p>
            }
        >
            <AuthForm action={signupAction} submitLabel="Create Account" loadingLabel="Creating account..." fields={signupFields} />
        </AuthShell>
    );
}
