"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServiceClient, hasServiceKey } from "@/lib/supabase/service";
import { adminAccount, isReservedUsername, usernameToAuthEmail, verifyAdminPassword } from "@/lib/accounts";
import { homeFor } from "@/lib/auth";
import { clearFailedLogins, clientIp, isRateLimited, recordAttempt } from "@/lib/rate-limit";
import { fieldErrors, loginSchema, passwordSchema, registerSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

const NOT_READY = "Accounts aren't available yet — the site's database still needs to be connected.";
const BAD_LOGIN = "That username and password don't match an account.";
const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

/** Only allow same-site relative redirects after login. */
function safeNext(next: FormDataEntryValue | null) {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : null;
}

/** Finds the auth address for a username (older accounts may use a real email). */
async function authEmailFor(username: string) {
  if (username.includes("@")) return username;
  if (!hasServiceKey()) return usernameToAuthEmail(username);
  const service = createServiceClient();
  const { data: profile } = await service.from("profiles").select("id").eq("username", username).maybeSingle();
  if (!profile) return usernameToAuthEmail(username);
  const { data } = await service.auth.admin.getUserById(profile.id);
  return data.user?.email ?? usernameToAuthEmail(username);
}

/**
 * The single fixed administrator. After the password is verified, the matching
 * account is created (or re-synced) so the database's admin permissions apply.
 */
async function ensureAdminAccount(admin: ReturnType<typeof adminAccount>, password: string) {
  const service = createServiceClient();
  const email = usernameToAuthEmail(admin.username);
  const { data: existing } = await service.from("profiles").select("id, role").eq("username", admin.username).maybeSingle();

  let id = existing?.id;
  if (existing && existing.role !== "admin") {
    console.error(`[auth] Username "${admin.username}" belongs to a non-admin account; refusing admin login.`);
    return false;
  }
  if (!id) {
    const { data: token, error: tokenError } = await service.rpc("create_admin_provision_token");
    if (tokenError || !token) {
      console.error("[auth] Could not create an admin provisioning token (are the migrations applied?):", tokenError?.message);
      return false;
    }
    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: admin.name, username: admin.username, provision_token: token },
    });
    if (error || !data.user) {
      console.error("[auth] Could not create admin account:", error?.message);
      return false;
    }
    id = data.user.id;
  } else {
    // Keep the stored password in sync with the admin login.
    await service.auth.admin.updateUserById(id, { password });
  }
  await service.from("profiles").update({ role: "admin", status: "active", counselor_id: null }).eq("id", id);
  return true;
}

export async function signIn(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: NOT_READY };
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };
  const { username, password } = parsed.data;

  const ip = await clientIp();
  if (await isRateLimited("login_failed", username, ip)) return { ok: false, error: TOO_MANY };

  const admin = adminAccount();
  const isAdminLogin = username === admin.username;
  if (isAdminLogin) {
    if (!verifyAdminPassword(password)) {
      await recordAttempt("login_failed", username, ip);
      return { ok: false, error: BAD_LOGIN };
    }
    if (!hasServiceKey() || !(await ensureAdminAccount(admin, password))) {
      return { ok: false, error: "The admin account couldn't be prepared. Check the server configuration." };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: isAdminLogin ? usernameToAuthEmail(username) : await authEmailFor(username),
    password,
  });
  if (error || !data.user) {
    await recordAttempt("login_failed", username, ip);
    return { ok: false, error: BAD_LOGIN };
  }
  await clearFailedLogins(username);

  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", data.user.id).single();
  const next = safeNext(formData.get("next"));
  const home = profile ? homeFor(profile) : "/";
  redirect(next && profile?.status === "active" && next.startsWith(`/${profile.role}`) ? next : home);
}

export async function signUp(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured() || !hasServiceKey()) return { ok: false, error: NOT_READY };
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const ip = await clientIp();
  if (await isRateLimited("signup", null, ip)) return { ok: false, error: TOO_MANY };

  const taken = { ok: false as const, error: "Please check the form.", fieldErrors: { username: ["That username is taken — try another."] } };
  if (isReservedUsername(v.username)) return taken;

  const service = createServiceClient();
  const { data: existing } = await service.from("profiles").select("id").eq("username", v.username).maybeSingle();
  if (existing) return taken;

  const { error } = await service.auth.admin.createUser({
    email: usernameToAuthEmail(v.username),
    password: v.password,
    email_confirm: true,
    // role_request is only a *request*: the database trigger decides the real role.
    user_metadata: {
      full_name: v.fullName,
      username: v.username,
      role_request: v.role,
      grade: v.grade ?? null,
      section: v.section ?? null,
      student_number: v.studentNumber ?? null,
      title: v.title ?? null,
      contact_email: v.contactEmail ?? null,
    },
  });
  if (error) {
    if (/already/i.test(error.message)) return taken;
    console.error("[auth] sign-up failed:", error.message);
    return { ok: false, error: "We couldn't create your account right now. Please try again." };
  }
  await recordAttempt("signup", v.username, ip);

  const supabase = await createClient();
  const { error: loginError } = await supabase.auth.signInWithPassword({ email: usernameToAuthEmail(v.username), password: v.password });
  if (loginError) redirect("/login");
  redirect(v.role === "counselor" ? "/account/pending" : "/student?welcome=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function updatePassword(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({ password: passwordSchema, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "Passwords don't match.", path: ["confirm"] })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return { ok: false, error: "Please log in again." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      ok: false,
      error: error.code === "same_password" ? "Choose a password you haven't used here before." : "Couldn't update your password. Please try again.",
    };
  }
  return { ok: true, message: "Password updated." };
}
