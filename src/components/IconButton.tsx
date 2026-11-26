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
      className="icon-btn"
    >
      {children}
    </button>
  );
}
