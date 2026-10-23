import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/PageSkeleton";
import { RosterScreen } from "@/components/RosterScreen";
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
      <RosterScreen
        talkId={talkId}
        talkName={access.talk.name}
        roster={roster}
        initialGuests={guests.map((guest) => ({
          id: guest.id,
          username: guest.username,
          joinedAtLabel: formatGuestJoinedAt(guest.joinedAt),
        }))}
        isPublic={access.talk.isPublic}
        joinOpen={access.talk.anonymousJoinOpen}
        joinUrl={joinUrl}
      />
    </main>
  );
}
