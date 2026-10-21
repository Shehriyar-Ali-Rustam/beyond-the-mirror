import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, homeFor } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/auth/setup-notice";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const viewer = await getViewer();
  if (viewer) redirect(homeFor(viewer));
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-[2rem] leading-tight text-ink">Welcome back</h1>
      <p className="mt-2 text-[15px] text-ink-2">Log in with your username and password.</p>
      <div className="mt-8">
        {isSupabaseConfigured() ? <LoginForm next={next} /> : <SetupNotice />}
      </div>
      <p className="mt-8 text-sm text-ink-2">
        New here?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
