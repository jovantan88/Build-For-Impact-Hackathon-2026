import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { login } from "../actions";

export const metadata: Metadata = {
    title: "Sign in",
};

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
        <AuthShell
            title="Welcome back"
            description="Sign in to manage your ingredients"
            imageTitle="Cook smarter, waste less"
            imageSubtitle="Turn what you already bought into dinner."
            footer={
                <p className="text-sm text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="text-primary hover:underline">
                        Sign up
                    </Link>
                </p>
            }
        >
            <AuthForm action={loginAction} submitLabel="Sign In" loadingLabel="Signing in..." fields={loginFields} />
        </AuthShell>
    );
}
