import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppBar } from "@/components/AppBar";
import { HideInProjector } from "@/components/HideInProjector";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Shell for every signed-in page: session guard plus the persistent app bar. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <HideInProjector>
        <AppBar user={user} />
      </HideInProjector>
      <div className="flex flex-1 flex-col">{children}</div>
    </>
  );
}
