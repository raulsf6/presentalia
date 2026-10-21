import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/PageSkeleton";
import { QuizForm } from "@/components/QuizForm";
import { isManager, loadTalkAccess } from "@/lib/membership";

export default function NewQuizPage({
  params,
}: PageProps<"/talks/[talkId]/activities/new/quiz">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewQuizContent params={params} />
    </Suspense>
  );
}

async function NewQuizContent({
  params,
}: {
  params: PageProps<"/talks/[talkId]/activities/new/quiz">["params"];
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
    <main className="mx-auto w-full max-w-lg px-6 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="font-display text-ink text-2xl">New quiz</h1>
        <Link
          href={`/talks/${talkId}/activities/new`}
          className="linky shrink-0"
        >
          ← New activity
        </Link>
      </div>
      <div className="card p-6">
        <QuizForm talkId={talkId} />
      </div>
    </main>
  );
}
