import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Accounts are username-based. Supabase Auth still needs an email-shaped
 * identifier, so each username maps to an internal address on a reserved,
 * undeliverable domain. Nothing is ever emailed to it.
 */
export function usernameToAuthEmail(username: string) {
  const domain = process.env.AUTH_EMAIL_DOMAIN || "users.beyond-the-mirror.invalid";
  return `${username.toLowerCase()}@${domain}`;
}

const RESERVED = ["admin", "administrator", "root", "system", "support", "counselor", "counsellor", "staff", "moderator", "beyondthemirror"];

export function isReservedUsername(username: string) {
  const u = username.toLowerCase();
  const admin = adminUsername();
  return RESERVED.includes(u) || (admin !== null && u === admin);
}

export function adminUsername() {
  return (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase() || null;
}

/** The fixed admin login, configured only through environment variables. */
export function adminCredentials() {
  const username = adminUsername();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!username || password.length < 10) return null;
  return { username, password, name: process.env.ADMIN_DISPLAY_NAME || "School Administrator" };
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
