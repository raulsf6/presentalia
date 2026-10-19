import { cache } from "react";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { getDb, type Db, type DbTx } from "@/db";
import { appUsers, talkRoster, talks, type TalkRow } from "@/db/schema";
import { getSessionUser, type SessionUser } from "@/lib/auth";
import type { AppRole } from "@/lib/roles";

export type TalkAccess = {
  user: SessionUser;
  talk: TalkRow;
  access: "admin" | "presenter" | "member";
};

export type TalkManagerGuard =
  | {
      ok: true;
      user: SessionUser;
      talk: TalkRow;
      access: "admin" | "presenter";
    }
  | { ok: false; error: string };

export type TalkListRow = TalkRow & {
  ownerEmail: string | null;
};

/** Checks a talk using the verified session role and the database roster. */
export async function getTalkAccessForUser(
  user: SessionUser,
  talkId: string,
  db: Db = getDb(),
): Promise<TalkAccess | null> {
  const [row] = await db
    .select({ talk: talks, memberUserId: talkRoster.userId })
    .from(talks)
    .leftJoin(
      talkRoster,
      and(eq(talkRoster.talkId, talks.id), eq(talkRoster.userId, user.id)),
    )
    .where(eq(talks.id, talkId))
    .limit(1);
  if (!row) {
    return null;
  }

  const { talk } = row;
  if (user.role === "admin") {
    return { user, talk, access: "admin" };
  }
  if (user.role === "presenter" && talk.createdBy === user.id) {
    return { user, talk, access: "presenter" };
  }
  return row.memberUserId ? { user, talk, access: "member" } : null;
}

/** Request-level talk access. Null intentionally hides missing vs inaccessible talks. */
export const loadTalkAccess = cache(
  async (talkId: string): Promise<TalkAccess | null> => {
    const user = await getSessionUser();
    return user ? getTalkAccessForUser(user, talkId) : null;
  },
);

/**
 * Cached talk list for a user. Keys contain only ids and roles; the owner
 * email is data, never part of the key. Mutations call updateTag("talks").
 */
export async function loadTalkList(
  userId: string,
  role: AppRole,
): Promise<TalkListRow[]> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  cacheTag("talks");
  return listAccessibleTalks(userId, role);
}

/** Uncached query behind loadTalkList, injectable for database tests. */
export async function listAccessibleTalks(
  userId: string,
  role: AppRole,
  db: Db = getDb(),
): Promise<TalkListRow[]> {
  const rosterTalkIds = db
    .select({ talkId: talkRoster.talkId })
    .from(talkRoster)
    .where(eq(talkRoster.userId, userId));

  const accessible =
    role === "admin"
      ? undefined
      : role === "presenter"
        ? or(eq(talks.createdBy, userId), inArray(talks.id, rosterTalkIds))
        : inArray(talks.id, rosterTalkIds);

  const rows = await db
    .select({ talk: talks, ownerEmail: appUsers.email })
    .from(talks)
    .leftJoin(appUsers, eq(appUsers.id, talks.createdBy))
    .where(accessible)
    .orderBy(desc(talks.createdAt));

  return rows.map(({ talk, ownerEmail }) => ({ ...talk, ownerEmail }));
}

/** Roster membership is required for attendee actions such as voting. */
export async function isRosteredAttendee(
  user: SessionUser,
  talkId: string,
  tx?: DbTx,
): Promise<boolean> {
  const query = (tx ?? getDb())
    .select({ userId: talkRoster.userId })
    .from(talkRoster)
    .where(and(eq(talkRoster.talkId, talkId), eq(talkRoster.userId, user.id)))
    .limit(1);
  const [membership] = tx ? await query.for("share") : await query;
  return Boolean(membership);
}

/** Re-checks ownership/role inside every server action that manages a talk. */
export async function requireTalkManager(
  talkId: string,
): Promise<TalkManagerGuard> {
  const access = await loadTalkAccess(talkId);
  if (!access) {
    return { ok: false, error: "You don't have access to this talk." };
  }
  if (access.access === "member") {
    return { ok: false, error: "You can't manage this talk." };
  }
  return {
    ok: true,
    user: access.user,
    talk: access.talk,
    access: access.access,
  };
}
