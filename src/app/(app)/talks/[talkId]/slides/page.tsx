import { notFound } from "next/navigation";

import { SlidesManager } from "@/components/SlidesManager";
import { loadTalkAccess } from "@/lib/membership";

export const dynamic = "force-dynamic";

export default async function SlidesPage({
  params,
}: PageProps<"/talks/[talkId]/slides">) {
  const { talkId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }
  if (access.access === "member") {
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
    </main>
  );
}
