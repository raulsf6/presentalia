import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { AppBar, AppBarSkeleton } from "@/components/AppBar";
import { HideInProjector } from "@/components/HideInProjector";
import { getSessionUser } from "@/lib/auth";

/**
 * Shell for every signed-in page. The app bar streams behind its own
 * boundary so the page shell and content are not blocked by the session read.
 * Each page still enforces its own session and role guard.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={<AppBarSkeleton />}>
        <HideInProjector>
          <SignedInAppBar />
        </HideInProjector>
      </Suspense>
      <div className="flex flex-1 flex-col">{children}</div>
    </>
  );
}

async function SignedInAppBar() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return <AppBar user={user} />;
}
