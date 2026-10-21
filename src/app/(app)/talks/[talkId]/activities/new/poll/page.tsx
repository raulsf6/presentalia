import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/PageSkeleton";
import { PollForm } from "@/components/PollForm";
import { isManager, loadTalkAccess } from "@/lib/membership";

export default function NewPollPage({
  params,
}: PageProps<"/talks/[talkId]/activities/new/poll">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewPollContent params={params} />
    </Suspense>
  );
}

async function NewPollContent({
  params,
}: {
  params: PageProps<"/talks/[talkId]/activities/new/poll">["params"];
}) {
  const { talkId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }
  if (!isManager(access)) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-lg px-6 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="font-display text-ink text-2xl">New poll</h1>
        <Link
          href={`/talks/${talkId}/activities/new`}
          className="linky shrink-0"
        >
          ← New activity
        </Link>
      </div>
      <div className="card p-6">
        <PollForm talkId={talkId} />
      </div>
    </main>
  );
}
