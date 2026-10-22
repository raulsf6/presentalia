import { notFound } from "next/navigation";
import { Suspense } from "react";

import { RemoteDeck } from "@/components/slides/remote-deck";
import { isManager, loadTalkAccess } from "@/lib/membership";
import { readSlideState, slideStateFromTalk } from "@/lib/slide-state";

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

  return (
    <RemoteDeck
      talkId={talkId}
      talkName={access.talk.name}
      slidesUpdatedAt={initial.slidesUpdatedAt}
      initial={initial}
    />
  );
}
