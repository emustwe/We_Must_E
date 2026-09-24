import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { clientEnv } from "@/lib/env";
import { logError } from "@/lib/log";
import { HOME_BY_ROLE } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES: EmailOtpType[] = ["email", "signup", "recovery", "email_change", "invite"];

// Landing point for links in Supabase Auth emails. Supports the recommended
// token_hash templates (work across devices) and the PKCE ?code= fallback.
// Destinations are fixed here, never taken from the URL, so there is no open redirect.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const code = params.get("code");
  const rawType = params.get("type");
  const type = ALLOWED_TYPES.find((allowed) => allowed === rawType);
  const to = (path: string) => NextResponse.redirect(new URL(path, clientEnv.NEXT_PUBLIC_SITE_URL));

  const supabase = await createClient();
  let verified = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) logError("auth-confirm-otp", error);
    verified = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) logError("auth-confirm-code", error);
    verified = !error;
  }

  if (!verified) return to("/login?link=invalid");
  if (type === "recovery") return to("/reset-password");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return to("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return to(profile ? HOME_BY_ROLE[profile.role] : "/login");
}
