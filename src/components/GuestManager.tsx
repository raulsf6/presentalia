"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { removeTalkGuestAction } from "@/actions/anonymous-access";
import { LoadingDots } from "@/components/LoadingDots";

export type GuestListEntry = {
  id: string;
  username: string;
  joinedAtLabel: string;
};

export function GuestManager({
  talkId,
  guests,
}: {
  talkId: string;
  guests: GuestListEntry[];
}) {
  const router = useRouter();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(guestId: string) {
    setError(null);
    setPendingId(guestId);
    try {
      const result = await removeTalkGuestAction(talkId, guestId);
      if (!result.ok) {
        setError(result.error ?? "Could not remove that guest.");
      } else {
        setConfirmingId(null);
        router.refresh();
      }
    } finally {
      setPendingId(null);
    }
  }

  if (guests.length === 0) {
    return <p className="empty">No anonymous guests have joined this talk.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {guests.map((guest) => (
          <li key={guest.id} className="border-ink/10 rounded-lg border-2 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <span className="text-ink truncate text-sm font-bold">
                  {guest.username}
                </span>
                <span className="text-muted text-xs font-semibold">
                  Guest · joined {guest.joinedAtLabel}
                </span>
              </div>
              {confirmingId === guest.id ? null : (
                <button
                  type="button"
                  aria-label={`Remove ${guest.username}`}
                  onClick={() => {
                    setError(null);
                    setConfirmingId(guest.id);
                  }}
                  className="btn btn-danger btn-small"
                >
                  Remove
                </button>
              )}
            </div>

            {confirmingId === guest.id ? (
              <div
                role="alertdialog"
                aria-label={`Remove ${guest.username}`}
                className="border-red bg-redsoft mt-3 flex flex-col gap-3 rounded-lg border-[2.5px] p-3"
              >
                <p className="text-reddeep text-sm font-bold">
                  Remove <span className="font-bold">{guest.username}</span>{" "}
                  from this talk? Their votes and answers are deleted and their
                  browser stops working for this talk. If anonymous joining is
                  still open, they could return under a different name. This
                  cannot be undone.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pendingId === guest.id}
                    onClick={() => remove(guest.id)}
                    className="btn btn-red btn-small"
                  >
                    {pendingId === guest.id ? (
                      <>
                        Removing… <LoadingDots />
                      </>
                    ) : (
                      "Yes, remove guest"
                    )}
                  </button>
                  <button
                    type="button"
                    autoFocus
                    disabled={pendingId === guest.id}
                    onClick={() => {
                      setConfirmingId(null);
                      setError(null);
                    }}
                    className="btn btn-ghost btn-small"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="text-red text-sm font-bold">
          {error}
        </p>
      ) : null}
    </div>
  );
}
