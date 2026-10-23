"use client";

import type { ReactNode, RefObject } from "react";

/**
 * Native modal dialog with the app's hard-shadow frame. Clicking the backdrop
 * or the close button dismisses it; Escape works through the browser.
 */
export function Popup({
  ref,
  title,
  children,
}: {
  ref: RefObject<HTMLDialogElement | null>;
  title: string;
  children: ReactNode;
}) {
  return (
    <dialog
      ref={ref}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          ref.current?.close();
        }
      }}
      className="border-ink text-ink shadow-hard-lg backdrop:bg-ink/50 m-auto max-h-[85vh] w-[min(38rem,calc(100vw-2rem))] overflow-y-auto rounded-[12px] border-[3px] bg-white p-0"
    >
      <div className="border-ink/15 sticky top-0 flex items-center justify-between gap-4 border-b-[2.5px] bg-white px-5 py-3">
        <h2 className="font-display text-lg">{title}</h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Close"
          className="border-ink/25 hover:border-ink rounded-md border px-2 py-0.5 text-sm font-bold"
        >
          ×
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
