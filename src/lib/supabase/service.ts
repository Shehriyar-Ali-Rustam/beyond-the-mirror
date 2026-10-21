import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = () => process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

export function hasServiceKey() {
  return Boolean(serviceKey() && supabaseUrl());
}

/**
 * Privileged client that bypasses Row Level Security. Server-only, and used
 * ONLY for account management (creating username accounts, the fixed admin
 * login, admin password resets) — never to read conversations.
 */
export function createServiceClient() {
  const key = serviceKey();
  const url = supabaseUrl();
  if (!key || !url) throw new Error("SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is not set.");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
