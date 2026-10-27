import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signPrivate } from "@/lib/storage";
import type { Database } from "@/lib/supabase/database.types";

export const VOICE_BUCKET = "voices";
export const MAX_AUDIO_BYTES = 3.5 * 1024 * 1024;

type Fn = Database["public"]["Functions"];
export type VoiceNote = Fn["voice_library"]["Returns"][number] & { url: string | null };
export type MyVoiceNote = Fn["my_voice_notes"]["Returns"][number] & { url: string | null };
export type QueueVoiceNote = Fn["voice_review_queue"]["Returns"][number] & { url: string | null };

async function withUrls<T extends { audio_path: string }>(rows: T[]) {
  const urls = await signPrivate(VOICE_BUCKET, rows.map((r) => r.audio_path), 2 * 60 * 60);
  return rows.map((r) => ({ ...r, url: urls.get(r.audio_path) ?? null }));
}

export async function getVoiceLibrary() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("voice_library", {});
  return withUrls(data ?? []);
}

export async function getMyVoiceNotes() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_voice_notes");
  return withUrls(data ?? []);
}

export async function getReviewQueue() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("voice_review_queue");
  if (error) return [];
  return withUrls(data ?? []);
}

const SIGNATURES: { type: "audio/webm" | "audio/ogg" | "audio/mp4" | "audio/mpeg"; ext: string; test: (b: Uint8Array) => boolean }[] = [
  { type: "audio/webm", ext: "webm", test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  { type: "audio/ogg", ext: "ogg", test: (b) => String.fromCharCode(...b.slice(0, 4)) === "OggS" },
  { type: "audio/mp4", ext: "m4a", test: (b) => String.fromCharCode(...b.slice(4, 8)) === "ftyp" },
  { type: "audio/mpeg", ext: "mp3", test: (b) => String.fromCharCode(...b.slice(0, 3)) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
];

/** Checks the real file contents (not the claimed type) before storing. */
export async function inspectAudio(file: File) {
  if (file.size > MAX_AUDIO_BYTES) return { ok: false as const, error: "That recording is too large (max 3.5 MB)." };
  if (file.size < 2000) return { ok: false as const, error: "That recording seems to be empty." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const match = SIGNATURES.find((s) => s.test(bytes));
  if (!match) return { ok: false as const, error: "Please use a WebM, OGG, M4A or MP3 recording." };
  return { ok: true as const, bytes, type: match.type, ext: match.ext };
}
