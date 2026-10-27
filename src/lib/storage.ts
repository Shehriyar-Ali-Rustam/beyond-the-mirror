import "server-only";
import { createServiceClient, hasServiceKey } from "@/lib/supabase/service";

type BucketOptions = { fileSizeLimit: number; allowedMimeTypes: string[] };

/** Uploads to a private bucket, creating the bucket on first use. Returns the path or null. */
export async function uploadPrivate(bucket: string, path: string, bytes: Uint8Array, type: string, options: BucketOptions) {
  const service = createServiceClient();
  const put = () => service.storage.from(bucket).upload(path, bytes, { contentType: type, upsert: false });
  let { error } = await put();
  if (error && /bucket not found/i.test(error.message)) {
    await service.storage.createBucket(bucket, { public: false, ...options });
    ({ error } = await put());
  }
  if (error) {
    console.error(`[storage] upload to ${bucket} failed:`, error.message);
    return null;
  }
  return path;
}

/** Short-lived signed URLs for private files. */
export async function signPrivate(bucket: string, paths: string[], seconds = 60 * 60) {
  const unique = [...new Set(paths)];
  if (!unique.length || !hasServiceKey()) return new Map<string, string>();
  const { data } = await createServiceClient().storage.from(bucket).createSignedUrls(unique, seconds);
  return new Map((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl]));
}

export async function removePrivate(bucket: string, path: string | null | undefined) {
  if (!path || !hasServiceKey()) return;
  await createServiceClient().storage.from(bucket).remove([path]);
}
