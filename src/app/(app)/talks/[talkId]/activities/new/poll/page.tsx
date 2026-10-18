import Link from "next/link";
import { notFound } from "next/navigation";

import { PollForm } from "@/components/PollForm";
import { loadTalkAccess } from "@/lib/membership";

export const dynamic = "force-dynamic";

export default async function NewPollPage({
  params,
}: PageProps<"/talks/[talkId]/activities/new/poll">) {
  const { talkId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }
  if (access.access === "member") {
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
