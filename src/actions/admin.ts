"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { friendlyError } from "@/lib/utils";
import { accountStatusSchema, roleSchema, uuid } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";
import { z } from "zod";

export async function adminUpdateUser(input: { userId: string; role?: string; status?: string }): Promise<ActionResult> {
  await assertRole("admin");
  const parsed = z
    .object({ userId: uuid, role: roleSchema.optional(), status: accountStatusSchema.optional() })
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
