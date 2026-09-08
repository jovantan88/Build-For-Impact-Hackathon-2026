import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (supabaseUrl && supabaseKey) {
        try {
            const supabase = await createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                redirect("/fridge");
            }
        } catch {
            // Show the public landing page when auth is unavailable.
        }
    }

    return <LandingPage />;
}
