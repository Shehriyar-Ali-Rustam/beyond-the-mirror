"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { friendlyError } from "@/lib/utils";
import { uuid } from "@/lib/validation";
import { GRATITUDE_CATEGORIES, GRATITUDE_REACTIONS } from "@/lib/wellbeing";
import type { ActionResult } from "@/lib/types";
import type { Database } from "@/lib/supabase/database.types";

type Fn = Database["public"]["Functions"];
export type GratitudePost = Fn["gratitude_feed"]["Returns"][number];
export type GratitudeComment = Fn["gratitude_comments_for"]["Returns"][number];

const me = () => assertRole("student", "counselor", "admin");
const categories = Object.keys(GRATITUDE_CATEGORIES) as [keyof typeof GRATITUDE_CATEGORIES, ...(keyof typeof GRATITUDE_CATEGORIES)[]];
const refresh = () => {
  revalidatePath("/student/toolkit/gratitude");
  revalidatePath("/counselor/gratitude");
  revalidatePath("/admin/gratitude");
};

export async function loadGratitude(input: { category?: string | null; before?: string | null }): Promise<GratitudePost[]> {
  await me();
  const cat = z.enum(categories).safeParse(input.category);
  const before = z.iso.datetime({ offset: true }).safeParse(input.before);
  const supabase = await createClient();
  const { data } = await supabase.rpc("gratitude_feed", {
    p_category: cat.success ? cat.data : undefined,
    p_before: before.success ? before.data : undefined,
    p_limit: 20,
  });
  return data ?? [];
}

const postSchema = z.object({
  category: z.enum(categories),
  body: z.string().trim().min(3, "Write a few words.").max(600, "Keep it under 600 characters."),
  anonymous: z.boolean(),
  allowComments: z.boolean(),
});
export async function createGratitudePost(input: z.input<typeof postSchema>): Promise<ActionResult<{ status: string }>> {
  await me();
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your post." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_gratitude_post", {
    p_category: parsed.data.category,
    p_body: parsed.data.body,
    p_anonymous: parsed.data.anonymous,
    p_allow_comments: parsed.data.allowComments,
  });
  if (error) return { ok: false, error: friendlyError(error) };
  refresh();
  return { ok: true, data: { status: data } };
}

export async function reactGratitude(postId: string, kind: string | null): Promise<ActionResult> {
  await me();
  const parsed = z.object({ postId: uuid, kind: z.enum(Object.keys(GRATITUDE_REACTIONS) as [string, ...string[]]).nullable() }).safeParse({ postId, kind });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("react_gratitude", { p_post: parsed.data.postId, p_kind: parsed.data.kind as string });
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true };
}

export async function loadGratitudeComments(postId: string): Promise<GratitudeComment[]> {
  await me();
  if (!uuid.safeParse(postId).success) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("gratitude_comments_for", { p_post: postId });
  return data ?? [];
}

export async function addGratitudeComment(input: { postId: string; body: string; anonymous: boolean }): Promise<ActionResult> {
  await me();
  const parsed = z
    .object({ postId: uuid, body: z.string().trim().min(1, "Write a short comment.").max(280, "Keep comments under 280 characters."), anonymous: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid comment." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_gratitude_comment", { p_post: parsed.data.postId, p_body: parsed.data.body, p_anonymous: parsed.data.anonymous });
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true };
}

export async function deleteGratitudePost(postId: string): Promise<ActionResult> {
  await me();
  if (!uuid.safeParse(postId).success) return { ok: false, error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_gratitude_post", { p_post: postId });
  if (error) return { ok: false, error: friendlyError(error) };
  refresh();
  return { ok: true };
}

export async function deleteGratitudeComment(commentId: string): Promise<ActionResult> {
  await me();
  if (!uuid.safeParse(commentId).success) return { ok: false, error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_gratitude_comment", { p_comment: commentId });
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true };
}

export async function reportGratitudePost(postId: string): Promise<ActionResult> {
  await me();
  if (!uuid.safeParse(postId).success) return { ok: false, error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_gratitude_post", { p_post: postId, p_reason: "" });
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true, message: "Thank you. A counselor will take a look." };
}

export async function moderateGratitudePost(postId: string, status: "published" | "hidden"): Promise<ActionResult> {
  await assertRole("counselor", "admin");
  if (!uuid.safeParse(postId).success || !["published", "hidden"].includes(status)) return { ok: false, error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_gratitude_post", { p_post: postId, p_status: status });
  if (error) return { ok: false, error: friendlyError(error) };
  refresh();
  return { ok: true };
}

export async function moderateGratitudeComment(commentId: string, hidden: boolean): Promise<ActionResult> {
  await assertRole("counselor", "admin");
  if (!uuid.safeParse(commentId).success) return { ok: false, error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_gratitude_comment", { p_comment: commentId, p_hidden: hidden });
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true };
}
