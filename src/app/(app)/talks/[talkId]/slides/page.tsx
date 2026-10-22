import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DeckPlanEditor } from "@/components/DeckPlanEditor";
import { PageSkeleton } from "@/components/PageSkeleton";
import { SlidesActions } from "@/components/SlidesActions";
import { loadDeckPlan } from "@/lib/deck-plan";
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

  const plan = access.talk.slidesUpdatedAt ? await loadDeckPlan(talkId) : null;

  const uploadedLabel = access.talk.slidesUpdatedAt
    ? access.talk.slidesUpdatedAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="mx-auto mb-8 flex max-w-2xl flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-ink text-2xl">Slides</h1>
          <p className="text-muted mt-1 text-sm font-semibold">
            {access.talk.name} — one PDF per talk, kept private to its rostered
            attendees.
          </p>
          <p className="text-muted mt-2 text-xs font-semibold">
            {uploadedLabel
              ? `Current PDF uploaded ${uploadedLabel}.`
              : "No PDF uploaded yet."}
          </p>
        </div>
        <SlidesActions talkId={talkId} uploadedLabel={uploadedLabel} />
      </div>

      {plan && access.talk.slidesUpdatedAt ? (
        <div className="card p-6">
          <div className="mb-5">
            <p className="section-label">Deck plan</p>
            <p className="text-muted mt-2 text-sm font-semibold">
              Drop an activity between two pages. The deck stops on it when you
              present, and you launch it from there.
            </p>
          </div>
          <DeckPlanEditor
            key={access.talk.slidesUpdatedAt.toISOString()}
            talkId={talkId}
            slidesUpdatedAt={access.talk.slidesUpdatedAt.toISOString()}
            initial={plan}
          />
        </div>
      ) : (
        <div className="card mx-auto max-w-2xl p-6">
          <p className="text-muted text-sm font-semibold">
            Upload the deck with the upload icon above, then plan the activities
            that sit between its slides.
          </p>
        </div>
      )}
    </main>
  );
}
