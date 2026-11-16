import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTz } from "@/lib/tz";
import { daysAgo, dayKey, now } from "@/lib/time";
import { PageHero } from "@/components/visual/page-hero";
import { ToolGrid } from "@/components/toolkit/toolkit-views";
import { WellbeingHub } from "@/components/wellbeing/hub";

export const metadata: Metadata = { title: "Toolkit" };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default async function StudentToolkit() {
  await requireRole("student");
  const supabase = await createClient();
  const tz = await getTz();
  const weekAgo = dayKey(daysAgo(7), tz);
  const today = dayKey(now(), tz);
  const [reflections, logs, stress, task, openTasks, decisions, gratitude] = await Promise.all([
    supabase.from("reflection_entries").select("id", { count: "exact", head: true }).eq("skipped", false).gte("entry_on", weekAgo),
    supabase.from("behaviour_logs").select("id", { count: "exact", head: true }).gte("logged_on", weekAgo),
    supabase.from("stress_entries").select("intensity, entry_on").order("entry_on", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("academic_tasks").select("title, due_on").is("done_at", null).gte("due_on", today).order("due_on").limit(1).maybeSingle(),
    supabase.from("academic_tasks").select("id", { count: "exact", head: true }).is("done_at", null),
    supabase.from("decisions").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.rpc("gratitude_feed", { p_limit: 50 }),
  ]);
  const recentGratitude = (gratitude.data ?? []).filter((p) => p.status === "published" && p.created_at.slice(0, 10) >= weekAgo).length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHero
        illustration="a-moment-to-relax"
        tone="mint"
        title="Your toolkit"
        description="Practical tools for understanding yourself and working through everyday difficulties. Use them on your own, or bring what you find to your counselor."
      />
      <WellbeingHub
        base="/student/toolkit"
        status={{
          reflections: reflections.count ? `${plural(reflections.count, "reflection")} this week` : "Today's card is waiting",
          tracker: logs.count ? `${plural(logs.count, "entry", "entries")} this week` : "Start logging a habit",
          stress: stress.data ? `Last entry: intensity ${stress.data.intensity} of 5` : "No entries yet",
          academics: task.data ? `Next: ${task.data.title} (${task.data.due_on})` : openTasks.count ? `${plural(openTasks.count, "open task")}` : "Add your deadlines",
          decisions: decisions.count ? `${plural(decisions.count, "decision")} in progress` : "Work through a choice",
          gratitude: recentGratitude ? `${plural(recentGratitude, "new post")} this week` : "Share something you appreciate",
        }}
      />
      <h2 className="mb-4 font-display text-2xl text-ink">Quick tools</h2>
      <ToolGrid base="/student/toolkit" />
    </div>
  );
}
