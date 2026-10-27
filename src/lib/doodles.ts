import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signImages } from "@/lib/community";
import type { Database } from "@/lib/supabase/database.types";

type Row = Database["public"]["Functions"]["doodle_wall"]["Returns"][number];
export type Doodle = Omit<Row, "solvers" | "report_count"> & { solvers: number; report_count: number; url: string | null };

export async function getDoodleWall(before?: string): Promise<Doodle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("doodle_wall", { p_before: before ?? undefined, p_limit: 24 });
  if (error || !data) return [];
  const urls = await signImages(data.map((d) => d.image_path));
  return data.map((d) => ({ ...d, solvers: Number(d.solvers), report_count: Number(d.report_count), url: urls.get(d.image_path) ?? null }));
}
