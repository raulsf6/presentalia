import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { JoinTalkForm } from "@/components/JoinTalkForm";
import { PageSkeleton } from "@/components/PageSkeleton";
import { getDb } from "@/db";
import { talks } from "@/db/schema";
import { loadTalkAccess } from "@/lib/talks/membership";
import { isTalkId } from "@/lib/talks/talk-guests";

function formatDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function JoinPage({ params }: PageProps<"/join/[talkId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <JoinContent params={params} />
    </Suspense>
  );
}

async function JoinContent({
  params,
}: {
  params: PageProps<"/join/[talkId]">["params"];
}) {
  const { talkId } = await params;
  if (!isTalkId(talkId)) {
    notFound();
  }

  // Existing guests, staff, and rostered members go straight to the talk.
  const access = await loadTalkAccess(talkId);
  if (access) {
    redirect(`/talks/${talkId}`);
  }

  const [talk] = await getDb()
    .select()
    .from(talks)
    .where(eq(talks.id, talkId))
    .limit(1);
  if (!talk || !talk.isPublic) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-6 py-12">
      <div>
        <span className="font-display text-ink text-lg">
          Presentalia<span className="text-coral">.</span>
        </span>
        <h1 className="font-display text-ink mt-4 text-2xl">{talk.name}</h1>
        {talk.heldAt ? (
          <p className="text-muted mt-1 text-sm font-semibold">
            {formatDate(talk.heldAt)}
          </p>
        ) : null}
        {talk.description ? (
          <p className="text-ink/75 mt-3 text-sm font-semibold">
            {talk.description}
          </p>
        ) : null}
      </div>

      <section className="card p-6">
        {talk.anonymousJoinOpen ? (
          <JoinTalkForm talkId={talkId} />
        ) : (
          <div className="flex flex-col gap-2">
            <h2 className="text-ink font-bold">Joining is closed</h2>
            <p className="text-ink/75 text-sm font-semibold">
              The presenter is not admitting new anonymous attendees to this
              talk right now.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
