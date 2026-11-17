import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signPrivate } from "@/lib/storage";
import type { Database } from "@/lib/supabase/database.types";

export const VOICE_BUCKET = "voices";
export const MAX_AUDIO_BYTES = 7 * 1024 * 1024;

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

export const AUDIO_EXT: Record<string, string> = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3" };

/** Identifies audio from its first bytes (not the claimed type). */
export function detectAudio(bytes: Uint8Array) {
  return SIGNATURES.find((s) => s.test(bytes)) ?? null;
}
