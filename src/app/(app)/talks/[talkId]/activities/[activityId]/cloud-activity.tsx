import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ActivityAdminControls } from "@/components/ActivityAdminControls";
import { CloudAnswerForm } from "@/components/CloudAnswerForm";
import type { ActivityStatus } from "@/lib/activities/activities";
import {
  hasCloudAnswer,
  loadCloudWorkspace,
  type ActivityDetail,
} from "@/lib/activities/activity-workspace";
import { isAttendee, type TalkAccess } from "@/lib/talks/membership";

/**
 * Idea cloud activity: the editable workspace for managers and the submission
 * form for attendees. The cloud itself lives on the results page, which also
 * carries the close control.
 */
export async function CloudActivity({
  activity,
  access,
}: {
  activity: ActivityDetail;
  access: TalkAccess;
}) {
  const talkId = activity.talkId;
  const activityId = activity.id;
  const status = activity.status as ActivityStatus;
  const resultsHref = `/talks/${talkId}/activities/${activityId}/results`;

  const config = await loadCloudWorkspace(access, activityId);
  if (!config) {
    notFound();
  }

  if (!isAttendee(access) && status !== "ready") {
    redirect(resultsHref);
  }
  if (isAttendee(access) && status === "closed") {
    redirect(resultsHref);
  }
  if (isAttendee(access) && status === "active") {
    if (await hasCloudAnswer(access, activityId)) {
      redirect(resultsHref);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        {isAttendee(access) ? (
          <Link href={`/talks/${talkId}`} className="linky">
            ← {access.talk.name}
          </Link>
        ) : null}
        <div className="ml-auto">
          {status === "active" ? (
            <span className="chip chip-live">
              <span className="pulse-dot" />
              LIVE
            </span>
          ) : null}
        </div>
      </div>

      <h1 className="font-display text-ink mb-8 text-2xl">{config.prompt}</h1>

      {!isAttendee(access) ? (
        <section className="card flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-2">
            <h2 className="section-label">How it works</h2>
            <p className="text-ink/75 text-sm font-semibold">
              Attendees submit one word or short phrase each. When several
              people submit the same idea, it grows on the presenter screen and
              on the projected deck.
            </p>
            <p className="text-ink/75 text-sm font-semibold">
              The cloud is anonymous — attendee names are never shown. Close the
              activity when the room has finished; the final cloud stays
              available to everyone with access.
            </p>
          </div>
          <ActivityAdminControls
            activityId={activityId}
            kind="cloud"
            status="ready"
          />
        </section>
      ) : status === "ready" ? (
        <p className="empty">
          The idea cloud hasn&apos;t opened yet. Check back when the speaker
          launches it.
        </p>
      ) : (
        <section className="card p-6">
          <CloudAnswerForm activityId={activityId} />
        </section>
      )}
    </main>
  );
}
