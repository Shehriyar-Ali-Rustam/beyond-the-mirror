import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, hasServiceKey } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/database.types";

export const COMMUNITY_BUCKET = "community";

type FeedRow = Database["public"]["Functions"]["community_feed"]["Returns"][number];
export type Post = Omit<FeedRow, "reaction_count" | "comment_count" | "report_count"> & {
  reaction_count: number;
  comment_count: number;
  report_count: number;
  image_url: string | null;
};

/** Signed, short-lived URLs for private community photos. */
export async function signImages(paths: string[]) {
  const unique = [...new Set(paths)];
  if (!unique.length || !hasServiceKey()) return new Map<string, string>();
  const { data } = await createServiceClient().storage.from(COMMUNITY_BUCKET).createSignedUrls(unique, 60 * 60);
  return new Map((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl]));
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

export async function uploadImage(bytes: Uint8Array, type: string, ext: string) {
  const service = createServiceClient();
  const path = `posts/${crypto.randomUUID()}.${ext}`;
  const put = () => service.storage.from(COMMUNITY_BUCKET).upload(path, bytes, { contentType: type, upsert: false });
  let { error } = await put();
  if (error && /bucket not found/i.test(error.message)) {
    // First upload on a fresh project: create the private bucket, then retry.
    await service.storage.createBucket(COMMUNITY_BUCKET, {
      public: false,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
    ({ error } = await put());
  }
  if (error) {
    console.error("[community] upload failed:", error.message);
    return null;
  }
  return path;
}

export async function removeImage(path: string | null | undefined) {
  if (!path || !hasServiceKey()) return;
  await createServiceClient().storage.from(COMMUNITY_BUCKET).remove([path]);
}
