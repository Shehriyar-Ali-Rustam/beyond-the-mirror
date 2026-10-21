import "server-only";
import { headers } from "next/headers";
import { createServiceClient, hasServiceKey } from "@/lib/supabase/service";

type Kind = "login_failed" | "signup";

const LIMITS: Record<Kind, { windowMinutes: number; perUsername: number; perIp: number }> = {
  login_failed: { windowMinutes: 15, perUsername: 8, perIp: 40 },
  signup: { windowMinutes: 60, perUsername: Infinity, perIp: 10 },
};

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim().slice(0, 64);
}

/** True when this username or IP has hit the limit for the given action. */
export async function isRateLimited(kind: Kind, username: string | null, ip: string) {
  if (!hasServiceKey()) return false;
  const limit = LIMITS[kind];
  const since = new Date(Date.now() - limit.windowMinutes * 60_000).toISOString();
  const db = createServiceClient();
  const [byIp, byUser] = await Promise.all([
    db.from("auth_attempts").select("id", { count: "exact", head: true }).eq("kind", kind).eq("ip", ip).gte("created_at", since),
    username && Number.isFinite(limit.perUsername)
      ? db.from("auth_attempts").select("id", { count: "exact", head: true }).eq("kind", kind).eq("username", username).gte("created_at", since)
      : Promise.resolve({ count: 0 }),
  ]);
  return (byIp.count ?? 0) >= limit.perIp || (byUser.count ?? 0) >= limit.perUsername;
}

export async function recordAttempt(kind: Kind, username: string | null, ip: string) {
  if (!hasServiceKey()) return;
  const db = createServiceClient();
  await db.from("auth_attempts").insert({ kind, username, ip });
  // Opportunistic cleanup of old rows.
  if (Math.random() < 0.05) {
    await db.from("auth_attempts").delete().lt("created_at", new Date(Date.now() - 24 * 3600_000).toISOString());
  }
}

export async function clearFailedLogins(username: string) {
  if (!hasServiceKey()) return;
  await createServiceClient().from("auth_attempts").delete().eq("kind", "login_failed").eq("username", username);
}
