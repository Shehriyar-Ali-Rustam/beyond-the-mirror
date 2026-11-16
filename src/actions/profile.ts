"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { friendlyError } from "@/lib/utils";
import { counselorProfileSchema, credentialsSchema, fieldErrors, presenceSchema, studentProfileSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

export async function updateStudentProfile(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const viewer = await assertRole("student");
  const parsed = studentProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      grade: parsed.data.grade ?? null,
      section: parsed.data.section ?? null,
      student_number: parsed.data.studentNumber ?? null,
      email: parsed.data.contactEmail ?? null,
    })
    .eq("id", viewer.id);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/student", "layout");
  return { ok: true, message: "Profile saved." };
}

export async function updateStaffProfile(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const viewer = await assertRole("counselor", "admin");
  const parsed = counselorProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    contactEmail: formData.get("contactEmail") ?? undefined,
    title: formData.get("title") ?? undefined,
    bio: formData.get("bio") ?? undefined,
    officeHours: formData.get("officeHours") ?? undefined,
    whatsapp: formData.get("whatsapp") ?? undefined,
    // Areas of expertise now live in the verified professional details.
    specialties: [],
  });
  if (!parsed.success) return { ok: false, error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: v.fullName,
      email: v.contactEmail ?? null,
      title: v.title || null,
      bio: v.bio || null,
      office_hours: v.officeHours || null,
      whatsapp: v.whatsapp ? v.whatsapp.replace(/\s+/g, " ") : null,
    })
    .eq("id", viewer.id);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath(`/${viewer.role}`, "layout");
  return { ok: true, message: "Profile saved." };
}

export async function setPresence(presence: string): Promise<ActionResult> {
  const viewer = await assertRole("counselor");
  const parsed = presenceSchema.safeParse(presence);
  if (!parsed.success) return { ok: false, error: "Invalid status." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ presence: parsed.data }).eq("id", viewer.id);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/counselor", "layout");
  return { ok: true };
}

export async function saveCredentials(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const viewer = await assertRole("counselor");
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    phone: formData.get("phone"),
    qualifications: formData.get("qualifications"),
    experienceYears: formData.get("experienceYears"),
    expertise: formData.getAll("expertise"),
  });
  if (!parsed.success) return { ok: false, error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const row = { qualifications: v.qualifications, experience_years: v.experienceYears, email: v.email, phone: v.phone, expertise: v.expertise };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("counselor_credentials").select("counselor_id, verified_at").eq("counselor_id", viewer.id).maybeSingle();
  const { error } = existing
    ? await supabase.from("counselor_credentials").update(row).eq("counselor_id", viewer.id)
    : await supabase.from("counselor_credentials").insert({ counselor_id: viewer.id, ...row });
  if (error) return { ok: false, error: friendlyError(error) };
  const { data: after } = await supabase.from("counselor_credentials").select("verified_at").eq("counselor_id", viewer.id).maybeSingle();
  revalidatePath("/counselor", "layout");
  return {
    ok: true,
    message: after?.verified_at ? "Details saved." : "Saved. The administrator will verify your details before new students are matched with you.",
  };
}
