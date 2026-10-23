import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ActivityAdminControls } from "@/components/ActivityAdminControls";
import { ActivityTypeBadge } from "@/components/ActivityTypeBadge";
import { DeleteTalkButton } from "@/components/DeleteTalkButton";
import { LiveActivityRefresh } from "@/components/LiveActivityRefresh";
import { PageSkeleton } from "@/components/PageSkeleton";
import { isAttendee, isManager, loadTalkAccess } from "@/lib/talks/membership";
import {
  loadTalkActivities,
  type TalkActivitySummary,
} from "@/lib/activities/talk-activities";

function formatDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function activityKind(type: string): "poll" | "quiz" | "text" {
  if (type === "quiz") return "quiz";
  if (type === "text") return "text";
  return "poll";
}

function activityLabel(type: string): string {
  if (type === "quiz") return "Quiz";
  if (type === "text") return "Text prompt";
  return "Poll";
}

export default function TalkPage({ params }: PageProps<"/talks/[talkId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TalkContent params={params} />
    </Suspense>
  );
}

async function TalkContent({
  params,
}: {
  params: PageProps<"/talks/[talkId]">["params"];
}) {
  const { talkId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }
  const { talk } = access;
  const manager = isManager(access);
  const attendee = isAttendee(access);

  const activityRows: TalkActivitySummary[] = await loadTalkActivities(talkId);

  const currentActivity = activityRows.find(
    (activity) => activity.status === "active" || activity.status === "locked",
  );
  const rankingInProgress = currentActivity?.status === "locked";
  const readyActivities = activityRows.filter(
    (activity) => activity.status === "ready",
  );
  const closedActivities = activityRows.filter(
    (activity) => activity.status === "closed",
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <LiveActivityRefresh />
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-ink text-2xl">{talk.name}</h1>
          {talk.heldAt ? (
            <p className="text-muted mt-1 text-sm font-semibold">
              {formatDate(talk.heldAt)}
            </p>
          ) : null}
          {access.access === "guest" ? (
            <p className="text-muted mt-1 text-xs font-semibold">
              Joined as{" "}
              <span className="text-ink">{access.guest.username}</span>
            </p>
          ) : null}
        </div>
        {manager && talk.isPublic ? (
          <Link
            href={`/talks/${talkId}/join-qr`}
            className="btn btn-ghost btn-small shrink-0"
          >
            Join QR
          </Link>
        ) : null}
      </div>
      {talk.description ? (
        <p className="text-ink/75 mb-8 text-sm font-semibold">
          {talk.description}
        </p>
      ) : (
        <div className="mb-8" />
      )}

      <section className="mb-8 flex flex-col gap-3">
        <h2 className="section-label">Live now</h2>
        {currentActivity ? (
          <Link
            href={
              attendee && !rankingInProgress
                ? `/talks/${talkId}/activities/${currentActivity.id}`
                : `/talks/${talkId}/activities/${currentActivity.id}/results`
            }
            prefetch={true}
            className="card card-hover border-l-green flex flex-col gap-1 border-l-[9px] p-4"
          >
            <span className="flex flex-wrap items-center gap-2">
              {rankingInProgress ? (
                <span className="chip chip-draft">RANKING</span>
              ) : (
                <span className="chip chip-live">
                  <span className="pulse-dot" />
                  LIVE
                </span>
              )}
              <ActivityTypeBadge type={currentActivity.type} />
              <span className="text-ink font-bold">
                {rankingInProgress
                  ? `${activityLabel(currentActivity.type)} is being ranked: ${currentActivity.question}`
                  : `${activityLabel(currentActivity.type)} is open: ${currentActivity.question}`}
              </span>
            </span>
            <span className="text-green text-sm font-bold">
              {rankingInProgress
                ? "Results are being prepared →"
                : attendee
                  ? currentActivity.type === "text"
                    ? "Tap to answer →"
                    : "Tap to vote and see results →"
                  : "Tap to open the live activity →"}
            </span>
          </Link>
        ) : (
          <p className="empty">No active activity right now.</p>
        )}
      </section>

      {manager && readyActivities.length > 0 ? (
        <section className="mb-8 flex flex-col gap-3">
          <h2 className="section-label">Ready activities</h2>
          <ul className="flex flex-col gap-3">
            {readyActivities.map((activity) => (
              <li key={activity.id}>
                <div className="card flex flex-col gap-4 p-4">
                  <span className="flex flex-wrap items-center gap-2">
                    <ActivityTypeBadge type={activity.type} />
                    <span className="text-ink font-bold">
                      {activity.question}
                    </span>
                  </span>
                  <ActivityAdminControls
                    activityId={activity.id}
                    kind={activityKind(activity.type)}
                    status="ready"
                    launchBlockedReason={
                      currentActivity
                        ? rankingInProgress
                          ? "Results are being prepared for the current activity. Wait for it to close before launching another."
                          : "Close the live activity before launching another."
                        : null
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mb-8 flex flex-col gap-3">
        <h2 className="section-label">Materials</h2>
        {talk.slidesUpdatedAt ? (
          <a
            href={`/talks/${talkId}/slides/download`}
            className="card card-hover flex flex-col gap-0.5 p-4"
          >
            <span className="text-ink font-bold">
              📄 Download the slides (PDF)
            </span>
            <span className="text-muted text-xs font-semibold">
              Uploaded {formatDate(talk.slidesUpdatedAt)}
            </span>
          </a>
        ) : (
          <p className="empty">Slides have not been uploaded yet.</p>
        )}
      </section>

      {closedActivities.length > 0 ? (
        <details className="group mb-8">
          <summary className="section-label flex cursor-pointer list-none items-center gap-2 select-none [&::-webkit-details-marker]:hidden">
            <span
              aria-hidden
              className="text-[0.7rem] transition group-open:rotate-90"
            >
              ▶
            </span>
            Past activities ({closedActivities.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-2">
            {closedActivities.map((activity) => (
              <li key={activity.id}>
                <Link
                  href={`/talks/${talkId}/activities/${activity.id}/results`}
                  prefetch={true}
                  className="card card-hover flex items-center justify-between gap-4 p-4"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <ActivityTypeBadge type={activity.type} />
                    <span className="text-ink font-bold">
                      {activity.question}
                    </span>
                  </span>
                  <span className="text-muted shrink-0 text-sm font-bold">
                    Results →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {manager ? (
        <section className="border-ink/25 flex flex-col gap-3 border-t-[3px] border-dashed pt-8">
          <h2 className="section-label section-label-danger">Danger zone</h2>
          <div className="flex flex-wrap items-center gap-2">
            <DeleteTalkButton talkId={talkId} talkName={talk.name} />
          </div>
        </section>
      ) : null}
    </main>
  );
}
