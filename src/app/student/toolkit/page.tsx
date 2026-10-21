import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/app-shell";
import { ToolGrid } from "@/components/toolkit/toolkit-views";

export const metadata: Metadata = { title: "Toolkit" };

export default function StudentToolkit() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Your toolkit"
        description="Short, practical activities for the moments in between. Use them on your own, or bring what you find to your counselor."
      />
      <ToolGrid base="/student/toolkit" />
    </div>
  );
}
