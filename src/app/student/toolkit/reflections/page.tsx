import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WellbeingShell } from "@/components/wellbeing/shell";
import { Reflections, type ReflectionEntry } from "@/components/wellbeing/reflections";

export const metadata: Metadata = { title: "Daily Reflection Cards" };

export default async function ReflectionsPage() {
  const viewer = await requireRole("student");
  const supabase = await createClient();
  const { data } = await supabase
    .from("reflection_entries")
    .select("id, entry_on, question_id, category, question, answer, followups, skipped")
    .order("entry_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  return (
    <WellbeingShell slug="reflections">
      <Reflections entries={(data ?? []) as ReflectionEntry[]} seed={viewer.id} />
    </WellbeingShell>
  );
}
