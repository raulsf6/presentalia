"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";

import { getDb } from "@/db";
import { appUsers, talkRoster } from "@/db/schema";
import { requireTalkManager } from "@/lib/membership";
import { ensureAppUser, sendAppUserInvite } from "@/lib/provision-user";
import { mergeRoster, parseCsv, parseEmailList } from "@/lib/roster";

export type RosterSummary = {
  ok: boolean;
  error?: string;
  added?: number;
  invalid?: string[];
  duplicates?: string[];
  alreadyPresent?: string[];
  inviteFailed?: string[];
};

async function addEmails(
  talkId: string,
  valid: string[],
  invalid: string[],
  duplicates: string[],
): Promise<RosterSummary> {
  const db = getDb();
  const existing = await db
    .select({ email: appUsers.email })
    .from(talkRoster)
    .innerJoin(appUsers, eq(appUsers.id, talkRoster.userId))
    .where(eq(talkRoster.talkId, talkId));
  const { toAdd, alreadyPresent } = mergeRoster(
    existing.flatMap((row) => (row.email ? [row.email] : [])),
    valid,
  );

  const accounts: {
    email: string;
    userId: string;
    emailVerifiedAt: Date | null;
  }[] = [];
  for (const email of toAdd) {
    try {
      const appUser = await ensureAppUser(email);
      if (!appUser) {
        return {
          ok: false,
          error: `Could not create an account for ${email}.`,
        };
      }
      accounts.push({
        email,
        userId: appUser.id,
        emailVerifiedAt: appUser.emailVerifiedAt,
      });
    } catch {
      return {
        ok: false,
        error: `Could not create an account for ${email}.`,
      };
    }
  }

  let added = 0;
  if (accounts.length > 0) {
    const inserted = await db
      .insert(talkRoster)
      .values(accounts.map(({ userId }) => ({ talkId, userId })))
      .onConflictDoNothing()
      .returning({ userId: talkRoster.userId });
    added = inserted.length;
  }
  const inviteFailed: string[] = [];
  for (const account of accounts) {
    if (!account.emailVerifiedAt && !(await sendAppUserInvite(account.email))) {
      inviteFailed.push(account.email);
    }
  }
  updateTag("talks");
  updateTag("roster");
  revalidatePath(`/talks/${talkId}`);
  revalidatePath(`/talks/${talkId}/roster`);
  return {
    ok: true,
    added,
    invalid,
    duplicates,
    alreadyPresent,
    inviteFailed,
  };
}

/**
 * Adds attendees from free-form input (one address per line, or
 * comma/semicolon separated). Validation errors, duplicates within the
 * input, and addresses already on the roster are reported, not silently
 * dropped.
 */
export async function addRosterAction(
  talkId: string,
  raw: string,
): Promise<RosterSummary> {
  const guard = await requireTalkManager(talkId);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const parsed = parseEmailList(raw);
  return addEmails(talkId, parsed.valid, parsed.invalid, parsed.duplicates);
}

/**
 * Imports attendees from an uploaded CSV (≤ 1 MB, first column, or the
 * column headed "email"). Same reporting rules as addRosterAction.
 */
export async function importRosterCsvAction(
  talkId: string,
  formData: FormData,
): Promise<RosterSummary> {
  const guard = await requireTalkManager(talkId);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const file = formData.get("csv");
  if (!(file instanceof File)) {
    return { ok: false, error: "Please choose a CSV file." };
  }
  const isCsv =
    file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv");
  if (!isCsv) {
    return { ok: false, error: "Please choose a CSV file." };
  }
  if (file.size > 1024 * 1024) {
    return { ok: false, error: "That CSV is too large (1 MB limit)." };
  }
  const parsed = parseCsv(await file.text());
  return addEmails(talkId, parsed.valid, parsed.invalid, parsed.duplicates);
}

/** Removes a single address from the talk's roster. */
export async function removeRosterEntryAction(
  talkId: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const guard = await requireTalkManager(talkId);
  if (!guard.ok) {
    return guard;
  }
  await getDb()
    .delete(talkRoster)
    .where(and(eq(talkRoster.talkId, talkId), eq(talkRoster.userId, userId)));
  updateTag("talks");
  updateTag("roster");
  revalidatePath(`/talks/${talkId}`);
  revalidatePath(`/talks/${talkId}/roster`);
  return { ok: true };
}
