import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { daysAgo } from "@/lib/time";
import { WellbeingShell } from "@/components/wellbeing/shell";
import { Academics, type AcademicReview, type AcademicTask, type StudySession } from "@/components/wellbeing/academics";

export const metadata: Metadata = { title: "Academic Pressure Manager" };

export default async function AcademicsPage() {
  await requireRole("student");
  const supabase = await createClient();
  const since = daysAgo(45).toISOString();
  const [{ data: tasks }, { data: sessions }, { data: reviews }] = await Promise.all([
    supabase.from("academic_tasks").select("id, title, kind, subject, due_on, est_hours, importance, progress, steps, done_at").or(`done_at.is.null,done_at.gte.${since}`).order("due_on").limit(300),
    supabase.from("study_sessions").select("id, task_id, minutes, completed_at").gte("completed_at", since).order("completed_at", { ascending: false }).limit(500),
    supabase.from("academic_reviews").select("id, kind, week_start, pressures, level, went_well, difficult, improve, note, created_at").order("created_at", { ascending: false }).limit(40),
  ]);
  return (
    <WellbeingShell slug="academics">
      <Academics tasks={(tasks ?? []) as AcademicTask[]} sessions={(sessions ?? []) as StudySession[]} reviews={(reviews ?? []) as AcademicReview[]} />
    </WellbeingShell>
  );
}
