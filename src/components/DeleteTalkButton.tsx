"use client";

import { useState, useTransition } from "react";

import { deleteTalkAction } from "@/actions/talks";

export function DeleteTalkButton({
  talkId,
  talkName,
}: {
  talkId: string;
  talkName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
      >
        Delete talk…
      </button>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-label="Delete talk"
      className="flex flex-col gap-3 rounded-md border border-red-300 bg-red-50 p-4"
    >
      <p className="text-sm text-red-800">
        Delete <span className="font-semibold">{talkName}</span>? This removes
        its attendee roster, polls and votes, and the uploaded slides, and
        revokes all attendee access. This cannot be undone.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteTalkAction(talkId);
              if (!result.ok) {
                setError(result.error ?? "Could not delete the talk.");
              }
            })
          }
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Yes, delete this talk"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
