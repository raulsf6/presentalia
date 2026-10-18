"use client";

import { useState, useTransition } from "react";

import { deleteTalkAction } from "@/actions/talks";
import { LoadingDots } from "@/components/LoadingDots";

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
        className="btn btn-danger"
      >
        Delete talk…
      </button>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-label="Delete talk"
      className="border-red bg-redsoft flex flex-col gap-3 rounded-xl border-2 p-4"
    >
      <p className="text-reddeep text-sm font-bold">
        Delete <span className="font-extrabold">{talkName}</span>? This removes
        its attendee roster, polls and votes, and the uploaded slides, and
        revokes all attendee access. This cannot be undone.
      </p>
      <div className="flex flex-wrap gap-2">
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
          className="btn btn-red btn-small"
        >
          {pending ? (
            <>
              Deleting… <LoadingDots />
            </>
          ) : (
            "Yes, delete this talk"
          )}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          className="btn btn-ghost btn-small"
        >
          Cancel
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-red text-sm font-bold">
          {error}
        </p>
      ) : null}
    </div>
  );
}
