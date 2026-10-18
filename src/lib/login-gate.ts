import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { appUsers } from "@/db/schema";
import { isBootstrapAdminEmail } from "@/lib/admin";

/**
 * Login allowlist: provisioned app users and the one-time bootstrap email may
 * request a magic link, whether or not the user currently belongs to a talk.
 * Runs on the owner connection because it gates pre-auth requests; it answers
 * a boolean and exposes nothing else.
 */
export async function isAllowedLoginEmail(email: string): Promise<boolean> {
  if (isBootstrapAdminEmail(email)) {
    return true;
  }
  const normalized = email.trim().toLowerCase();
  const appUser = await getDb()
    .select({ id: appUsers.id })
    .from(appUsers)
    .where(eq(appUsers.email, normalized))
    .limit(1);
  return appUser.length > 0;
}
