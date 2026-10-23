"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { UserMenu } from "@/components/UserMenu";
import { PresentationIcon, UserCogIcon } from "@/components/icons";
import type { AppRole } from "@/lib/auth/roles";

/** Primary destinations and the account menu, with section highlighting. */
export function AppBarNav({
  email,
  role,
}: {
  email: string | null;
  role: AppRole;
}) {
  const pathname = usePathname();
  const talksActive = pathname === "/talks" || pathname.startsWith("/talks/");
  const usersActive =
    pathname === "/admin/users" || pathname.startsWith("/admin/users/");

  return (
    <nav aria-label="Main" className="ml-auto flex min-w-0 items-center gap-1">
      <Link
        href="/talks"
        className="appbar-link"
        aria-current={talksActive ? "page" : undefined}
      >
        <PresentationIcon className="size-4" />
        Talks
      </Link>
      {role === "admin" ? (
        <Link
          href="/admin/users"
          className="appbar-link"
          aria-current={usersActive ? "page" : undefined}
        >
          <UserCogIcon className="size-4" />
          Users
        </Link>
      ) : null}
      <UserMenu email={email} role={role} />
    </nav>
  );
}
