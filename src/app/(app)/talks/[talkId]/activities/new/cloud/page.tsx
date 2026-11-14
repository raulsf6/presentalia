import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CloudForm } from "@/components/CloudForm";
import { PageSkeleton } from "@/components/PageSkeleton";
import { isManager, loadTalkAccess } from "@/lib/talks/membership";

export default function NewCloudActivityPage({
  params,
}: PageProps<"/talks/[talkId]/activities/new/cloud">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewCloudActivityContent params={params} />
    </Suspense>
  );
}

async function NewCloudActivityContent({
  params,
}: {
  params: PageProps<"/talks/[talkId]/activities/new/cloud">["params"];
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
        <h1 className="font-display text-ink text-2xl">New idea cloud</h1>
        <Link
          href={`/talks/${talkId}/activities/new`}
          className="linky shrink-0"
        >
          ← New activity
        </Link>
      </div>
      <div className="card p-6">
        <CloudForm talkId={talkId} />
      </div>
    </main>
  );
}
