"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { friendlyError } from "@/lib/utils";
import { getFeed, inspectImage, removeImage, uploadImage, type Post } from "@/lib/community";
import { uuid } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

const postSchema = z.object({
  body: z.string().trim().min(1, "Write something first.").max(2000, "Keep it under 2000 characters."),
  kind: z.enum(["advice", "share"]),
  anonymous: z.boolean(),
});

export async function createPost(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const viewer = await assertRole("student", "counselor");
  const parsed = postSchema.safeParse({
    body: formData.get("body") ?? "",
    kind: formData.get("kind"),
    anonymous: viewer.role === "student" && formData.get("anonymous") === "on",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your post." };

  let path: string | null = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const image = await inspectImage(file);
    if (!image.ok) return { ok: false, error: image.error };
    path = await uploadImage(image.bytes, image.type, image.ext);
    if (!path) return { ok: false, error: "We couldn't upload that photo. Please try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_post", {
    p_kind: parsed.data.kind,
    p_body: parsed.data.body,
    p_image_path: path ?? "",
    p_anonymous: parsed.data.anonymous,
  });
  if (error) {
    await removeImage(path);
    return { ok: false, error: friendlyError(error) };
  }
  revalidatePath(`/${viewer.role}/community`);
  return { ok: true, message: "Posted" };
}

export async function loadMorePosts(before: string): Promise<Post[]> {
  await assertRole("student", "counselor", "admin");
  if (!z.iso.datetime({ offset: true }).safeParse(before).success) return [];
  return getFeed(before);
}

export async function addComment(input: { postId: string; body: string; anonymous: boolean }): Promise<ActionResult> {
  const viewer = await assertRole("student", "counselor", "admin");
  const parsed = z
    .object({ postId: uuid, body: z.string().trim().min(1, "Write a reply first.").max(1000, "Keep it under 1000 characters."), anonymous: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid reply." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_comment", {
    p_post: parsed.data.postId,
    p_body: parsed.data.body,
    p_anonymous: viewer.role === "student" && parsed.data.anonymous,
  });
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true };
}

export async function toggleReaction(postId: string): Promise<ActionResult<{ reacted: boolean }>> {
  await assertRole("student", "counselor", "admin");
  if (!uuid.safeParse(postId).success) return { ok: false, error: "Invalid post." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_reaction", { p_post: postId });
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true, data: { reacted: Boolean(data) } };
}

export async function deletePost(postId: string): Promise<ActionResult> {
  const viewer = await assertRole("student", "counselor", "admin");
  if (!uuid.safeParse(postId).success) return { ok: false, error: "Invalid post." };
  const supabase = await createClient();
  const { data: path, error } = await supabase.rpc("delete_post", { p_post: postId });
  if (error) return { ok: false, error: friendlyError(error) };
  await removeImage(path);
  revalidatePath(`/${viewer.role}/community`);
  return { ok: true };
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  await assertRole("student", "counselor", "admin");
  if (!uuid.safeParse(commentId).success) return { ok: false, error: "Invalid reply." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_comment", { p_comment: commentId });
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true };
}

export async function moderatePost(postId: string, hidden: boolean): Promise<ActionResult> {
  const viewer = await assertRole("counselor", "admin");
  if (!uuid.safeParse(postId).success) return { ok: false, error: "Invalid post." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_post", { p_post: postId, p_hidden: hidden });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath(`/${viewer.role}/community`);
  return { ok: true };
}

export async function reportContent(input: { postId: string; commentId?: string; reason?: string }): Promise<ActionResult> {
  await assertRole("student", "counselor", "admin");
  const parsed = z.object({ postId: uuid, commentId: uuid.optional(), reason: z.string().trim().max(300).optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid report." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_content", {
    p_post: parsed.data.postId,
    p_comment: (parsed.data.commentId ?? null) as unknown as string,
    p_reason: parsed.data.reason ?? "",
  });
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true, message: "Thanks for letting us know. A counselor will take a look." };
}
