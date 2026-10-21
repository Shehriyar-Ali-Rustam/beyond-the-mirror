"use server";

import { revalidatePath } from "next/cache";
import { randomInt } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { assertRole } from "@/lib/auth";
import { friendlyError } from "@/lib/utils";
import { accountStatusSchema, roleSchema, uuid } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";
import { z } from "zod";

export async function adminUpdateUser(input: { userId: string; role?: string; status?: string }): Promise<ActionResult> {
  await assertRole("admin");
  const parsed = z
    .object({ userId: uuid, role: roleSchema.exclude(["admin"]).optional(), status: accountStatusSchema.optional() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_user", {
    p_user: parsed.data.userId,
    p_role: (parsed.data.role ?? null) as never,
    p_status: (parsed.data.status ?? null) as never,
  });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function adminAssignCounselor(input: {
  studentId: string;
  counselorId: string | null;
  moveOpen?: boolean;
}): Promise<ActionResult> {
  await assertRole("admin");
  const parsed = z
    .object({ studentId: uuid, counselorId: uuid.nullable(), moveOpen: z.boolean().default(true) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_assign_counselor", {
    p_student: parsed.data.studentId,
    p_counselor: parsed.data.counselorId as string,
    p_move_open: parsed.data.moveOpen,
  });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

const WORDS = [
  "river", "maple", "cloud", "amber", "stone", "pearl", "cedar", "lunar", "harbor", "meadow", "comet", "willow",
  "ember", "falcon", "garden", "island", "jasmine", "kettle", "lantern", "marble", "orchid", "pepper", "quartz", "saffron",
  "timber", "velvet", "walnut", "yellow", "zephyr", "breeze", "canyon", "dawn",
];

/** Sets a temporary password for a student or counselor (e.g. they forgot theirs). */
export async function adminResetPassword(userId: string): Promise<ActionResult<{ password: string }>> {
  await assertRole("admin");
  if (!uuid.safeParse(userId).success) return { ok: false, error: "Invalid request." };

  const supabase = await createClient();
  const { data: target } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!target || target.role === "admin") return { ok: false, error: "That account can't be reset here." };

  const pick = () => WORDS[randomInt(WORDS.length)];
  const password = `${pick()}-${pick()}-${pick()}-${randomInt(100, 1000)}`;
  const { error } = await createServiceClient().auth.admin.updateUserById(userId, { password });
  if (error) return { ok: false, error: "Couldn't reset the password. Please try again." };
  return { ok: true, data: { password } };
}
