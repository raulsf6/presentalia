import { Suspense, type ReactNode } from "react";

import { AppBar, AppBarSkeleton } from "@/components/AppBar";
import { HideInProjector } from "@/components/HideInProjector";
import { I18nProvider } from "@/components/I18nProvider";
import { getSessionUser } from "@/lib/auth/auth";
import { getLocale } from "@/lib/i18n/server";

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
    return null;
  }
  const locale = await getLocale();
  return (
    <I18nProvider locale={locale}>
      <AppBar user={user} locale={locale} />
    </I18nProvider>
  );
}
