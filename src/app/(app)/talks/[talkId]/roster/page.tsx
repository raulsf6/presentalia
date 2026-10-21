import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AnonymousAccessManager } from "@/components/AnonymousAccessManager";
import { GuestManager } from "@/components/GuestManager";
import { PageSkeleton } from "@/components/PageSkeleton";
import { RosterManager } from "@/components/RosterManager";
import { isManager, loadTalkAccess } from "@/lib/membership";
import { getSiteUrl } from "@/lib/site-url";
import { formatGuestJoinedAt } from "@/lib/talk-guests";
import { loadTalkGuests } from "@/lib/talk-guests-db";
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

  const [roster, guests] = await Promise.all([
    loadTalkRoster(talkId),
    loadTalkGuests(talkId),
  ]);
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
        />
      </div>
      <div className="card mb-6 p-6">
        <GuestManager
          talkId={talkId}
          initialGuests={guests.map((guest) => ({
            id: guest.id,
            username: guest.username,
            joinedAtLabel: formatGuestJoinedAt(guest.joinedAt),
          }))}
        />
      </div>
      <div className="card p-6">
        <RosterManager talkId={talkId} roster={roster} />
      </div>
    </main>
  );
}
