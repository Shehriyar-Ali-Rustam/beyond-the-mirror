import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getGameSave(game: "pet" | "cozy"): Promise<unknown> {
  const supabase = await createClient();
  const { data } = await supabase.from("game_saves").select("data").eq("game", game).maybeSingle();
  return data?.data ?? null;
}
