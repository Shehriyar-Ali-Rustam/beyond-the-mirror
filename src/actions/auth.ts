"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeFor } from "@/lib/auth";
import { fieldErrors, loginSchema, passwordSchema, registerSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";
import { z } from "zod";

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/** Only allow same-site relative redirects after login. */
function safeNext(next: FormDataEntryValue | null) {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : null;
}

export async function signIn(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    const unconfirmed = error?.code === "email_not_confirmed";
    return {
      ok: false,
      error: unconfirmed
        ? "Please confirm your email first — check your inbox for the link."
        : "That email and password don't match an account.",
    };
  }

  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", data.user.id).single();
  const next = safeNext(formData.get("next"));
  const home = profile ? homeFor(profile) : "/";
  redirect(next && profile?.status === "active" && next.startsWith(`/${profile.role}`) ? next : home);
}

export async function signUp(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };
  const { email, password, fullName, role, grade } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await siteUrl()}/auth/confirm`,
      // role_request is only a *request*: the database trigger decides the real role.
      data: { full_name: fullName, role_request: role, grade: grade || null },
    },
  });

  if (error) {
    if (error.code === "user_already_exists") return { ok: false, error: "An account with this email already exists." };
    if (error.code === "weak_password") return { ok: false, error: "Please choose a stronger password." };
    return { ok: false, error: "We couldn't create your account right now. Please try again." };
  }

  // Email confirmation enabled → no session yet.
  if (!data.session) {
    return { ok: true, message: `We sent a confirmation link to ${email}. Open it to finish setting up.` };
  }
  redirect(role === "counselor" ? "/account/pending" : "/student?welcome=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = z.object({ email: z.email("Enter a valid email address.") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteUrl()}/auth/confirm?next=/reset-password`,
  });
  // Same response either way so the form can't be used to discover accounts.
  return { ok: true, message: "If that email has an account, a reset link is on its way." };
}

export async function updatePassword(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({ password: passwordSchema, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "Passwords don't match.", path: ["confirm"] })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return { ok: false, error: "Your reset link has expired. Please request a new one." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      ok: false,
      error: error.code === "same_password" ? "Choose a password you haven't used here before." : "Couldn't update your password. Please try again.",
    };
  }
  return { ok: true, message: "Password updated." };
}
