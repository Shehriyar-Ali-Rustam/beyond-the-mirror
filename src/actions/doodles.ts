"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { friendlyError } from "@/lib/utils";
import { uuid } from "@/lib/validation";
import { inspectImage, removeImage, uploadImage } from "@/lib/community";
import { getDoodleWall, type Doodle } from "@/lib/doodles";
import type { ActionResult } from "@/lib/types";

export async function postDoodle(formData: FormData): Promise<ActionResult> {
  await assertRole("student", "counselor", "admin");
  const word = z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z ]{1,23}$/, "Use a simple word or two (letters only).")
    .safeParse(formData.get("word"));
  if (!word.success) return { ok: false, error: word.error.issues[0]?.message ?? "Invalid word." };
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Draw something first." };
  const image = await inspectImage(file);
  if (!image.ok || image.ext !== "png") return { ok: false, error: "That drawing couldn't be saved." };

  const path = await uploadImage(image.bytes, image.type, "png", "doodles");
  if (!path) return { ok: false, error: "We couldn't save your doodle. Please try again." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_doodle", { p_word: word.data, p_image_path: path });
  if (error) {
    await removeImage(path);
    return { ok: false, error: friendlyError(error) };
  }
  return { ok: true, message: "Posted to the Doodle Wall!" };
}

export async function loadDoodles(before?: string): Promise<Doodle[]> {
  await assertRole("student", "counselor", "admin");
  if (before && !z.iso.datetime({ offset: true }).safeParse(before).success) return [];
  return getDoodleWall(before);
}

export async function guessDoodle(id: string, guess: string): Promise<ActionResult<{ correct: boolean; answer: string | null; attempts: number }>> {
  await assertRole("student", "counselor", "admin");
  const parsed = z.object({ id: uuid, guess: z.string().trim().min(1).max(40) }).safeParse({ id, guess });
  if (!parsed.success) return { ok: false, error: "Type a guess first." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("guess_doodle", { p_id: parsed.data.id, p_guess: parsed.data.guess });
  if (error) return { ok: false, error: friendlyError(error) };
  const r = data as { correct: boolean; answer: string | null; attempts: number };
  return { ok: true, data: r };
}

export async function revealDoodle(id: string): Promise<ActionResult<{ answer: string }>> {
  await assertRole("student", "counselor", "admin");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid doodle." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reveal_doodle", { p_id: id });
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true, data: { answer: data ?? "" } };
}

export async function removeDoodle(id: string): Promise<ActionResult> {
  await assertRole("student", "counselor", "admin");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid doodle." };
  const supabase = await createClient();
  const { data: path, error } = await supabase.rpc("delete_doodle", { p_id: id });
  if (error) return { ok: false, error: friendlyError(error) };
  await removeImage(path);
  return { ok: true };
}

export async function reportDoodle(id: string): Promise<ActionResult> {
  await assertRole("student", "counselor", "admin");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid doodle." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_doodle", { p_id: id });
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true, message: "Thanks. A counselor will take a look." };
}

export async function hideDoodle(id: string, hidden: boolean): Promise<ActionResult> {
  await assertRole("counselor", "admin");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid doodle." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_doodle", { p_id: id, p_hidden: hidden });
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true };
}
