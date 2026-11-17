"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { friendlyError } from "@/lib/utils";
import { uuid } from "@/lib/validation";
import { removePrivate, signPrivate } from "@/lib/storage";
import { createServiceClient } from "@/lib/supabase/service";
import { AUDIO_EXT, detectAudio, MAX_AUDIO_BYTES, VOICE_BUCKET, type VoiceNote } from "@/lib/voices";
import type { ActionResult } from "@/lib/types";

const categorySchema = z.enum(["lonely", "exam", "giving_up", "overwhelmed", "hope", "self_worth"]);

const submitSchema = z.object({
  category: categorySchema,
  language: z.enum(["en", "ur"]),
  title: z.string().trim().min(3, "Give it a short title (3+ characters).").max(80, "Keep the title under 80 characters."),
  speakerName: z.string().trim().max(40).optional(),
  anonymous: z.boolean(),
  duration: z.coerce.number().int().min(15, "Voice notes need to be at least 20 seconds.").max(125, "Voice notes can be up to 2 minutes."),
  path: z.string().regex(/^voices\/[0-9a-f-]{36}\.(webm|ogg|m4a|mp3)$/, "Record or choose a voice note first."),
  consent: z.literal("on", { message: "Please confirm you're happy for your voice to be shared after review." }),
});

/**
 * Step 1: a one-time link to upload the recording straight to private storage.
 * Files go directly from the browser, so they aren't limited by the size of a
 * request to the website.
 */
export async function prepareVoiceUpload(input: { type: string; size: number }): Promise<ActionResult<{ path: string; token: string }>> {
  const viewer = await assertRole("student", "counselor", "admin");
  const type = input.type.split(";")[0] === "audio/x-m4a" ? "audio/mp4" : input.type.split(";")[0] === "audio/mp3" ? "audio/mpeg" : input.type.split(";")[0];
  const ext = AUDIO_EXT[type];
  if (!ext) return { ok: false, error: "Please use a WebM, OGG, M4A or MP3 recording." };
  if (!Number.isFinite(input.size) || input.size < 2000) return { ok: false, error: "That recording seems to be empty." };
  if (input.size > MAX_AUDIO_BYTES) return { ok: false, error: "That recording is too large (max 7 MB)." };

  const service = createServiceClient();
  // Same daily limit as the database applies on submit, so nobody can fill storage with uploads.
  const { count } = await service
    .from("voice_notes")
    .select("id", { count: "exact", head: true })
    .eq("author_id", viewer.id)
    .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  if ((count ?? 0) >= 5) return { ok: false, error: "You have shared several voice notes today. Thank you! Please try again tomorrow." };

  const path = `voices/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await service.storage.from(VOICE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "We couldn't prepare the upload. Please try again." };
  return { ok: true, data: { path, token: data.token } };
}

/** Step 2: check what was uploaded, then send it for review. */
export async function submitVoiceNote(formData: FormData): Promise<ActionResult> {
  const viewer = await assertRole("student", "counselor", "admin");
  const parsed = submitSchema.safeParse({
    category: formData.get("category"),
    language: formData.get("language"),
    title: formData.get("title") ?? "",
    speakerName: formData.get("speakerName") ?? undefined,
    anonymous: formData.get("anonymous") === "on",
    duration: formData.get("duration"),
    consent: formData.get("consent"),
    path: formData.get("path"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const v = parsed.data;

  // Check the real file: it must exist, fit the limit, and actually be the audio type its name says.
  const { data: blob } = await createServiceClient().storage.from(VOICE_BUCKET).download(v.path);
  const bytes = blob ? new Uint8Array(await blob.slice(0, 64).arrayBuffer()) : null;
  const audio = bytes ? detectAudio(bytes) : null;
  if (!blob || !audio || blob.size > MAX_AUDIO_BYTES || !v.path.endsWith(`.${audio.ext}`)) {
    await removePrivate(VOICE_BUCKET, v.path);
    return { ok: false, error: blob ? "That file doesn't look like a WebM, OGG, M4A or MP3 recording." : "The upload didn't finish. Please try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_voice_note", {
    p_category: v.category,
    p_language: v.language,
    p_title: v.title,
    p_speaker_name: v.anonymous ? "" : v.speakerName || viewer.full_name.split(" ")[0],
    p_anonymous: v.anonymous,
    p_audio_path: v.path,
    p_mime: audio.type,
    p_duration: v.duration,
  });
  if (error) {
    await removePrivate(VOICE_BUCKET, v.path);
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
