import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Suspense } from "react";

import { ActivityAdminControls } from "@/components/ActivityAdminControls";
import { LiveResults } from "@/components/LiveResults";
import { PageSkeleton } from "@/components/PageSkeleton";
import { QuizLiveResults } from "@/components/QuizLiveResults";
import { getDb } from "@/db";
import { activities } from "@/db/schema";
import { loadTalkAccess } from "@/lib/membership";
import { loadPollResults } from "@/lib/poll-results";
import type { PollResultsPayload } from "@/lib/polls";
import { loadQuizResults, type QuizResultsPayload } from "@/lib/quiz-results";

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

async function ActivityResultsContent({
  params,
  searchParams,
}: {
  params: PageProps<"/talks/[talkId]/activities/[activityId]/results">["params"];
  searchParams: PageProps<"/talks/[talkId]/activities/[activityId]/results">["searchParams"];
}) {
  const { talkId, activityId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }

  const [activity] = await getDb()
    .select({
      type: activities.type,
      status: activities.status,
      talkId: activities.talkId,
    })
    .from(activities)
    .where(eq(activities.id, activityId))
    .limit(1);
  if (!activity || activity.talkId !== talkId) {
    notFound();
  }

  const query = await searchParams;
  const display = Array.isArray(query.display)
    ? query.display[0]
    : query.display;
  const projector = display === "projector";
  const toggleHref = projector
    ? `/talks/${talkId}/activities/${activityId}/results`
    : `/talks/${talkId}/activities/${activityId}/results?display=projector`;
  const activityHref = `/talks/${talkId}/activities/${activityId}`;

  let poll: PollResultsPayload | null = null;
  let quiz: QuizResultsPayload | null = null;

  if (activity.type === "poll") {
    poll = await loadPollResults(activityId, access.user, { access });
    if (!poll || poll.poll.talkId !== talkId) {
      notFound();
    }
    if (poll.poll.status === "draft") {
      redirect(activityHref);
    }
  } else if (activity.type === "quiz") {
    quiz = await loadQuizResults(activityId, access.user, {
      access,
      projector,
    });
    if (!quiz || quiz.quiz.talkId !== talkId) {
      notFound();
    }
    if (quiz.needsVote) {
      redirect(activityHref);
    }
    if (quiz.quiz.status === "draft") {
      redirect(activityHref);
    }
  } else {
    notFound();
  }

  const kind = activity.type === "quiz" ? "quiz" : "poll";
  const active = activity.status === "active";

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
      {!projector && access.access !== "member" && active ? (
        <div className="mb-6">
          <ActivityAdminControls
            activityId={activityId}
            kind={kind}
            status="active"
          />
        </div>
      ) : null}
      {poll ? (
        <LiveResults
          key={`${poll.poll.id}-${poll.poll.status}`}
          initial={poll}
          projector={projector}
        />
      ) : quiz ? (
        <QuizLiveResults
          key={`${quiz.quiz.id}-${quiz.quiz.status}-${projector ? "projector" : "attendee"}`}
          initial={quiz}
          projector={projector}
        />
      ) : null}
    </main>
  );
}
