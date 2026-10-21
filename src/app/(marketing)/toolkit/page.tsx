import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { ToolGrid } from "@/components/toolkit/toolkit-views";

export const metadata: Metadata = {
  title: "Self-help toolkit",
  description: "Free, private activities for overthinking, exam stress, hard conversations and bad days. No account needed.",
};

export default function PublicToolkit() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
      <div className="mb-12 max-w-2xl animate-fade-up">
        <p className="text-sm font-medium text-primary">The toolkit</p>
        <h1 className="mt-2 font-display text-4xl leading-tight text-ink sm:text-5xl">Help for the moments in between.</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
          Short, practical activities you can do on your own — whenever you need them. No account needed.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3.5 py-1.5 text-sm text-primary-soft-ink">
          <ShieldCheck className="size-4" /> Nothing you type here is saved or sent anywhere.
        </p>
      </div>
      <ToolGrid base="/toolkit" />
    </div>
  );
}
