import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifies email auth links (password recovery, signup confirmation, email
 * change) server-side using the token hash. Unlike the PKCE `code` flow, this
 * works even when the link is opened on a different device or browser than the
 * one that requested it, verifyOtp establishes the session in cookies here,
 * then we redirect to the target page.
 *
 * Point the relevant Supabase email templates at:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";
  // Only allow same-site relative paths. Reject protocol-relative ("//host")
  // and backslash tricks ("/\\host") that new URL() would resolve off-site.
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
      ? next
      : "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, origin));
    }
  }

  // Invalid or expired link, send them to request a fresh reset link.
  return NextResponse.redirect(new URL("/forgot-password?error=expired", origin));
}
