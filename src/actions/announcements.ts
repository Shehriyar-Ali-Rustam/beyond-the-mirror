"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { friendlyError } from "@/lib/utils";
import { announcementSchema, fieldErrors, uuid } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

export async function createAnnouncement(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const viewer = await assertRole("counselor", "admin");
  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    audience: formData.get("audience"),
    pinned: formData.get("pinned") === "on",
  });
  if (!parsed.success) return { ok: false, error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };
  if (viewer.role === "counselor" && parsed.data.audience === "everyone") {
    return { ok: false, error: "Counselors can post to students or staff." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({ ...parsed.data, author_id: viewer.id });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Announcement published." };
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  await assertRole("counselor", "admin");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid id." };
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function togglePin(id: string, pinned: boolean): Promise<ActionResult> {
  await assertRole("counselor", "admin");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid id." };
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").update({ pinned }).eq("id", id);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/", "layout");
  return { ok: true };
}
