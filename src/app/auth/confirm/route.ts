import { NextResponse, type NextRequest } from "next/server";

import { isAllowedLoginEmail } from "@/lib/login-gate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Completes either a PKCE magic link or a server-issued invite token. The
 * allowlist is re-checked after verification before keeping the session.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (!code && !(tokenHash && type === "invite")) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        token_hash: tokenHash!,
        type: "invite",
      });
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ? user.email.toLowerCase() : null;
  if (!email || !(await isAllowedLoginEmail(email))) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=denied`);
  }

  return NextResponse.redirect(`${origin}/talks`);
}
