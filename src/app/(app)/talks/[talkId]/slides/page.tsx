import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/PageSkeleton";
import { SlidesManager } from "@/components/SlidesManager";
import { isManager, loadTalkAccess } from "@/lib/membership";

export default function SlidesPage({
  params,
}: PageProps<"/talks/[talkId]/slides">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SlidesContent params={params} />
    </Suspense>
  );
}

async function SlidesContent({
  params,
}: {
  params: PageProps<"/talks/[talkId]/slides">["params"];
}) {
  const { talkId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }
  if (!isManager(access)) {
    notFound();
  }

  const uploadedLabel = access.talk.slidesUpdatedAt
    ? access.talk.slidesUpdatedAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-8">
        <h1 className="font-display text-ink text-2xl">Slides</h1>
        <p className="text-muted mt-1 text-sm font-semibold">
          {access.talk.name} — one PDF per talk, kept private to its rostered
          attendees.
        </p>
      </div>
      <div className="card p-6">
        <SlidesManager talkId={talkId} uploadedLabel={uploadedLabel} />
      </div>
      <div className="card mt-6 p-6">
        <p className="section-label">Present</p>
        {uploadedLabel ? (
          <>
            <p className="text-ink/75 mt-3 text-sm font-semibold">
              Open <strong>Present</strong> on the laptop connected to the big
              screen, then use <strong>Remote</strong> on your phone.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href={`/talks/${talkId}/present`}
                target="_blank"
                rel="noreferrer"
                className="btn"
              >
                Present
              </a>
              <a href={`/talks/${talkId}/remote`} className="btn btn-ghost">
                Remote
              </a>
            </div>
          </>
        ) : (
          <p className="text-muted mt-3 text-sm font-semibold">
            Upload the deck to project it and control it from your phone.
          </p>
        )}
      </div>
    </main>
  );
}
