import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server client scoped to the request's session cookies — used for auth
 * (session reads, magic-link code exchange). App data uses the server-only
 * Drizzle owner connection after application authorization; storage operations
 * go through the service client in src/lib/platform/supabase/service.
 */
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.",
    );
  }
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    auth: { flowType: "pkce" },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component: cookies cannot be set there.
          // The proxy (src/proxy.ts) refreshes sessions instead.
        }
      },
    },
  });
}
