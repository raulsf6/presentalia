import Link from "next/link";
import { notFound } from "next/navigation";

import { ChartIcon } from "@/components/icons";
import { loadTalkAccess } from "@/lib/membership";

export const dynamic = "force-dynamic";

export default async function NewActivityPage({
  params,
}: PageProps<"/talks/[talkId]/activities/new">) {
  const { talkId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }
  if (access.access === "member") {
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
      </section>
    </main>
  );
}
