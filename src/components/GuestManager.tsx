"use client";

import { useState } from "react";

import { removeTalkGuestAction } from "@/actions/anonymous-access";
import { LoadingDots } from "@/components/LoadingDots";
import { useLiveResults } from "@/components/useLiveResults";

export type GuestListEntry = {
  id: string;
  username: string;
  joinedAtLabel: string;
};

type GuestPayload = { guests: GuestListEntry[] };

export function GuestManager({
  talkId,
  initialGuests,
}: {
  talkId: string;
  initialGuests: GuestListEntry[];
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { payload, accessRevoked } = useLiveResults<GuestPayload>({
    initial: { guests: initialGuests },
    url: `/api/talks/${talkId}/guests`,
    isActive: () => true,
    intervalMs: 2_000,
  });

  const guests = (payload?.guests ?? initialGuests).filter(
    (guest) => !removedIds.includes(guest.id),
  );

  async function remove(guestId: string) {
    setError(null);
    setPendingId(guestId);
    try {
      const result = await removeTalkGuestAction(talkId, guestId);
      if (!result.ok) {
        setError(result.error ?? "Could not remove that guest.");
      } else {
        setRemovedIds((ids) => [...ids, guestId]);
        setConfirmingId(null);
      }
    } finally {
      setPendingId(null);
    }
  }

  if (accessRevoked) {
    return (
      <p role="alert" className="text-red text-sm font-bold">
        You no longer have access to this talk.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-ink text-sm font-bold">
          Guest attendees{guests.length > 0 ? ` (${guests.length})` : ""}
        </h2>
        <p className="text-muted text-xs font-semibold">
          Anonymous people currently in this talk. This list refreshes while the
          page is open. Removing a guest deletes their votes and answers.
        </p>
      </div>

      {guests.length === 0 ? (
        <p className="empty">No anonymous guests have joined this talk.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {guests.map((guest) => (
            <li
              key={guest.id}
              className="border-ink/10 rounded-lg border-2 p-3"
            >
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
                    from this talk? Their votes and answers are deleted and
                    their browser stops working for this talk. If anonymous
                    joining is still open, they could return under a different
                    name. This cannot be undone.
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
      )}

      {error ? (
        <p role="alert" className="text-red text-sm font-bold">
          {error}
        </p>
      ) : null}
    </div>
  );
}
