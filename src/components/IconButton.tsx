"use client";

import type { ReactNode } from "react";

/**
 * Square icon-only button used for page actions that open a popup. The label
 * is exposed to assistive tech and as a hover title.
 */
export function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="border-ink text-ink shadow-hard-md hover:shadow-hard-lg inline-flex size-10 items-center justify-center rounded-lg border-[3px] bg-white transition duration-150 ease-out active:scale-[0.985] active:shadow-[1px_1px_0_var(--color-ink)]"
    >
      {children}
    </button>
  );
}
