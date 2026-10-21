import type { Metadata } from "next";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-[2rem] leading-tight text-ink">Choose a new password</h1>
      <p className="mt-2 text-[15px] text-ink-2">Make it something you don&apos;t use anywhere else.</p>
      <div className="mt-8">
        <ResetForm />
      </div>
    </div>
  );
}
