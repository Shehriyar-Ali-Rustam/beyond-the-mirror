"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { friendlyError } from "@/lib/utils";
import { firstError, uuid } from "@/lib/validation";
import { ACADEMIC_PRESSURES, BEHAVIOURS, DECISION_AREAS, FEELINGS, REFLECTION_CATEGORIES, STRESS_FREQUENCY, STRESS_SOURCES, TASK_KINDS } from "@/lib/wellbeing";
import type { ActionResult } from "@/lib/types";

// Personal records belong to whoever is signed in; row level security enforces it again in the database.
const me = () => assertRole("student", "counselor", "admin");
const keys = <T extends Record<string, unknown>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];
const date = z.iso.date("Choose a valid date.");
const text = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters.`).optional().transform((v) => v || null);
const done = (path: string): ActionResult => {
  revalidatePath(`/student/toolkit/${path}`);
  revalidatePath("/student/toolkit");
  return { ok: true };
};

async function remove(table: "behaviour_logs" | "behaviour_goals" | "decisions" | "stress_entries" | "academic_tasks" | "academic_reviews" | "reflection_entries", id: string, path: string) {
  await me();
  if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid request." } as ActionResult;
  const supabase = await createClient();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return { ok: false, error: friendlyError(error) } as ActionResult;
  return done(path);
}

// ------------------------------------------------------------------ behaviour
const logSchema = z.object({
  id: uuid.optional(),
  logged_on: date,
  behaviour: z.enum(keys(BEHAVIOURS)),
  label: text(80),
  hours: z.number().min(0).max(24).nullable(),
  before_context: text(500),
  feeling: z.enum(keys(FEELINGS)).nullable(),
  after_effect: text(500),
  impact: z.number().int().min(-2).max(2).nullable(),
});

export async function saveBehaviourLog(input: z.input<typeof logSchema>): Promise<ActionResult> {
  await me();
  const parsed = logSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { id, ...row } = parsed.data;
  const supabase = await createClient();
  const { error } = id ? await supabase.from("behaviour_logs").update(row).eq("id", id) : await supabase.from("behaviour_logs").insert(row);
  if (error) return { ok: false, error: friendlyError(error) };
  return done("tracker");
}
export const deleteBehaviourLog = async (id: string) => remove("behaviour_logs", id, "tracker");

const goalSchema = z.object({
  id: uuid.optional(),
  behaviour: z.enum(keys(BEHAVIOURS)),
  title: z.string().trim().min(3, "Describe the goal in a few words.").max(120),
  target: text(200),
  status: z.enum(["active", "done", "dropped"]).default("active"),
});
export async function saveBehaviourGoal(input: z.input<typeof goalSchema>): Promise<ActionResult> {
  await me();
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { id, ...row } = parsed.data;
  const supabase = await createClient();
  const { error } = id ? await supabase.from("behaviour_goals").update(row).eq("id", id) : await supabase.from("behaviour_goals").insert(row);
  if (error) return { ok: false, error: friendlyError(error) };
  return done("tracker");
}
export const deleteBehaviourGoal = async (id: string) => remove("behaviour_goals", id, "tracker");

// ------------------------------------------------------------------ decisions
const optionSchema = z.object({
  id: z.string().regex(/^[a-z0-9]{1,12}$/),
  label: z.string().trim().min(1, "Give each option a name.").max(120),
  pros: z.array(z.string().trim().min(1).max(200)).max(10),
  cons: z.array(z.string().trim().min(1).max(200)).max(10),
  outcome: z.string().trim().max(600),
  risks: z.string().trim().max(600),
  scores: z.record(z.string().regex(/^[a-z0-9]{1,12}$/), z.number().int().min(0).max(5)),
});
const decisionSchema = z.object({
  id: uuid.optional(),
  title: z.string().trim().min(3, "Give the decision a short title.").max(120),
  area: z.enum(keys(DECISION_AREAS)),
  situation: text(2000),
  options: z.array(optionSchema).max(6),
  priorities: z.array(z.object({ id: z.string().regex(/^[a-z0-9]{1,12}$/), label: z.string().trim().min(1).max(60), weight: z.number().int().min(1).max(5) })).max(8),
  reflection: text(2000),
  next_step: text(300),
  chosen: z.string().max(40).nullable(),
  status: z.enum(["open", "decided"]),
});
export async function saveDecision(input: z.input<typeof decisionSchema>): Promise<ActionResult<{ id: string }>> {
  await me();
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { id, ...row } = parsed.data;
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("decisions").update(row).eq("id", id);
    if (error) return { ok: false, error: friendlyError(error) };
    revalidatePath("/student/toolkit/decisions");
    return { ok: true, data: { id } };
  }
  const { data, error } = await supabase.from("decisions").insert(row).select("id").single();
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/student/toolkit/decisions");
  return { ok: true, data: { id: data.id } };
}
export const deleteDecision = async (id: string) => remove("decisions", id, "decisions");

// ------------------------------------------------------------------ stress
const level = z.number().int().min(0).max(3);
const stressSchema = z.object({
  id: uuid.optional(),
  entry_on: date,
  sources: z.array(z.enum(keys(STRESS_SOURCES))).min(1, "Choose at least one source of stress.").max(8),
  other_source: text(80),
  intensity: z.number().int().min(1).max(5),
  frequency: z.enum(keys(STRESS_FREQUENCY)),
  impact_concentration: level,
  impact_sleep: level,
  impact_motivation: level,
  impact_relationships: level,
  impact_daily: level,
  triggers: text(500),
  helped: text(500),
});
export async function saveStressEntry(input: z.input<typeof stressSchema>): Promise<ActionResult> {
  await me();
  const parsed = stressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { id, ...row } = parsed.data;
  const supabase = await createClient();
  const { error } = id ? await supabase.from("stress_entries").update(row).eq("id", id) : await supabase.from("stress_entries").insert(row);
  if (error) return { ok: false, error: friendlyError(error) };
  return done("stress");
}
export const deleteStressEntry = async (id: string) => remove("stress_entries", id, "stress");

// ------------------------------------------------------------------ academics
const taskSchema = z.object({
  id: uuid.optional(),
  title: z.string().trim().min(2, "Give the task a name.").max(120),
  kind: z.enum(keys(TASK_KINDS)),
  subject: text(60),
  due_on: date,
  est_hours: z.number().min(0.5, "Estimate at least half an hour.").max(200),
  importance: z.number().int().min(1).max(3),
  progress: z.number().int().min(0).max(100),
  steps: z.array(z.object({ id: z.string().regex(/^[a-z0-9]{1,12}$/), label: z.string().trim().min(1).max(160), done: z.boolean() })).max(20),
  done: z.boolean(),
});
export async function saveTask(input: z.input<typeof taskSchema>): Promise<ActionResult> {
  await me();
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { id, done: finished, ...rest } = parsed.data;
  const row = { ...rest, progress: finished ? 100 : rest.progress, done_at: finished ? new Date().toISOString() : null };
  const supabase = await createClient();
  const { error } = id ? await supabase.from("academic_tasks").update(row).eq("id", id) : await supabase.from("academic_tasks").insert(row);
  if (error) return { ok: false, error: friendlyError(error) };
  return done("academics");
}
export const deleteTask = async (id: string) => remove("academic_tasks", id, "academics");

export async function logStudySession(input: { taskId: string | null; minutes: number }): Promise<ActionResult> {
  await me();
  const parsed = z.object({ taskId: uuid.nullable(), minutes: z.number().int().min(1).max(240) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid session." };
  const supabase = await createClient();
  const { error } = await supabase.from("study_sessions").insert({ task_id: parsed.data.taskId, minutes: parsed.data.minutes });
  if (error) return { ok: false, error: friendlyError(error) };
  return done("academics");
}

const reviewSchema = z.object({
  id: uuid.optional(),
  kind: z.enum(["checkin", "weekly"]),
  week_start: date,
  pressures: z.array(z.enum(keys(ACADEMIC_PRESSURES))).max(8),
  level: z.number().int().min(1).max(5).nullable(),
  went_well: text(1000),
  difficult: text(1000),
  improve: text(1000),
  note: text(1000),
});
export async function saveAcademicReview(input: z.input<typeof reviewSchema>): Promise<ActionResult> {
  await me();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { id, ...row } = parsed.data;
  const supabase = await createClient();
  const { error } = id ? await supabase.from("academic_reviews").update(row).eq("id", id) : await supabase.from("academic_reviews").insert(row);
  if (error) return { ok: false, error: friendlyError(error) };
  return done("academics");
}
export const deleteAcademicReview = async (id: string) => remove("academic_reviews", id, "academics");

// ------------------------------------------------------------------ reflections
const reflectionSchema = z.object({
  id: uuid.optional(),
  entry_on: date,
  question_id: z.string().regex(/^[a-z0-9_-]{1,40}$/),
  category: z.enum(keys(REFLECTION_CATEGORIES)),
  question: z.string().trim().min(3).max(300),
  answer: text(4000),
  followups: z.array(z.object({ q: z.string().trim().min(1).max(300), a: z.string().trim().max(2000) })).max(3),
  skipped: z.boolean(),
});
export async function saveReflection(input: z.input<typeof reflectionSchema>): Promise<ActionResult> {
  await me();
  const parsed = reflectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { id, ...row } = parsed.data;
  const supabase = await createClient();
  const { error } = id ? await supabase.from("reflection_entries").update(row).eq("id", id) : await supabase.from("reflection_entries").insert(row);
  if (error) return { ok: false, error: friendlyError(error) };
  return done("reflections");
}
export const deleteReflection = async (id: string) => remove("reflection_entries", id, "reflections");
