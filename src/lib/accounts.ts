import "server-only";
import { scryptSync, timingSafeEqual } from "node:crypto";

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
  return RESERVED.includes(u) || u === adminUsername();
}

// Built-in admin password, stored only as a salted scrypt hash.
// Setting ADMIN_PASSWORD in the environment overrides it.
const BUILT_IN_ADMIN_HASH =
  "scrypt$b3b61cf9691bcd4e9ff7eac3f24f6eb6$0527b65bb08c58fc9f41860583d33e60d59a7b46432a50fc65504af61f32b3c9";

export function adminUsername() {
  return (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
}

/** The single fixed administrator. There is no admin sign-up. */
export function adminAccount() {
  return { username: adminUsername(), name: process.env.ADMIN_DISPLAY_NAME || "School Administrator" };
}

export function verifyAdminPassword(input: string) {
  const configured = process.env.ADMIN_PASSWORD;
  if (configured) return safeEqual(input, configured);
  const [, salt, expected] = BUILT_IN_ADMIN_HASH.split("$");
  const derived = scryptSync(input, Buffer.from(salt, "hex"), 32);
  return timingSafeEqual(derived, Buffer.from(expected, "hex"));
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
