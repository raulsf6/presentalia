import { cache } from "react";
import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";

import { getDb } from "@/db";
import { appUsers } from "@/db/schema";
import { isBootstrapAdminEmail } from "@/lib/admin";
import type { AppRole } from "@/lib/roles";
import {
  readVerifiedIdentity,
  type VerifiedIdentity,
} from "@/lib/session-headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string | null;
  role: AppRole;
};

/**
 * The authenticated user for the current request, or null when not signed
 * in. Email is lowercased for roster and bootstrap-email comparisons.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  let identity: VerifiedIdentity | null = readVerifiedIdentity(await headers());

  // The proxy verifies the Supabase session once and forwards the result.
  // Fall back to Auth for requests that bypass it (for example tests or a
  // direct invocation), so this helper is still safe on its own.
  if (!identity) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return null;
    }
    identity = {
      id: data.user.id,
      email: data.user.email ?? null,
    };
  }

  const email = identity.email ? identity.email.toLowerCase() : null;
  const db = getDb();
  const rows = await db
    .select({ role: appUsers.role, emailVerifiedAt: appUsers.emailVerifiedAt })
    .from(appUsers)
    .where(eq(appUsers.id, identity.id))
    .limit(1);
  let role = rows[0]?.role;
  if (!role || !rows[0]?.emailVerifiedAt) {
    return null;
  }

  if (role !== "admin" && isBootstrapAdminEmail(email)) {
    await db.execute(sql`select public.bootstrap_initial_admin(${email})`);
    const refreshed = await db
      .select({
        role: appUsers.role,
        emailVerifiedAt: appUsers.emailVerifiedAt,
      })
      .from(appUsers)
      .where(eq(appUsers.id, identity.id))
      .limit(1);
    role = refreshed[0]?.role;
  }

  return role ? { id: identity.id, email, role } : null;
});
