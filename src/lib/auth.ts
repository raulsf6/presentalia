import { eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { appUsers } from "@/db/schema";
import { isBootstrapAdminEmail } from "@/lib/admin";
import type { AppRole } from "@/lib/roles";
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
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  const email = data.user.email ? data.user.email.toLowerCase() : null;
  const db = getDb();
  const rows = await db
    .select({ role: appUsers.role, emailVerifiedAt: appUsers.emailVerifiedAt })
    .from(appUsers)
    .where(eq(appUsers.id, data.user.id))
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
      .where(eq(appUsers.id, data.user.id))
      .limit(1);
    role = refreshed[0]?.role;
  }

  return role ? { id: data.user.id, email, role } : null;
}
