import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { LiveResults } from "@/components/LiveResults";
import { loadTalkAccess } from "@/lib/membership";
import { loadPollResults } from "@/lib/poll-results";

export const dynamic = "force-dynamic";

export default async function PollResultsPage({
  params,
  searchParams,
}: PageProps<"/talks/[talkId]/polls/[pollId]/results">) {
  const { talkId, pollId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }

  const initial = await loadPollResults(pollId, access.user);
  if (!initial || initial.poll.talkId !== talkId) {
    notFound();
  }
  if (initial.poll.status === "draft") {
    redirect(`/talks/${talkId}/polls/${pollId}`);
  }

  const query = await searchParams;
  const display = Array.isArray(query.display)
    ? query.display[0]
    : query.display;
  const projector = display === "projector";
  const toggleHref = projector
    ? `/talks/${talkId}/polls/${pollId}/results`
    : `/talks/${talkId}/polls/${pollId}/results?display=projector`;

  return (
    <main
      className={`mx-auto w-full px-6 py-8 ${
        projector ? "max-w-7xl" : "max-w-3xl"
      }`}
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href={`/talks/${talkId}`}
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
        >
          ← {access.talk.name}
        </Link>
        <Link
          href={toggleHref}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          {projector ? "Attendee view" : "Projector view"}
        </Link>
      </div>
      <LiveResults initial={initial} projector={projector} />
    </main>
  );
}
