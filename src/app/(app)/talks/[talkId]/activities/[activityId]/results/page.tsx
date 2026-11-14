import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { ActivityAdminControls } from "@/components/ActivityAdminControls";
import { ActivityResultsBody } from "@/components/ActivityResultsBody";
import { ActivityTypeBadge } from "@/components/ActivityTypeBadge";
import { PageSkeleton } from "@/components/PageSkeleton";
import { TextActivityControls } from "@/components/TextActivityControls";
import { loadActivityPageContext } from "@/lib/activities/activity-workspace";
import { loadActivityResults } from "@/lib/activities/activity-results";
import { isManager } from "@/lib/talks/membership";

export default function ActivityResultsPage({
  params,
  searchParams,
}: PageProps<"/talks/[talkId]/activities/[activityId]/results">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ActivityResultsContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

/** The rank action calls the model; give it the full route budget. */
export const maxDuration = 60;

async function ActivityResultsContent({
  params,
  searchParams,
}: {
  params: PageProps<"/talks/[talkId]/activities/[activityId]/results">["params"];
  searchParams: PageProps<"/talks/[talkId]/activities/[activityId]/results">["searchParams"];
}) {
  const { talkId, activityId } = await params;
  const context = await loadActivityPageContext(talkId, activityId);
  if (!context) {
    notFound();
  }
  const { access, activity } = context;

  const query = await searchParams;
  const display = Array.isArray(query.display)
    ? query.display[0]
    : query.display;
  const projector = display === "projector";
  const toggleHref = projector
    ? `/talks/${talkId}/activities/${activityId}/results`
    : `/talks/${talkId}/activities/${activityId}/results?display=projector`;
  const activityHref = `/talks/${talkId}/activities/${activityId}`;

  const loaded = await loadActivityResults(activity, access, { projector });
  if (!loaded || loaded.talkId !== talkId) {
    notFound();
  }
  if (loaded.needsVote) {
    redirect(activityHref);
  }
  if (loaded.status === "ready") {
    redirect(activityHref);
  }

  const manager = isManager(access);
  const textResults = loaded.type === "text" ? loaded.payload : null;
  const textControls =
    textResults !== null && manager && !projector && loaded.status !== "closed";
  const kind =
    loaded.type === "quiz"
      ? "quiz"
      : loaded.type === "cloud"
        ? "cloud"
        : "poll";

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
      {textResults && textControls ? (
        <div className="mb-6">
          <TextActivityControls
            activityId={activityId}
            status={loaded.status as "active" | "locked"}
            runStatus={textResults.run?.status ?? null}
            answerCount={textResults.activity.totalAnswers}
          />
        </div>
      ) : !projector && manager && loaded.status === "active" ? (
        <div className="mb-6">
          <ActivityAdminControls
            activityId={activityId}
            kind={kind}
            status="active"
          />
        </div>
      ) : null}
      <div className="relative">
        {projector ? (
          <div className="pointer-events-none absolute -top-2 right-0 z-10">
            <ActivityTypeBadge type={loaded.type} size="lg" />
          </div>
        ) : null}
        <ActivityResultsBody loaded={loaded} projector={projector} />
      </div>
    </main>
  );
}
