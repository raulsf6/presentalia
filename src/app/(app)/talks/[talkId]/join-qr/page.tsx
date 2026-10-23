import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AnonymousJoinToggle } from "@/components/AnonymousJoinToggle";
import { HideInProjector } from "@/components/HideInProjector";
import { LiveActivityRefresh } from "@/components/LiveActivityRefresh";
import { PageSkeleton } from "@/components/PageSkeleton";
import { isManager, loadTalkAccess } from "@/lib/talks/membership";
import { renderQrSvg } from "@/lib/talks/qr";
import { getSiteUrl } from "@/lib/platform/site-url";
import { countTalkGuests } from "@/lib/talks/talk-guests-db";

export default function JoinQrPage({
  params,
  searchParams,
}: PageProps<"/talks/[talkId]/join-qr">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <JoinQrContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function JoinQrContent({
  params,
  searchParams,
}: {
  params: PageProps<"/talks/[talkId]/join-qr">["params"];
  searchParams: PageProps<"/talks/[talkId]/join-qr">["searchParams"];
}) {
  const { talkId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access || !isManager(access) || !access.talk.isPublic) {
    notFound();
  }

  const query = await searchParams;
  const display = Array.isArray(query.display)
    ? query.display[0]
    : query.display;
  const projector = display === "projector";
  const toggleHref = projector
    ? `/talks/${talkId}/join-qr`
    : `/talks/${talkId}/join-qr?display=projector`;

  const joinUrl = `${await getSiteUrl()}/join/${talkId}`;
  const qrSvg = access.talk.anonymousJoinOpen
    ? await renderQrSvg(joinUrl)
    : null;

  const guestCount = await countTalkGuests(talkId);

  return (
    <main
      className={`mx-auto flex w-full flex-col items-center px-6 py-10 ${
        projector ? "max-w-7xl" : "max-w-3xl"
      }`}
    >
      <LiveActivityRefresh />
      <div className="mb-8 flex w-full items-center justify-between gap-4">
        <HideInProjector>
          <Link href={`/talks/${talkId}`} className="linky">
            ← {access.talk.name}
          </Link>
        </HideInProjector>
        <Link href={toggleHref} className="btn btn-ghost btn-small ml-auto">
          {projector ? "Presenter view" : "Projector view"}
        </Link>
      </div>

      <h1
        className={`font-display text-ink text-center ${
          projector ? "text-4xl md:text-5xl" : "text-2xl"
        }`}
      >
        {access.talk.name}
      </h1>

      {qrSvg ? (
        <>
          <p
            className={`text-muted mt-3 text-center font-semibold ${
              projector ? "text-xl" : "text-sm"
            }`}
          >
            Scan to join the talk
          </p>
          <div
            className={`bg-cream mt-6 w-full rounded-2xl p-4 [&>svg]:h-auto [&>svg]:w-full ${
              projector ? "max-w-2xl" : "max-w-md"
            }`}
            // The SVG is generated locally from the join URL.
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <code
            className={`text-ink/75 mt-4 max-w-full overflow-x-auto text-center font-semibold ${
              projector ? "text-lg" : "text-xs"
            }`}
          >
            {joinUrl}
          </code>
        </>
      ) : (
        <div className="card mt-8 flex w-full max-w-xl flex-col items-center gap-2 p-8 text-center">
          <p className="text-ink text-xl font-bold">Joining is closed</p>
          <p className="text-ink/75 text-sm font-semibold">
            New anonymous attendees are not being admitted right now.
          </p>
        </div>
      )}

      {!projector ? (
        <div className="mt-8 flex flex-col items-center gap-4">
          <AnonymousJoinToggle
            talkId={talkId}
            joinOpen={access.talk.anonymousJoinOpen}
          />
          <p className="text-muted text-xs font-semibold">
            {guestCount === 1
              ? "1 guest has joined."
              : `${guestCount} guests have joined.`}
          </p>
        </div>
      ) : null}
    </main>
  );
}
