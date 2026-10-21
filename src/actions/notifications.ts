"use server";

import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";

export async function markAllNotificationsRead() {
  const viewer = await getViewer();
  if (!viewer) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null).eq("user_id", viewer.id);
}

export async function markNotificationRead(id: string) {
  const viewer = await getViewer();
  if (!viewer) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", viewer.id);
}
