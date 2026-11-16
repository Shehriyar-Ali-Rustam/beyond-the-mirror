import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { BehaviourLog } from "@/lib/insights";
import { WellbeingShell } from "@/components/wellbeing/shell";
import { Tracker, type BehaviourGoal } from "@/components/wellbeing/tracker";

export const metadata: Metadata = { title: "Behaviour Pattern Tracker" };

export default async function TrackerPage() {
  await requireRole("student");
  const supabase = await createClient();
  const [{ data: logs }, { data: goals }] = await Promise.all([
    supabase.from("behaviour_logs").select("id, logged_on, behaviour, label, hours, before_context, feeling, after_effect, impact").order("logged_on", { ascending: false }).order("created_at", { ascending: false }).limit(500),
    supabase.from("behaviour_goals").select("id, behaviour, title, target, status").order("created_at", { ascending: false }).limit(100),
  ]);
  return (
    <WellbeingShell slug="tracker">
      <Tracker logs={(logs ?? []) as BehaviourLog[]} goals={(goals ?? []) as BehaviourGoal[]} />
    </WellbeingShell>
  );
}
