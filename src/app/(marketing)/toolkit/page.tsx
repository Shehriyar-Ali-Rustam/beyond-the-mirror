import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { ToolGrid } from "@/components/toolkit/toolkit-views";
import { PageHero } from "@/components/visual/page-hero";

export const metadata: Metadata = {
  title: "Self-help toolkit",
  description: "Free, private activities for overthinking, exam stress, hard conversations and bad days. No account needed.",
};

export default function PublicToolkit() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <PageHero
        eyebrow="The toolkit"
        title="Help for the moments in between."
        description="Short, practical activities you can do on your own, whenever you need them. No account needed."
        illustration="a-moment-to-relax"
        tone="mint"
      >
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface/80 px-3.5 py-1.5 text-sm text-primary-soft-ink backdrop-blur">
          <ShieldCheck className="size-4" /> Nothing you type here is saved or sent anywhere.
        </p>
      </PageHero>
      <ToolGrid base="/toolkit" />
    </div>
  );
}
