import Link from "next/link";

import { AppBarNav } from "@/components/AppBarNav";
import type { SessionUser } from "@/lib/auth/auth";

/** Persistent top bar for every signed-in page. */
export function AppBar({ user }: { user: SessionUser }) {
  return (
    <header className="appbar">
      <div className="appbar-inner">
        <Link
          href="/talks"
          aria-label="Presentalia — all talks"
          className="font-display text-ink min-w-0 truncate text-lg"
        >
          Presentalia<span className="text-coral">.</span>
        </Link>
        <AppBarNav email={user.email} role={user.role} />
      </div>
    </header>
  );
}

/** Static shell while the session and role load. */
export function AppBarSkeleton() {
  return (
    <header className="appbar" aria-hidden="true">
      <div className="appbar-inner">
        <span className="font-display text-ink min-w-0 truncate text-lg">
          Presentalia<span className="text-coral">.</span>
        </span>
        <span className="ml-auto flex items-center gap-1">
          <span className="bg-ink/10 h-8 w-16 animate-pulse rounded-md" />
          <span className="bg-ink/10 size-10 animate-pulse rounded-lg" />
        </span>
      </div>
    </header>
  );
}
