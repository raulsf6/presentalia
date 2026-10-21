import { eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AnonymousAccessManager } from "@/components/AnonymousAccessManager";
import { PageSkeleton } from "@/components/PageSkeleton";
import { RosterManager } from "@/components/RosterManager";
import { getDb } from "@/db";
import { talkGuests } from "@/db/schema";
import { isManager, loadTalkAccess } from "@/lib/membership";
import { getSiteUrl } from "@/lib/site-url";
import { loadTalkRoster } from "@/lib/talk-roster";

export default function RosterPage({
  params,
}: PageProps<"/talks/[talkId]/roster">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RosterContent params={params} />
    </Suspense>
  );
}

async function RosterContent({
  params,
}: {
  params: PageProps<"/talks/[talkId]/roster">["params"];
}) {
  const { talkId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }
  if (!isManager(access)) {
    notFound();
  }

  const roster = await loadTalkRoster(talkId);
  const [guestCount] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(talkGuests)
    .where(eq(talkGuests.talkId, talkId));
  const joinUrl = `${await getSiteUrl()}/join/${talkId}`;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-8">
        <h1 className="font-display text-ink text-2xl">Attendees & access</h1>
        <p className="text-muted mt-1 text-sm font-semibold">
          {access.talk.name} — invited users always have access; a public talk
          can also admit anonymous guests.
        </p>
      </div>
      <div className="card mb-6 p-6">
        <AnonymousAccessManager
          talkId={talkId}
          isPublic={access.talk.isPublic}
          joinOpen={access.talk.anonymousJoinOpen}
          joinUrl={joinUrl}
          guestCount={guestCount?.count ?? 0}
        />
      </div>
      <div className="card p-6">
        <RosterManager talkId={talkId} roster={roster} />
      </div>
    </main>
  );
}
