import { notFound } from "next/navigation";
import { Suspense } from "react";

import { I18nProvider } from "@/components/I18nProvider";
import { PresentationDeck } from "@/components/slides/presentation-deck";
import { getLocale } from "@/lib/i18n/server";
import { isManager, loadTalkAccess } from "@/lib/talks/membership";
import { readSlideState, slideStateFromTalk } from "@/lib/deck/slide-state";

export default function PresentPage({
  params,
}: PageProps<"/talks/[talkId]/present">) {
  return (
    <Suspense fallback={<div className="bg-ink fixed inset-0" />}>
      <PresentContent params={params} />
    </Suspense>
  );
}

async function PresentContent({
  params,
}: {
  params: PageProps<"/talks/[talkId]/present">["params"];
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
      <PresentationDeck
        talkId={talkId}
        talkName={access.talk.name}
        slidesUpdatedAt={initial.slidesUpdatedAt}
        initial={initial}
      />
    </I18nProvider>
  );
}
