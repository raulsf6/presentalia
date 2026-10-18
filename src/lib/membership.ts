import { and, desc, eq, inArray, or } from "drizzle-orm";

import { getDb, type DbTx } from "@/db";
import { talkRoster, talks, type TalkRow } from "@/db/schema";
import { getSessionUser, type SessionUser } from "@/lib/auth";

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

/** Checks a talk using the verified session role and the database roster. */
export async function getTalkAccessForUser(
  user: SessionUser,
  talkId: string,
): Promise<TalkAccess | null> {
  const db = getDb();
  const [talk] = await db
    .select()
    .from(talks)
    .where(eq(talks.id, talkId))
    .limit(1);
  if (!talk) {
    return null;
  }

  if (user.role === "admin") {
    return { user, talk, access: "admin" };
  }
  if (user.role === "presenter" && talk.createdBy === user.id) {
    return { user, talk, access: "presenter" };
  }
  const [membership] = await db
    .select({ userId: talkRoster.userId })
    .from(talkRoster)
    .where(and(eq(talkRoster.talkId, talkId), eq(talkRoster.userId, user.id)))
    .limit(1);
  return membership ? { user, talk, access: "member" } : null;
}

/** Request-level talk access. Null intentionally hides missing vs inaccessible talks. */
export async function loadTalkAccess(
  talkId: string,
): Promise<TalkAccess | null> {
  const user = await getSessionUser();
  return user ? getTalkAccessForUser(user, talkId) : null;
}

/** Lists only talks the verified user may access. */
export async function listAccessibleTalks(
  user: SessionUser,
): Promise<TalkRow[]> {
  const db = getDb();
  if (user.role === "admin") {
    return db.select().from(talks).orderBy(desc(talks.createdAt));
  }

  const rosterRows = await db
    .select({ talkId: talkRoster.talkId })
    .from(talkRoster)
    .where(eq(talkRoster.userId, user.id));
  const rosterTalkIds = rosterRows.map((row) => row.talkId);

  if (user.role === "presenter") {
    const ownership = eq(talks.createdBy, user.id);
    return rosterTalkIds.length > 0
      ? db
          .select()
          .from(talks)
          .where(or(ownership, inArray(talks.id, rosterTalkIds)))
          .orderBy(desc(talks.createdAt))
      : db.select().from(talks).where(ownership).orderBy(desc(talks.createdAt));
  }

  return rosterTalkIds.length > 0
    ? db
        .select()
        .from(talks)
        .where(inArray(talks.id, rosterTalkIds))
        .orderBy(desc(talks.createdAt))
    : [];
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
