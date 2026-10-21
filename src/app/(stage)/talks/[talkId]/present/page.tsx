import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PresentationDeck } from "@/components/slides/presentation-deck";
import { isManager, loadTalkAccess } from "@/lib/membership";
import { slideStateFromTalk } from "@/lib/slide-state";

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

  const initial = slideStateFromTalk(access.talk);

  return (
    <PresentationDeck
      talkId={talkId}
      talkName={access.talk.name}
      slidesUpdatedAt={initial.slidesUpdatedAt}
      initial={initial}
    />
  );
}
