import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { ActivityAdminControls } from "@/components/ActivityAdminControls";
import { ActivityTypeBadge } from "@/components/ActivityTypeBadge";
import { LiveResults } from "@/components/LiveResults";
import { PageSkeleton } from "@/components/PageSkeleton";
import { QuizLiveResults } from "@/components/QuizLiveResults";
import { TextActivityControls } from "@/components/TextActivityControls";
import { TextLiveResults } from "@/components/TextLiveResults";
import { loadActivityPageContext } from "@/lib/activities/activity-workspace";
import { isManager } from "@/lib/talks/membership";
import { loadPollResults } from "@/lib/activities/poll-results";
import type { PollResultsPayload } from "@/lib/activities/polls";
import {
  loadQuizResults,
  type QuizResultsPayload,
} from "@/lib/activities/quiz-results";
import {
  loadTextResults,
  type TextResultsPayload,
} from "@/lib/activities/text-results";

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

  let poll: PollResultsPayload | null = null;
  let quiz: QuizResultsPayload | null = null;
  let text: TextResultsPayload | null = null;

  if (activity.type === "poll") {
    poll = await loadPollResults(activityId, access);
    if (!poll || poll.poll.talkId !== talkId) {
      notFound();
    }
    if (poll.poll.status === "ready") {
      redirect(activityHref);
    }
  } else if (activity.type === "quiz") {
    quiz = await loadQuizResults(activityId, access, {
      projector,
    });
    if (!quiz || quiz.quiz.talkId !== talkId) {
      notFound();
    }
    if (quiz.needsVote) {
      redirect(activityHref);
    }
    if (quiz.quiz.status === "ready") {
      redirect(activityHref);
    }
  } else if (activity.type === "text") {
    text = await loadTextResults(activityId, access, {
      projector,
    });
    if (!text || text.activity.talkId !== talkId) {
      notFound();
    }
    if (text.needsVote) {
      redirect(activityHref);
    }
    if (text.activity.status === "ready") {
      redirect(activityHref);
    }
  } else {
    notFound();
  }

  const kind = activity.type === "quiz" ? "quiz" : "poll";
  const active = activity.status === "active";
  const manager = isManager(access);
  const textControls =
    text && manager && !projector && activity.status !== "closed";

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
      {text && textControls ? (
        <div className="mb-6">
          <TextActivityControls
            activityId={activityId}
            status={activity.status as "active" | "locked"}
            runStatus={text.run?.status ?? null}
            answerCount={text.activity.totalAnswers}
          />
        </div>
      ) : !projector && manager && active ? (
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
            <ActivityTypeBadge type={activity.type} size="lg" />
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
        ) : text ? (
          <TextLiveResults
            key={`${text.activity.id}-${text.activity.status}-${projector ? "projector" : "attendee"}`}
            initial={text}
            projector={projector}
          />
        ) : null}
      </div>
    </main>
  );
}
