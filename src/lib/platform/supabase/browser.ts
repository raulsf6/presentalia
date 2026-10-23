import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client for magic-link sign-in and realtime subscriptions.
 * Authenticated by the session cookies set by @supabase/ssr.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.",
    );
  }
  return createBrowserClient(url, anonKey, {
    auth: { flowType: "pkce" },
  });
}
