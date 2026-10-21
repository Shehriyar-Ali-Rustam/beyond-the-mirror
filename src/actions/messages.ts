"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { friendlyError } from "@/lib/utils";
import { conversationUpdateSchema, fieldErrors, firstError, messageSchema, newRequestSchema } from "@/lib/validation";
import type { ActionResult, Message } from "@/lib/types";

export async function startConversation(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await assertRole("student");
  const parsed = newRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("start_conversation", {
    p_subject: parsed.data.subject,
    p_category: parsed.data.category,
    p_urgency: parsed.data.urgency,
    p_body: parsed.data.body,
    p_anonymous: parsed.data.identity === "anonymous",
  });
  if (error || !id) return { ok: false, error: friendlyError(error) };

  revalidatePath("/student", "layout");
  redirect(`/student/messages/${id}?sent=1`);
}

export async function sendMessage(input: { conversationId: string; body: string }): Promise<ActionResult<Message>> {
  await assertRole("student", "counselor");
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: parsed.data.conversationId, body: parsed.data.body, sender_id: claims!.claims.sub })
    .select()
    .single();
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true, data };
}

export async function updateConversation(input: {
  conversationId: string;
  status?: string;
  category?: string;
  urgency?: string;
}): Promise<ActionResult> {
  const viewer = await assertRole("student", "counselor");
  const parsed = conversationUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { conversationId, ...changes } = parsed.data;

  // Students may only resolve or reopen. The database enforces this too.
  if (viewer.role === "student") {
    if (changes.category || changes.urgency || changes.status === "in_progress") {
      return { ok: false, error: "You can only resolve or reopen your own requests." };
    }
  }
  if (Object.keys(changes).length === 0) return { ok: true };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .update(changes)
    .eq("id", conversationId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: friendlyError(error) };
  if (!data) return { ok: false, error: "Conversation not found." };

  revalidatePath(viewer.role === "student" ? "/student" : "/counselor", "layout");
  return { ok: true };
}

/** An anonymous student chooses to share their name with the counselor. */
export async function revealIdentity(conversationId: string): Promise<ActionResult> {
  await assertRole("student");
  if (!messageSchema.shape.conversationId.safeParse(conversationId).success) return { ok: false, error: "Invalid conversation." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reveal_identity", { p_conversation: conversationId });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/student", "layout");
  return { ok: true };
}

export async function markConversationRead(conversationId: string) {
  await assertRole("student", "counselor");
  const supabase = await createClient();
  await supabase.rpc("mark_conversation_read", { p_conversation: conversationId });
}
