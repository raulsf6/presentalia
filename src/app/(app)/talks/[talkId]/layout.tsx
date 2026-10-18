import { notFound } from "next/navigation";

import { HideInProjector } from "@/components/HideInProjector";
import { TalkNav } from "@/components/TalkNav";
import { loadTalkAccess } from "@/lib/membership";

export const dynamic = "force-dynamic";

/**
 * Shell for a single talk. Presenters and admins get the talk nav (tabs on
 * desktop, bottom bar on mobile); attendees keep the page exactly as it was.
 */
export default async function TalkLayout({
  children,
  params,
}: LayoutProps<"/talks/[talkId]">) {
  const { talkId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }

  return (
    <>
      {access.access !== "member" ? (
        <HideInProjector>
          <TalkNav talkId={talkId} />
        </HideInProjector>
      ) : null}
      <div className={access.access !== "member" ? "pb-24 md:pb-0" : ""}>
        {children}
      </div>
    </>
  );
}
