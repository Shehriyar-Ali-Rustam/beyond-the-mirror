import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { StressEntry } from "@/lib/insights";
import { WellbeingShell } from "@/components/wellbeing/shell";
import { StressAnalysis } from "@/components/wellbeing/stress";

export const metadata: Metadata = { title: "Stress Pattern Analysis" };

export default async function StressPage() {
  await requireRole("student");
  const supabase = await createClient();
  const { data } = await supabase
    .from("stress_entries")
    .select("id, entry_on, sources, other_source, intensity, frequency, impact_concentration, impact_sleep, impact_motivation, impact_relationships, impact_daily, triggers, helped")
    .order("entry_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);
  return (
    <WellbeingShell slug="stress">
      <StressAnalysis entries={(data ?? []) as StressEntry[]} />
    </WellbeingShell>
  );
}
