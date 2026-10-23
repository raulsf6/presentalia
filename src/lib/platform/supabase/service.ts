import { createClient } from "@supabase/supabase-js";

/**
 * Server-only service-role client for Storage (bucket 'talk-slides' upload
 * and signed URLs). Never import from a client component; callers must check
 * admin or talk access in the server app first. Table data uses the Drizzle
 * owner connection in src/db/index.ts behind the same guards.
 */
export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (server-only).",
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
