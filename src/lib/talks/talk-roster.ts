import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { getDb } from "@/db";
import { appUsers, talkRoster } from "@/db/schema";

export type RosterEntry = {
  userId: string;
  email: string | null;
  addedAtLabel: string;
  emailVerifiedAt: string | null;
};

/**
 * Cached roster read. The roster changes only through the roster actions,
 * which invalidate the "roster" and per-talk tags.
 */
export async function loadTalkRoster(talkId: string): Promise<RosterEntry[]> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  cacheTag("roster", `roster:${talkId}`);

  const rows = await getDb()
    .select({
      userId: talkRoster.userId,
      email: appUsers.email,
      addedAt: talkRoster.addedAt,
      emailVerifiedAt: appUsers.emailVerifiedAt,
    })
    .from(talkRoster)
    .innerJoin(appUsers, eq(appUsers.id, talkRoster.userId))
    .where(eq(talkRoster.talkId, talkId))
    .orderBy(asc(talkRoster.addedAt));

  return rows.map((row) => ({
    userId: row.userId,
    email: row.email,
    addedAtLabel: row.addedAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
    emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
  }));
}
