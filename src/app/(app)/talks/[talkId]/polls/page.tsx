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
      <div className="mb-8">
        <h1 className="font-display text-ink text-2xl font-extrabold">
          Activities
        </h1>
        <p className="text-muted mt-1 text-sm font-semibold">
          {access.talk.name}
        </p>
      </div>

      <section className="card mb-10 p-6">
        <h2 className="font-display text-ink mb-5 text-lg font-bold">
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
              <h2 className="section-label">{section.title}</h2>
              <ul className="flex flex-col gap-2">
                {items.map((poll) => (
                  <li key={poll.id}>
                    <Link
                      href={`/talks/${talkId}/polls/${poll.id}`}
                      className="card card-hover flex items-center justify-between gap-4 p-4"
                    >
                      <span className="text-ink font-bold">
                        {poll.question}
                      </span>
                      <span className="text-muted shrink-0 text-sm font-bold">
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
          <p className="empty">
            No activities yet. Create a poll above when you&apos;re ready.
          </p>
        ) : null}
      </div>
    </main>
  );
}
