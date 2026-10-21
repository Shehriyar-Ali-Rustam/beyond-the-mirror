"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { friendlyError } from "@/lib/utils";
import { bookingSchema, feedbackSchema, fieldErrors, firstError, slotSchema, uuid } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";
import { z } from "zod";

/** Converts a local date + time (from the counselor's browser) into a UTC Date. */
function toUtc(date: string, time: string, tzOffsetMinutes: number) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) + tzOffsetMinutes * 60_000);
}

export async function createSlots(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const viewer = await assertRole("counselor");
  const parsed = slotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const rows = Array.from({ length: v.repeatWeeks }, (_, week) => {
    const start = toUtc(v.date, v.start, v.tzOffset);
    const end = toUtc(v.date, v.end, v.tzOffset);
    start.setUTCDate(start.getUTCDate() + week * 7);
    end.setUTCDate(end.getUTCDate() + week * 7);
    return {
      counselor_id: viewer.id,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      mode: v.mode,
      location: v.location || null,
    };
  });
  if (new Date(rows[0].starts_at) <= new Date()) {
    return { ok: false, error: "Pick a time in the future.", fieldErrors: { start: ["This time has already passed."] } };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("availability_slots").insert(rows);
  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath("/counselor/schedule");
  return { ok: true, message: rows.length > 1 ? `Added ${rows.length} weekly slots.` : "Slot added." };
}

export async function deleteSlot(slotId: string): Promise<ActionResult> {
  await assertRole("counselor");
  if (!uuid.safeParse(slotId).success) return { ok: false, error: "Invalid slot." };
  const supabase = await createClient();
  const { error } = await supabase.from("availability_slots").delete().eq("id", slotId);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/counselor/schedule");
  return { ok: true };
}

export async function bookAppointment(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await assertRole("student");
  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("book_appointment", {
    p_slot: parsed.data.slotId,
    p_reason: parsed.data.reason ?? "",
  });
  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath("/student", "layout");
  return { ok: true, message: "You're booked in. We've let your counselor know." };
}

export async function updateAppointment(input: {
  appointmentId: string;
  status: "cancelled" | "completed";
  reason?: string;
}): Promise<ActionResult> {
  const viewer = await assertRole("student", "counselor");
  const parsed = z
    .object({ appointmentId: uuid, status: z.enum(["cancelled", "completed"]), reason: z.string().trim().max(300).optional() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_appointment", {
    p_appointment: parsed.data.appointmentId,
    p_status: parsed.data.status,
    p_reason: parsed.data.reason ?? "",
  });
  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath(viewer.role === "student" ? "/student" : "/counselor", "layout");
  return { ok: true };
}

export async function leaveFeedback(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await assertRole("student");
  const raw = Object.fromEntries(formData);
  const parsed = feedbackSchema.safeParse({
    ...raw,
    appointmentId: raw.appointmentId || undefined,
    conversationId: raw.conversationId || undefined,
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { appointmentId, conversationId, rating, comment } = parsed.data;
  if (!appointmentId === !conversationId) return { ok: false, error: "Invalid feedback target." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_feedback", {
    p_appointment: appointmentId ?? (null as unknown as string),
    p_conversation: conversationId ?? (null as unknown as string),
    p_rating: rating,
    p_comment: comment ?? "",
  });
  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath("/student", "layout");
  return { ok: true, message: "Thank you — that genuinely helps." };
}
