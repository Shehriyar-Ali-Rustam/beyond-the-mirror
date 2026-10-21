import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";

export const metadata: Metadata = { title: "Forgot your password?" };

export default function ForgotPasswordPage() {
  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-[2rem] leading-tight text-ink">Forgot your password?</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
        Accounts here don&apos;t use email, so resets are done in person — it only takes a minute.
      </p>
      <div className="mt-8 space-y-3">
        {[
          { t: "Ask your counselor or the school admin", d: "They can set a temporary password for you from the admin panel." },
          { t: "Log in with the temporary password", d: "Then choose a new one under Settings → Password." },
        ].map((s, i) => (
          <div key={s.t} className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-soft-ink">
              {i + 1}
            </span>
            <div>
              <p className="font-medium text-ink">{s.t}</p>
              <p className="mt-0.5 text-sm text-ink-2">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-8 flex items-center gap-2 text-sm text-ink-2">
        <KeyRound className="size-4 text-ink-3" />
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
