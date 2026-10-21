"use client";

import type { ToolSlug } from "@/lib/toolkit";
import { ToolContextProvider, type ToolContext } from "./shared";
import { FeelingsTool } from "./feelings";
import { UntangleTool } from "./untangle";
import { ResetTool } from "./reset";
import { ExamsTool } from "./exams";
import { SayItTool } from "./say-it";
import { SituationsTool } from "./situations";
import { LettersTool } from "./letters";

const COMPONENTS: Record<ToolSlug, () => React.ReactElement> = {
  feelings: FeelingsTool,
  untangle: UntangleTool,
  reset: ResetTool,
  exams: ExamsTool,
  "say-it": SayItTool,
  situations: SituationsTool,
  letters: LettersTool,
};

export function ToolRenderer({ slug, context }: { slug: ToolSlug; context: ToolContext }) {
  const Tool = COMPONENTS[slug];
  return (
    <ToolContextProvider value={context}>
      <Tool />
    </ToolContextProvider>
  );
}
