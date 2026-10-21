import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/PageSkeleton";
import { ChartIcon, QuizIcon, TextIcon } from "@/components/icons";
import { isManager, loadTalkAccess } from "@/lib/membership";

export default function NewActivityPage({
  params,
}: PageProps<"/talks/[talkId]/activities/new">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewActivityContent params={params} />
    </Suspense>
  );
}

async function NewActivityContent({
  params,
}: {
  params: PageProps<"/talks/[talkId]/activities/new">["params"];
}) {
  const { talkId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }
  if (!isManager(access)) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-8">
        <h1 className="font-display text-ink text-2xl">New activity</h1>
        <p className="text-muted mt-1 text-sm font-semibold">
          {access.talk.name} — choose what to create.
        </p>
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="section-label">Activity types</h2>
        <Link
          href={`/talks/${talkId}/activities/new/poll`}
          className="card card-hover flex items-center gap-4 p-4"
        >
          <span className="border-ink bg-coral shadow-hard-sm flex size-11 shrink-0 items-center justify-center rounded-lg border-[2.5px]">
            <ChartIcon className="size-5" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-ink font-bold">Poll</span>
            <span className="text-muted text-xs font-semibold">
              Ask a multiple-choice question and show the results live.
            </span>
          </span>
          <span className="text-muted ml-auto shrink-0 text-sm font-bold">
            Create →
          </span>
        </Link>
        <Link
          href={`/talks/${talkId}/activities/new/quiz`}
          className="card card-hover flex items-center gap-4 p-4"
        >
          <span className="border-ink bg-green shadow-hard-sm flex size-11 shrink-0 items-center justify-center rounded-lg border-[2.5px] text-white">
            <QuizIcon className="size-5" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-ink font-bold">Quiz</span>
            <span className="text-muted text-xs font-semibold">
              Ask a question with one correct answer and reveal it at the end.
            </span>
          </span>
          <span className="text-muted ml-auto shrink-0 text-sm font-bold">
            Create →
          </span>
        </Link>
        <Link
          href={`/talks/${talkId}/activities/new/text`}
          className="card card-hover flex items-center gap-4 p-4"
        >
          <span className="border-ink bg-amber shadow-hard-sm flex size-11 shrink-0 items-center justify-center rounded-lg border-[2.5px]">
            <TextIcon className="size-5" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-ink font-bold">Text prompt</span>
            <span className="text-muted text-xs font-semibold">
              Collect short written answers and rank them against your criterion
              with AI.
            </span>
          </span>
          <span className="text-muted ml-auto shrink-0 text-sm font-bold">
            Create →
          </span>
        </Link>
      </section>
    </main>
  );
}
