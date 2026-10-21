import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { withVerifiedIdentity } from "@/lib/session-headers";
import { GUEST_COOKIE_PREFIX } from "@/lib/talk-guests";

const PROTECTED_PREFIXES = ["/talks"];

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

/**
 * Next.js 16 proxy (formerly middleware). Refreshes the Supabase session
 * cookies when needed, then forwards the verified identity to the render as
 * internal request headers. Server code reads those headers instead of
 * calling `auth.getUser()` a second time; caller-supplied identity headers
 * are stripped on every request.
 *
 * The proxy remains an optimistic gate only. Pages, route handlers, and
 * server actions still check the database-backed role and talk access.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.next({
      request: { headers: withVerifiedIdentity(request.headers, null) },
    });
  }

  const pendingCookies: PendingCookie[] = [];
  const authHeaders = new Headers();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        pendingCookies.push(...cookiesToSet);
        for (const [key, value] of Object.entries(headers ?? {})) {
          authHeaders.set(key, value);
        }
      },
    },
  });

  // Refreshes the session if the access token expired; important that this
  // runs before any response is used.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const requestHeaders = withVerifiedIdentity(
    request.headers,
    user ? { id: user.id, email: user.email ?? null } : null,
  );

  /** Applies refreshed auth cookies and cache headers to any response. */
  const respond = (response: NextResponse) => {
    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, options);
    }
    for (const [key, value] of authHeaders) {
      response.headers.set(key, value);
    }
    return response;
  };

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  // Guest sessions are talk-scoped cookies with no Supabase user. This is only
  // an optimistic gate; pages and actions validate the guest every time.
  const hasGuestCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith(GUEST_COOKIE_PREFIX));

  if (pathname === "/") {
    return respond(
      NextResponse.redirect(new URL(user ? "/talks" : "/login", request.url)),
    );
  }

  if (!user && isProtected && !hasGuestCookie) {
    const redirectUrl = new URL("/login", request.url);
    return respond(NextResponse.redirect(redirectUrl));
  }

  if (user && pathname === "/login") {
    return respond(NextResponse.redirect(new URL("/talks", request.url)));
  }

  return respond(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
