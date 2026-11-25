import { notFound } from "next/navigation";
import { Suspense } from "react";

import { I18nProvider } from "@/components/I18nProvider";
import { PageSkeleton } from "@/components/PageSkeleton";
import { RosterScreen } from "@/components/RosterScreen";
import { getLocale } from "@/lib/i18n/server";
import { isManager, loadTalkAccess } from "@/lib/talks/membership";
import { getSiteUrl } from "@/lib/platform/site-url";
import { loadTalkGuests } from "@/lib/talks/talk-guests-db";
import { loadTalkRoster } from "@/lib/talks/talk-roster";

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
  const locale = await getLocale();

  return (
    <I18nProvider locale={locale}>
      <main className="mx-auto w-full max-w-2xl px-6 py-12">
        <RosterScreen
          talkId={talkId}
          talkName={access.talk.name}
          roster={roster}
          initialGuests={guests.map((guest) => ({
            id: guest.id,
            username: guest.username,
            joinedAt: guest.joinedAt.toISOString(),
          }))}
          isPublic={access.talk.isPublic}
          joinOpen={access.talk.anonymousJoinOpen}
          joinUrl={joinUrl}
        />
      </main>
    </I18nProvider>
  );
}
