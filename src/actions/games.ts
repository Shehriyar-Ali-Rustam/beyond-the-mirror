"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";

const MAX_BYTES = 48 * 1024;

/** Stores a game's progress for the signed-in user only (row level security keeps it private). */
export async function saveGame(game: string, data: unknown) {
  const viewer = await getViewer();
  if (!viewer || viewer.status !== "active") return;
  if (!z.enum(["pet", "cozy"]).safeParse(game).success) return;
  const json = JSON.stringify(data ?? null);
  if (json.length > MAX_BYTES) return;
  const supabase = await createClient();
  await supabase.from("game_saves").upsert({ user_id: viewer.id, game, data: JSON.parse(json), updated_at: new Date().toISOString() });
}
