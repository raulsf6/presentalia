"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useT } from "@/components/I18nProvider";
import { UserMenu } from "@/components/UserMenu";
import { PresentationIcon, UserCogIcon } from "@/components/icons";
import type { AppRole } from "@/lib/auth/roles";

/** Primary destinations and the account menu, with section highlighting. */
export function AppBarNav({
  email,
  role,
  switcher,
}: {
  email: string | null;
  role: AppRole;
  switcher: ReactNode;
}) {
  const t = useT();
  const pathname = usePathname();
  const talksActive = pathname === "/talks" || pathname.startsWith("/talks/");
  const usersActive =
    pathname === "/admin/users" || pathname.startsWith("/admin/users/");

  return (
    <nav
      aria-label={t("nav.main")}
      className="ml-auto flex min-w-0 items-center gap-1"
    >
      <Link
        href="/talks"
        aria-label={t("nav.talks")}
        className="appbar-link"
        aria-current={talksActive ? "page" : undefined}
      >
        <PresentationIcon className="size-4" />
        <span className="hidden sm:inline">{t("nav.talks")}</span>
      </Link>
      {role === "admin" ? (
        <Link
          href="/admin/users"
          aria-label={t("nav.users")}
          className="appbar-link"
          aria-current={usersActive ? "page" : undefined}
        >
          <UserCogIcon className="size-4" />
          <span className="hidden sm:inline">{t("nav.users")}</span>
        </Link>
      ) : null}
      {switcher}
      <UserMenu email={email} role={role} />
    </nav>
  );
}
