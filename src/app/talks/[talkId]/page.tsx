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
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{talk.name}</h1>
          {talk.heldAt ? (
            <p className="mt-1 text-sm text-zinc-500">
              {formatDate(talk.heldAt)}
            </p>
          ) : null}
        </div>
        <Link
          href="/talks"
          className="shrink-0 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
        >
          ← All talks
        </Link>
      </div>
      {talk.description ? (
        <p className="mb-8 text-sm text-zinc-600">{talk.description}</p>
      ) : (
        <div className="mb-8" />
      )}

      <section className="mb-8 flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-400 uppercase">
          Live now
        </h2>
        {activePoll ? (
          <Link
            href={`/talks/${talkId}/polls/${activePoll.id}`}
            className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 transition-colors hover:border-emerald-500"
          >
            <span className="font-medium text-emerald-900">
              Poll is open: {activePoll.question}
            </span>
            <span className="mt-1 block text-sm text-emerald-700">
              Tap to {role === "member" ? "vote and see results" : "manage"} →
            </span>
          </Link>
        ) : (
          <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
            No active poll right now.
          </p>
        )}
      </section>

      <section className="mb-8 flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-400 uppercase">
          Materials
        </h2>
        {talk.slidesUpdatedAt ? (
          <a
            href={`/talks/${talkId}/slides/download`}
            className="rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400"
          >
            <span className="font-medium text-zinc-900">
              Download the slides (PDF)
            </span>
            <span className="mt-1 block text-xs text-zinc-500">
              Uploaded {formatDate(talk.slidesUpdatedAt)}
            </span>
          </a>
        ) : (
          <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
            Slides have not been uploaded yet.
          </p>
        )}
      </section>

      {closedPolls.length > 0 ? (
        <section className="mb-8 flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-400 uppercase">
            Past polls
          </h2>
          <ul className="flex flex-col gap-2">
            {closedPolls.map((poll) => (
              <li key={poll.id}>
                <Link
                  href={`/talks/${talkId}/polls/${poll.id}/results`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400"
                >
                  <span className="font-medium text-zinc-900">
                    {poll.question}
                  </span>
                  <span className="text-sm text-zinc-500">Results →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {role !== "member" ? (
        <section className="flex flex-col gap-3 border-t border-zinc-200 pt-8">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-400 uppercase">
            Manage talk
          </h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/talks/${talkId}/roster`}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Attendee roster
            </Link>
            <Link
              href={`/talks/${talkId}/slides`}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Slides
            </Link>
            <Link
              href={`/talks/${talkId}/polls`}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Polls
            </Link>
          </div>
          <DeleteTalkButton talkId={talkId} talkName={talk.name} />
        </section>
      ) : null}
    </main>
  );
}
