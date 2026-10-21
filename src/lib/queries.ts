import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Conversation, Profile } from "@/lib/types";

export function isUnreadFor(viewer: Pick<Profile, "id" | "role">, c: Conversation) {
  if (!c.last_message_sender || c.last_message_sender === viewer.id) return false;
  const lastRead = viewer.role === "student" ? c.student_last_read_at : c.counselor_last_read_at;
  return !lastRead || new Date(c.last_message_at) > new Date(lastRead);
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
  const column = viewer.role === "student" ? "student_id" : "counselor_id";
  const { data } = await supabase
    .from("conversations")
    .select("*")
    .eq(column, viewer.id)
    .neq("last_message_sender", viewer.id)
    .limit(500);
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
