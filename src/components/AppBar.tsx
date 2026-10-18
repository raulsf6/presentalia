import Link from "next/link";

import { AppBarNav } from "@/components/AppBarNav";
import type { SessionUser } from "@/lib/auth";

/** Persistent top bar for every signed-in page. */
export function AppBar({ user }: { user: SessionUser }) {
  return (
    <header className="appbar">
      <div className="appbar-inner">
        <Link
          href="/talks"
          aria-label="Presentalia — all talks"
          className="font-display text-ink min-w-0 truncate text-lg font-extrabold"
        >
          Presentalia<span className="text-coral">.</span>
        </Link>
        <AppBarNav email={user.email} role={user.role} />
      </div>
    </header>
  );
}
