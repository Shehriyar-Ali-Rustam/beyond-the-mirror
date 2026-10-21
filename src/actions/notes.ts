"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { friendlyError } from "@/lib/utils";
import { firstError, noteSchema, uuid } from "@/lib/validation";
import type { ActionResult, CaseNote } from "@/lib/types";

export async function addNote(input: { studentId: string; body: string }): Promise<ActionResult<CaseNote>> {
  const viewer = await assertRole("counselor");
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("case_notes")
    .insert({ student_id: parsed.data.studentId, body: parsed.data.body, author_id: viewer.id })
    .select()
    .single();
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath(`/counselor/students/${parsed.data.studentId}`);
  return { ok: true, data };
}

export async function deleteNote(id: string): Promise<ActionResult> {
  await assertRole("counselor");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid id." };
  const supabase = await createClient();
  const { error } = await supabase.from("case_notes").delete().eq("id", id);
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true };
}
