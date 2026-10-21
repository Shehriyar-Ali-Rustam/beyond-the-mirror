import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** Handles email confirmation, magic links and password-recovery links. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const supabase = await createClient();
  let ok = false;
  if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  if (!ok) return NextResponse.redirect(`${origin}/login?error=link`);

  if (next === "/") {
    const { data } = await supabase.auth.getClaims();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", data?.claims?.sub ?? "")
      .maybeSingle();
    const home = profile ? (profile.status === "active" ? `/${profile.role}` : "/account/pending") : "/";
    return NextResponse.redirect(`${origin}${home}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
