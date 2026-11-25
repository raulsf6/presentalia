import { notFound } from "next/navigation";
import { Suspense } from "react";

import { I18nProvider } from "@/components/I18nProvider";
import { RemoteDeck } from "@/components/slides/remote-deck";
import { getLocale } from "@/lib/i18n/server";
import { isManager, loadTalkAccess } from "@/lib/talks/membership";
import { readSlideState, slideStateFromTalk } from "@/lib/deck/slide-state";

export default function RemotePage({
  params,
}: PageProps<"/talks/[talkId]/remote">) {
  return (
    <Suspense fallback={<div className="bg-cream fixed inset-0" />}>
      <RemoteContent params={params} />
    </Suspense>
  );
}

async function RemoteContent({
  params,
}: {
  params: PageProps<"/talks/[talkId]/remote">["params"];
}) {
  const { talkId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access || !isManager(access)) {
    notFound();
  }

  const initial =
    (await readSlideState(talkId)) ?? slideStateFromTalk(access.talk);
  const locale = await getLocale();

  return (
    <I18nProvider locale={locale}>
      <RemoteDeck
        talkId={talkId}
        talkName={access.talk.name}
        slidesUpdatedAt={initial.slidesUpdatedAt}
        initial={initial}
      />
    </I18nProvider>
  );
}
