"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { signOutAction } from "@/actions/auth";
import { useT } from "@/components/I18nProvider";
import { LogOutIcon } from "@/components/icons";
import type { AppRole } from "@/lib/auth/roles";

const ROLE_KEYS = {
  admin: "roles.admin",
  presenter: "roles.presenter",
  attendee: "roles.attendee",
} as const;

/**
 * Account menu in the app bar: who is signed in, the global destinations,
 * and sign-out — reachable from every page (two taps from anywhere).
 */
export function UserMenu({
  email,
  role,
}: {
  email: string | null;
  role: AppRole;
}) {
  const t = useT();
  const pathname = usePathname();
  // The menu is open only while the route stays where it was opened, so
  // navigating closes it without a state-setting effect.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn !== null && openedOn === pathname;
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onMouseDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpenedOn(null);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenedOn(null);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const initial = email ? email.slice(0, 1).toUpperCase() : "?";

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={t("nav.accountMenu")}
        onClick={() => setOpenedOn(open ? null : pathname)}
        className="avatar-btn"
      >
        {initial}
      </button>
      {open ? (
        <div id={panelId} className="menu-panel">
          <div className="menu-header">
            <span className="text-ink truncate font-mono text-xs font-bold">
              {email ?? t("common.noEmail")}
            </span>
            <span className="text-muted text-[0.65rem] font-bold tracking-[0.05em] uppercase">
              {t(ROLE_KEYS[role])}
            </span>
          </div>
          <div className="menu-divider" />
          <form action={signOutAction}>
            <button type="submit" className="menu-item">
              <LogOutIcon className="size-5 shrink-0" />
              {t("nav.signOut")}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
