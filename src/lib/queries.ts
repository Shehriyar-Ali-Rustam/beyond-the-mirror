import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Conversation, Profile } from "@/lib/types";

/** Did the other side speak last, after this viewer last read the thread? */
export function isUnreadFor(viewer: Pick<Profile, "role">, c: Conversation) {
  const student = viewer.role === "student";
  if (!c.last_message_preview || c.last_from_student === student) return false;
  const lastRead = student ? c.student_last_read_at : c.counselor_last_read_at;
  return !lastRead || new Date(c.last_message_at) > new Date(lastRead);
}

/** True when the viewer sent the latest message. */
export function sentLastBy(viewer: Pick<Profile, "role">, c: Conversation) {
  return c.last_from_student === (viewer.role === "student");
}

export const getUnreadNotificationCount = cache(async (userId: string) => {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
});

export const getUnreadConversationCount = cache(async (viewer: Profile) => {
  const supabase = await createClient();
  // Row Level Security already limits students to their own conversations
  // (including anonymous ones, which have no student_id).
  let query = supabase.from("conversations").select("*").limit(500);
  if (viewer.role !== "student") query = query.eq("counselor_id", viewer.id);
  const { data } = await query;
  return (data ?? []).filter((c) => isUnreadFor(viewer, c)).length;
});

export const getCounselor = cache(async (counselorId: string | null) => {
  if (!counselorId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, title, bio, specialties, office_hours, presence, whatsapp, avatar_hue, status, role")
    .eq("id", counselorId)
    .maybeSingle();
  return data;
});

export type CounselorPublic = NonNullable<Awaited<ReturnType<typeof getCounselor>>>;
