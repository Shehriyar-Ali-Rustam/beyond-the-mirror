import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, homeFor } from "@/lib/auth";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const viewer = await getViewer();
  if (viewer) redirect(homeFor(viewer));
  const sp = await searchParams;
  const role = sp.role === "counselor" ? "counselor" : "student";

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-[2rem] leading-tight text-ink">Create your account</h1>
      <p className="mt-2 text-[15px] text-ink-2">It takes a minute. Your messages stay between you and your counselor.</p>
      <div className="mt-8">
        <RegisterForm initialRole={role} />
      </div>
      <p className="mt-8 text-sm text-ink-2">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
