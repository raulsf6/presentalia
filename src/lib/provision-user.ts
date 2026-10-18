import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { appUsers, type AppUserRow } from "@/db/schema";
import { normalizeEmail } from "@/lib/roster";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

async function findAppUser(email: string): Promise<AppUserRow | null> {
  const [user] = await getDb()
    .select()
    .from(appUsers)
    .where(eq(appUsers.email, email))
    .limit(1);
  return user ?? null;
}

/** Reuses or creates an unconfirmed Auth account and its trigger-synced app row. */
export async function ensureAppUser(
  rawEmail: string,
): Promise<AppUserRow | null> {
  const email = normalizeEmail(rawEmail);
  const existing = await findAppUser(email);
  if (existing) {
    return existing;
  }

  try {
    const service = createSupabaseServiceClient();
    const { data, error } = await service.auth.admin.createUser({
      email,
      email_confirm: false,
    });
    if (error && error.code !== "email_exists") {
      return null;
    }

    if (data.user?.id) {
      const [created] = await getDb()
        .select()
        .from(appUsers)
        .where(eq(appUsers.id, data.user.id))
        .limit(1);
      if (created) {
        return created;
      }
    }
  } catch {
    return findAppUser(email);
  }

  // An Auth account may already exist from another provisioning path. The
  // sync trigger normally created this row; re-read it after email_exists.
  return findAppUser(email);
}

/** Sends or resends the Supabase invite for an unverified provisioned account. */
export async function sendAppUserInvite(rawEmail: string): Promise<boolean> {
  const email = normalizeEmail(rawEmail);
  try {
    const service = createSupabaseServiceClient();
    const { error } = await service.auth.admin.inviteUserByEmail(email);
    if (!error) {
      return true;
    }
    if (error.code === "email_exists") {
      const existing = await findAppUser(email);
      return Boolean(existing?.emailVerifiedAt);
    }
    return false;
  } catch {
    return false;
  }
}
