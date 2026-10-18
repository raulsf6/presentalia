import Link from "next/link";
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
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Slides</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {access.talk.name} — one PDF per talk, kept private to its rostered
            attendees.
          </p>
        </div>
        <Link
          href={`/talks/${talkId}`}
          className="shrink-0 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
        >
          ← Talk home
        </Link>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <SlidesManager talkId={talkId} uploadedLabel={uploadedLabel} />
      </div>
    </main>
  );
}
