import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AnonymousAccessManager } from "@/components/AnonymousAccessManager";
import { GuestManager } from "@/components/GuestManager";
import { LiveActivityRefresh } from "@/components/LiveActivityRefresh";
import { PageSkeleton } from "@/components/PageSkeleton";
import { RosterManager } from "@/components/RosterManager";
import { isManager, loadTalkAccess } from "@/lib/membership";
import { getSiteUrl } from "@/lib/site-url";
import { countTalkGuests, loadTalkGuests } from "@/lib/talk-guests-db";
import { loadTalkRoster } from "@/lib/talk-roster";

function joinedAtLabel(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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
  const guestCount = await countTalkGuests(talkId);
  const joinUrl = `${await getSiteUrl()}/join/${talkId}`;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <LiveActivityRefresh />
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
          guestCount={guestCount}
        />
      </div>
      <div className="card mb-6 p-6">
        <div className="mb-4">
          <h2 className="text-ink text-sm font-bold">
            Guest attendees{guests.length > 0 ? ` (${guests.length})` : ""}
          </h2>
          <p className="text-muted text-xs font-semibold">
            Anonymous people currently in this talk. Removing a guest deletes
            their votes and answers.
          </p>
        </div>
        <GuestManager
          talkId={talkId}
          guests={guests.map((guest) => ({
            id: guest.id,
            username: guest.username,
            joinedAtLabel: joinedAtLabel(guest.joinedAt),
          }))}
        />
      </div>
      <div className="card p-6">
        <RosterManager talkId={talkId} roster={roster} />
      </div>
    </main>
  );
}
