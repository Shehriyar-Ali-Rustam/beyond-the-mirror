import "server-only";
import { createClient } from "@/lib/supabase/server";
import { removePrivate, signPrivate, uploadPrivate } from "@/lib/storage";
import type { Database } from "@/lib/supabase/database.types";

export const COMMUNITY_BUCKET = "community";

type FeedRow = Database["public"]["Functions"]["community_feed"]["Returns"][number];
export type Post = Omit<FeedRow, "reaction_count" | "comment_count" | "report_count"> & {
  reaction_count: number;
  comment_count: number;
  report_count: number;
  image_url: string | null;
};

export async function signImages(paths: string[]) {
  return signPrivate(COMMUNITY_BUCKET, paths);
}

/** One page of the feed, as the current user is allowed to see it. */
export async function getFeed(before?: string | null): Promise<Post[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("community_feed", { p_before: before ?? undefined, p_limit: 15 });
  if (error || !data) return [];
  const urls = await signImages(data.map((p) => p.image_path).filter((p): p is string => Boolean(p)));
  return data.map((p) => ({
    ...p,
    reaction_count: Number(p.reaction_count),
    comment_count: Number(p.comment_count),
    report_count: Number(p.report_count),
    image_url: p.image_path ? urls.get(p.image_path) ?? null : null,
  }));
}

const SIGNATURES: { type: string; ext: "jpg" | "png" | "webp"; test: (b: Uint8Array) => boolean }[] = [
  { type: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/png", ext: "png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  {
    type: "image/webp",
    ext: "webp",
    test: (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP",
  },
];

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

/** Checks the real file contents (not just the claimed type) before storing. */
export async function inspectImage(file: File) {
  if (file.size > MAX_IMAGE_BYTES) return { ok: false as const, error: "That photo is too large (max 3 MB)." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const match = SIGNATURES.find((s) => s.test(bytes));
  if (!match) return { ok: false as const, error: "Please choose a JPG, PNG or WebP image." };
  return { ok: true as const, bytes, type: match.type, ext: match.ext };
}

const IMAGE_BUCKET_OPTIONS = { fileSizeLimit: 5 * 1024 * 1024, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] };

export async function uploadImage(bytes: Uint8Array, type: string, ext: string, folder: "posts" | "doodles" = "posts") {
  return uploadPrivate(COMMUNITY_BUCKET, `${folder}/${crypto.randomUUID()}.${ext}`, bytes, type, IMAGE_BUCKET_OPTIONS);
}

export async function removeImage(path: string | null | undefined) {
  return removePrivate(COMMUNITY_BUCKET, path);
}
