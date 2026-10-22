import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/PageSkeleton";
import { isManager, loadTalkAccess } from "@/lib/membership";
import { ActivityTypeBadge } from "@/components/ActivityTypeBadge";
import { loadTalkActivities } from "@/lib/talk-activities";

const sections = [
  { status: "active", title: "Active" },
  { status: "locked", title: "Ranking" },
  { status: "ready", title: "Ready" },
  { status: "closed", title: "Closed" },
] as const;

export default function ActivitiesPage({
  params,
}: PageProps<"/talks/[talkId]/activities">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ActivitiesContent params={params} />
    </Suspense>
  );
}

async function ActivitiesContent({
  params,
}: {
  params: PageProps<"/talks/[talkId]/activities">["params"];
}) {
  const { talkId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }
  if (!isManager(access)) {
    notFound();
  }

  const activityRows = await loadTalkActivities(talkId);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-ink text-2xl">Activities</h1>
          <p className="text-muted mt-1 text-sm font-semibold">
            {access.talk.name}
          </p>
        </div>
        <Link
          href={`/talks/${talkId}/activities/new`}
          className="btn btn-small shrink-0"
        >
          + New activity
        </Link>
      </div>

      <div className="flex flex-col gap-8">
        {sections.map((section) => {
          const items = activityRows.filter(
            (activity) => activity.status === section.status,
          );
          if (items.length === 0) return null;
          return (
            <section key={section.status} className="flex flex-col gap-3">
              <h2 className="section-label">{section.title}</h2>
              <ul className="flex flex-col gap-2">
                {items.map((activity) => {
                  const isReady = section.status === "ready";
                  return (
                    <li key={activity.id}>
                      <Link
                        href={
                          isReady
                            ? `/talks/${talkId}/activities/${activity.id}`
                            : `/talks/${talkId}/activities/${activity.id}/results`
                        }
                        className="card card-hover flex items-center justify-between gap-4 p-4"
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <ActivityTypeBadge type={activity.type} />
                          <span className="text-ink font-bold">
                            {activity.question}
                          </span>
                        </span>
                        <span className="text-muted shrink-0 text-sm font-bold">
                          {isReady ? "Manage →" : "Results →"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {activityRows.length === 0 ? (
          <p className="empty">
            No activities yet. Create your first activity to get started.
          </p>
        ) : null}
      </div>
    </main>
  );
}
