import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { activities, polls } from "@/db/schema";
import { PollForm } from "@/components/PollForm";
import { loadTalkAccess } from "@/lib/membership";

export const dynamic = "force-dynamic";

const sections = [
  { status: "active", title: "Active" },
  { status: "draft", title: "Drafts" },
  { status: "closed", title: "Closed" },
] as const;

export default async function PollsPage({
  params,
}: PageProps<"/talks/[talkId]/polls">) {
  const { talkId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }
  if (access.access === "member") {
    notFound();
  }

  const pollRows = await getDb()
    .select({
      id: activities.id,
      status: activities.status,
      question: polls.question,
      createdAt: activities.createdAt,
    })
    .from(activities)
    .innerJoin(polls, eq(polls.activityId, activities.id))
    .where(eq(activities.talkId, talkId))
    .orderBy(desc(activities.createdAt));

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Polls</h1>
          <p className="mt-1 text-sm text-zinc-600">{access.talk.name}</p>
        </div>
        <Link
          href={`/talks/${talkId}`}
          className="shrink-0 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
        >
          ← Talk home
        </Link>
      </div>

      <section className="mb-10 rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-5 text-lg font-semibold text-zinc-900">
          Create a poll
        </h2>
        <PollForm talkId={talkId} />
      </section>

      <div className="flex flex-col gap-8">
        {sections.map((section) => {
          const items = pollRows.filter(
            (poll) => poll.status === section.status,
          );
          if (items.length === 0) return null;
          return (
            <section key={section.status} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold tracking-wide text-zinc-400 uppercase">
                {section.title}
              </h2>
              <ul className="flex flex-col gap-2">
                {items.map((poll) => (
                  <li key={poll.id}>
                    <Link
                      href={`/talks/${talkId}/polls/${poll.id}`}
                      className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400"
                    >
                      <span className="font-medium text-zinc-900">
                        {poll.question}
                      </span>
                      <span className="shrink-0 text-sm text-zinc-500">
                        {section.status === "active" ? "Manage →" : "View →"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {pollRows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
            No polls yet. Create a poll above when you&apos;re ready.
          </p>
        ) : null}
      </div>
    </main>
  );
}
