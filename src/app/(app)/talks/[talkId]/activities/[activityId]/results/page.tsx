import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { LiveResults } from "@/components/LiveResults";
import { PollAdminControls } from "@/components/PollAdminControls";
import { loadTalkAccess } from "@/lib/membership";
import { loadPollResults } from "@/lib/poll-results";

export const dynamic = "force-dynamic";

export default async function PollResultsPage({
  params,
  searchParams,
}: PageProps<"/talks/[talkId]/activities/[activityId]/results">) {
  const { talkId, activityId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }

  const initial = await loadPollResults(activityId, access.user, { access });
  if (!initial || initial.poll.talkId !== talkId) {
    notFound();
  }
  if (initial.poll.status === "draft") {
    redirect(`/talks/${talkId}/activities/${activityId}`);
  }

  const query = await searchParams;
  const display = Array.isArray(query.display)
    ? query.display[0]
    : query.display;
  const projector = display === "projector";
  const toggleHref = projector
    ? `/talks/${talkId}/activities/${activityId}/results`
    : `/talks/${talkId}/activities/${activityId}/results?display=projector`;

  return (
    <main
      className={`mx-auto w-full px-6 py-8 ${
        projector ? "max-w-7xl" : "max-w-3xl"
      }`}
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href={`/talks/${talkId}`} className="linky">
          ← {access.talk.name}
        </Link>
        <Link href={toggleHref} className="btn btn-ghost btn-small">
          {projector ? "Attendee view" : "Projector view"}
        </Link>
      </div>
      {!projector &&
      access.access !== "member" &&
      initial.poll.status === "active" ? (
        <div className="mb-6">
          <PollAdminControls pollId={activityId} status="active" />
        </div>
      ) : null}
      <LiveResults initial={initial} projector={projector} />
    </main>
  );
}
