import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { activities, polls } from "@/db/schema";
import { DeleteTalkButton } from "@/components/DeleteTalkButton";
import { loadTalkAccess } from "@/lib/membership";

export const dynamic = "force-dynamic";

type PollSummary = {
  id: string;
  status: string;
  question: string;
};

function formatDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function TalkPage({
  params,
}: PageProps<"/talks/[talkId]">) {
  const { talkId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }
  const { talk, access: role } = access;

  const pollRows: PollSummary[] = await getDb()
    .select({
      id: activities.id,
      status: activities.status,
      question: polls.question,
    })
    .from(activities)
    .innerJoin(polls, eq(polls.activityId, activities.id))
    .where(eq(activities.talkId, talkId))
    .orderBy(desc(activities.createdAt));

  const activePoll = pollRows.find((poll) => poll.status === "active");
  const closedPolls = pollRows.filter((poll) => poll.status === "closed");

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-2">
        <h1 className="font-display text-ink text-2xl font-extrabold">
          {talk.name}
        </h1>
        {talk.heldAt ? (
          <p className="text-muted mt-1 text-sm font-semibold">
            {formatDate(talk.heldAt)}
          </p>
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
        {activePoll ? (
          <Link
            href={`/talks/${talkId}/polls/${activePoll.id}`}
            className="border-green shadow-hard-green flex flex-col gap-1 rounded-2xl border-2 bg-white p-4 transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_5px_0_var(--color-green)]"
          >
            <span className="flex flex-wrap items-center gap-2">
              <span className="chip chip-live">
                <span className="pulse-dot" />
                LIVE
              </span>
              <span className="text-ink font-extrabold">
                Poll is open: {activePoll.question}
              </span>
            </span>
            <span className="text-green text-sm font-bold">
              Tap to {role === "member" ? "vote and see results" : "manage"} →
            </span>
          </Link>
        ) : (
          <p className="empty">No active poll right now.</p>
        )}
      </section>

      <section className="mb-8 flex flex-col gap-3">
        <h2 className="section-label">Materials</h2>
        {talk.slidesUpdatedAt ? (
          <a
            href={`/talks/${talkId}/slides/download`}
            className="card card-hover flex flex-col gap-0.5 p-4"
          >
            <span className="text-ink font-extrabold">
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

      {closedPolls.length > 0 ? (
        <section className="mb-8 flex flex-col gap-3">
          <h2 className="section-label">Past polls</h2>
          <ul className="flex flex-col gap-2">
            {closedPolls.map((poll) => (
              <li key={poll.id}>
                <Link
                  href={`/talks/${talkId}/polls/${poll.id}/results`}
                  className="card card-hover flex items-center justify-between gap-4 p-4"
                >
                  <span className="text-ink font-bold">{poll.question}</span>
                  <span className="text-muted shrink-0 text-sm font-bold">
                    Results →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {role !== "member" ? (
        <section className="border-ink/15 flex flex-col gap-3 border-t-2 border-dashed pt-8">
          <h2 className="section-label">Danger zone</h2>
          <div className="flex flex-wrap items-center gap-2">
            <DeleteTalkButton talkId={talkId} talkName={talk.name} />
          </div>
        </section>
      ) : null}
    </main>
  );
}
