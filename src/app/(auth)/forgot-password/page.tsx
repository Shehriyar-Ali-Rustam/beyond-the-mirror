import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/components/auth/forgot-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-[2rem] leading-tight text-ink">Forgot your password?</h1>
      <p className="mt-2 text-[15px] text-ink-2">Enter your email and we&apos;ll send you a link to choose a new one.</p>
      <div className="mt-8">
        <ForgotForm />
      </div>
      <p className="mt-8 text-sm text-ink-2">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
