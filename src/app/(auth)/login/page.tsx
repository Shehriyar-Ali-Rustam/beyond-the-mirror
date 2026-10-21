import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, homeFor } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const viewer = await getViewer();
  if (viewer) redirect(homeFor(viewer));
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  const linkError = sp.error === "link";

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-[2rem] leading-tight text-ink">Welcome back</h1>
      <p className="mt-2 text-[15px] text-ink-2">Log in to your student, counselor, or admin account.</p>
      <div className="mt-8">
        <LoginForm next={next} linkError={linkError} />
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
