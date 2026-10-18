import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { appUsers, talkRoster } from "@/db/schema";
import { RosterManager } from "@/components/RosterManager";
import { loadTalkAccess } from "@/lib/membership";

export const dynamic = "force-dynamic";

export default async function RosterPage({
  params,
}: PageProps<"/talks/[talkId]/roster">) {
  const { talkId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }
  if (access.access === "member") {
    notFound();
  }

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

  const roster = rows.map((row) => ({
    userId: row.userId,
    email: row.email,
    addedAtLabel: row.addedAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
    emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
  }));

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-8">
        <h1 className="font-display text-ink text-2xl font-extrabold">
          Attendee roster
        </h1>
        <p className="text-muted mt-1 text-sm font-semibold">
          {access.talk.name} — only these users can access this talk.
        </p>
      </div>
      <div className="card p-6">
        <RosterManager talkId={talkId} roster={roster} />
      </div>
    </main>
  );
}
