import { asc } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { getDb, type Db } from "@/db";
import { appUsers } from "@/db/schema";
import type { AppRole } from "@/lib/auth/roles";

export type AdminUserListRow = {
  id: string;
  email: string | null;
  role: AppRole;
  emailVerifiedAt: string | null;
};

/** Every provisioned user, ordered for the admin management screen. */
export async function listAdminUsers(
  db: Db = getDb(),
): Promise<AdminUserListRow[]> {
  const rows = await db
    .select({
      id: appUsers.id,
      email: appUsers.email,
      role: appUsers.role,
      emailVerifiedAt: appUsers.emailVerifiedAt,
    })
    .from(appUsers)
    .orderBy(asc(appUsers.email));

  return rows.map((row) => ({
    ...row,
    emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
  }));
}

/**
 * Cached admin user list. User actions invalidate the `users` tag, so role
 * changes and removals are reflected immediately.
 */
export async function loadAdminUsers(): Promise<AdminUserListRow[]> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  cacheTag("users");

  return listAdminUsers();
}
