import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/PageSkeleton";
import { RosterManager } from "@/components/RosterManager";
import { loadTalkAccess } from "@/lib/membership";
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
  if (access.access === "member") {
    notFound();
  }

  const roster = await loadTalkRoster(talkId);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-8">
        <h1 className="font-display text-ink text-2xl">Attendee roster</h1>
        <p className="text-muted mt-1 text-sm font-semibold">
          {access.talk.name} — only these users can access this talk.
        </p>
      </div>
      <div className="card p-6">
        <RosterManager talkId={talkId} roster={roster} />
      </div>
    </main>
  );
}
