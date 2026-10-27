"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { friendlyError } from "@/lib/utils";
import { uuid } from "@/lib/validation";
import { removePrivate, signPrivate, uploadPrivate } from "@/lib/storage";
import { inspectAudio, VOICE_BUCKET, type VoiceNote } from "@/lib/voices";
import type { ActionResult } from "@/lib/types";

const categorySchema = z.enum(["lonely", "exam", "giving_up", "overwhelmed", "hope", "self_worth"]);

const submitSchema = z.object({
  category: categorySchema,
  language: z.enum(["en", "ur"]),
  title: z.string().trim().min(3, "Give it a short title (3+ characters).").max(80, "Keep the title under 80 characters."),
  speakerName: z.string().trim().max(40).optional(),
  anonymous: z.boolean(),
  duration: z.coerce.number().int().min(15, "Voice notes need to be at least 20 seconds.").max(65, "Voice notes can be up to 60 seconds."),
  consent: z.literal("on", { message: "Please confirm you're happy for your voice to be shared after review." }),
});

export async function submitVoiceNote(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const viewer = await assertRole("student", "counselor", "admin");
  const parsed = submitSchema.safeParse({
    category: formData.get("category"),
    language: formData.get("language"),
    title: formData.get("title") ?? "",
    speakerName: formData.get("speakerName") ?? undefined,
    anonymous: formData.get("anonymous") === "on",
    duration: formData.get("duration"),
    consent: formData.get("consent"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const file = formData.get("audio");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Record or choose a voice note first." };
  const audio = await inspectAudio(file);
  if (!audio.ok) return { ok: false, error: audio.error };

  const path = await uploadPrivate(VOICE_BUCKET, `voices/${crypto.randomUUID()}.${audio.ext}`, audio.bytes, audio.type, {
    fileSizeLimit: 4 * 1024 * 1024,
    allowedMimeTypes: ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg"],
  });
  if (!path) return { ok: false, error: "We couldn't upload your recording. Please try again." };

  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_voice_note", {
    p_category: v.category,
    p_language: v.language,
    p_title: v.title,
    p_speaker_name: v.anonymous ? "" : v.speakerName || viewer.full_name.split(" ")[0],
    p_anonymous: v.anonymous,
    p_audio_path: path,
    p_mime: audio.type,
    p_duration: v.duration,
  });
  if (error) {
    await removePrivate(VOICE_BUCKET, path);
    return { ok: false, error: friendlyError(error) };
  }
  revalidatePath(`/${viewer.role}/voices`);
  return { ok: true, message: "Thank you! Your voice note will be reviewed before anyone hears it." };
}

export async function reviewVoiceNote(input: { id: string; approve: boolean; note?: string }): Promise<ActionResult> {
  const viewer = await assertRole("counselor", "admin");
  const parsed = z.object({ id: uuid, approve: z.boolean(), note: z.string().trim().max(300).optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_voice_note", { p_id: parsed.data.id, p_approve: parsed.data.approve, p_note: parsed.data.note ?? "" });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath(`/${viewer.role}/voices`);
  return { ok: true };
}

export async function deleteVoiceNote(id: string): Promise<ActionResult> {
  const viewer = await assertRole("student", "counselor", "admin");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid request." };
  const supabase = await createClient();
  const { data: path, error } = await supabase.rpc("delete_voice_note", { p_id: id });
  if (error) return { ok: false, error: friendlyError(error) };
  await removePrivate(VOICE_BUCKET, path);
  revalidatePath(`/${viewer.role}/voices`);
  return { ok: true };
}

export async function countVoicePlay(id: string) {
  await assertRole("student", "counselor", "admin");
  if (!uuid.safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.rpc("count_voice_play", { p_id: id });
}

/** A surprise voice note, optionally from one category. */
export async function randomVoiceNote(category?: string): Promise<VoiceNote | null> {
  await assertRole("student", "counselor", "admin");
  const cat = categorySchema.safeParse(category);
  const supabase = await createClient();
  const { data } = await supabase.rpc("random_voice_note", cat.success ? { p_category: cat.data } : {});
  const note = data?.[0];
  if (!note) return null;
  const urls = await signPrivate(VOICE_BUCKET, [note.audio_path], 2 * 60 * 60);
  return { ...note, url: urls.get(note.audio_path) ?? null };
}
