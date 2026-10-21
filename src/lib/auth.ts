import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Profile, Role } from "@/lib/types";

/**
 * Data Access Layer: the single place that turns a session cookie into a
 * trusted, server-verified profile. Memoised per request.
 */
export const getViewer = cache(async (): Promise<Profile | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return profile ?? null;
});

export function homeFor(profile: Pick<Profile, "role" | "status">) {
  if (profile.status !== "active") return "/account/pending";
  return `/${profile.role}`;
}

/** Use in layouts/pages: guarantees an active user with the given role. */
export async function requireRole(role: Role): Promise<Profile> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.status !== "active") redirect("/account/pending");
  if (viewer.role !== role) redirect(homeFor(viewer));
  return viewer;
}

/** Use in server actions: same guarantee, but throws instead of redirecting. */
export async function assertRole(...roles: Role[]): Promise<Profile> {
  const viewer = await getViewer();
  if (!viewer || viewer.status !== "active" || !roles.includes(viewer.role)) {
    throw new Error("You are not allowed to do that.");
  }
  return viewer;
}
