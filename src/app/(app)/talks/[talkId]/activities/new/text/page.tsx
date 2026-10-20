import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/PageSkeleton";
import { TextForm } from "@/components/TextForm";
import { loadTalkAccess } from "@/lib/membership";

export default function NewTextActivityPage({
  params,
}: PageProps<"/talks/[talkId]/activities/new/text">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewTextActivityContent params={params} />
    </Suspense>
  );
}

async function NewTextActivityContent({
  params,
}: {
  params: PageProps<"/talks/[talkId]/activities/new/text">["params"];
}) {
  const { talkId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }
  if (access.access === "member") {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-lg px-6 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="font-display text-ink text-2xl">New text prompt</h1>
        <Link
          href={`/talks/${talkId}/activities/new`}
          className="linky shrink-0"
        >
          ← New activity
        </Link>
      </div>
      <div className="card p-6">
        <TextForm talkId={talkId} />
      </div>
    </main>
  );
}
