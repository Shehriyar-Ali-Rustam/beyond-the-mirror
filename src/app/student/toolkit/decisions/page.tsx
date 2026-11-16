import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WellbeingShell } from "@/components/wellbeing/shell";
import { Decisions, type Decision } from "@/components/wellbeing/decisions";

export const metadata: Metadata = { title: "Decision-Making Assistant" };

export default async function DecisionsPage() {
  await requireRole("student");
  const supabase = await createClient();
  const { data } = await supabase
    .from("decisions")
    .select("id, title, area, situation, options, priorities, reflection, next_step, chosen, status, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);
  return (
    <WellbeingShell slug="decisions">
      <Decisions decisions={(data ?? []) as unknown as Decision[]} />
    </WellbeingShell>
  );
}
