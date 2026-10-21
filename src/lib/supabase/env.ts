const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = () =>
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True once the Supabase URL and public key are configured (e.g. in Vercel). */
export function isSupabaseConfigured() {
  return Boolean(url() && publicKey());
}

export function supabaseEnv() {
  const u = url();
  const key = publicKey();
  if (!u || !key) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }
  return { url: u, key };
}
