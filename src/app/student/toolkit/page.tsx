import type { Metadata } from "next";
import { PageHero } from "@/components/visual/page-hero";
import { ToolGrid } from "@/components/toolkit/toolkit-views";

export const metadata: Metadata = { title: "Toolkit" };

export default function StudentToolkit() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHero illustration="a-moment-to-relax" tone="mint"
        title="Your toolkit"
        description="Short, practical activities for the moments in between. Use them on your own, or bring what you find to your counselor."
      />
      <ToolGrid base="/student/toolkit" />
    </div>
  );
}
