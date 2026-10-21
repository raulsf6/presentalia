import { notFound } from "next/navigation";
import { Suspense } from "react";

import { HideInProjector } from "@/components/HideInProjector";
import { TalkNav } from "@/components/TalkNav";
import { isManager, loadTalkAccess } from "@/lib/membership";

/**
 * Shell for a single talk. Chrome streams behind its own boundary so the
 * page content is not blocked by the access query; each page still checks
 * access before reading or rendering anything.
 */
export default function TalkLayout({
  children,
  params,
}: LayoutProps<"/talks/[talkId]">) {
  return (
    <>
      <Suspense fallback={null}>
        <TalkChrome params={params} />
      </Suspense>
      <div className="pb-24 md:pb-0">{children}</div>
    </>
  );
}

async function TalkChrome({
  params,
}: {
  params: LayoutProps<"/talks/[talkId]">["params"];
}) {
  const { talkId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    notFound();
  }
  if (!isManager(access)) {
    return null;
  }
  return (
    <HideInProjector>
      <TalkNav talkId={talkId} />
    </HideInProjector>
  );
}
