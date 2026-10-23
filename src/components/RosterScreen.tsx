"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import { removeTalkGuestAction } from "@/actions/anonymous-access";
import { removeRosterEntryAction } from "@/actions/roster";
import { AddPeopleForm } from "@/components/AddPeopleForm";
import { IconButton } from "@/components/IconButton";
import { LoadingDots } from "@/components/LoadingDots";
import { Popup } from "@/components/Popup";
import { PrivacySettings } from "@/components/PrivacySettings";
import { LockIcon, UserPlusIcon } from "@/components/icons";
import { useLiveResults } from "@/components/useLiveResults";

export type RosterPerson = {
  userId: string;
  email: string | null;
  addedAtLabel: string;
  emailVerifiedAt: string | null;
};

export type GuestListEntry = {
  id: string;
  username: string;
  joinedAtLabel: string;
};

type GuestPayload = { guests: GuestListEntry[] };

type Filter = "all" | "attendee" | "guest";

const FILTERS: ReadonlyArray<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "attendee", label: "Attendees" },
  { value: "guest", label: "Guests" },
];

/**
 * One roster for everyone in the talk: invited attendees and the anonymous
 * guests who joined through the link. Filters narrow the same list, while the
 * add form and privacy controls live behind the header's icon buttons.
 */
export function RosterScreen({
  talkId,
  talkName,
  roster,
  initialGuests,
  isPublic,
  joinOpen,
  joinUrl,
}: {
  talkId: string;
  talkName: string;
  roster: RosterPerson[];
  initialGuests: GuestListEntry[];
  isPublic: boolean;
  joinOpen: boolean;
  joinUrl: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [removedGuestIds, setRemovedGuestIds] = useState<string[]>([]);
  const [confirmingGuestId, setConfirmingGuestId] = useState<string | null>(
    null,
  );
  const [pendingGuestId, setPendingGuestId] = useState<string | null>(null);
  const [pendingAttendeeId, setPendingAttendeeId] = useState<string | null>(
    null,
  );
  const [guestError, setGuestError] = useState<string | null>(null);
  const [attendeeError, setAttendeeError] = useState<string | null>(null);
  const [, startRemoveTransition] = useTransition();
  const addDialog = useRef<HTMLDialogElement>(null);
  const privacyDialog = useRef<HTMLDialogElement>(null);

  const { payload, accessRevoked } = useLiveResults<GuestPayload>({
    initial: { guests: initialGuests },
    url: `/api/talks/${talkId}/guests`,
    isActive: () => true,
    intervalMs: 2_000,
  });

  const guests = (payload?.guests ?? initialGuests).filter(
    (guest) => !removedGuestIds.includes(guest.id),
  );
  const total = roster.length + guests.length;

  const counts = useMemo(
    () => ({
      all: total,
      attendee: roster.length,
      guest: guests.length,
    }),
    [total, roster.length, guests.length],
  );

  const visibleCount =
    filter === "attendee"
      ? roster.length
      : filter === "guest"
        ? guests.length
        : total;

  function removeAttendee(userId: string) {
    setAttendeeError(null);
    setPendingAttendeeId(userId);
    startRemoveTransition(async () => {
      try {
        const result = await removeRosterEntryAction(talkId, userId);
        if (!result.ok) {
          setAttendeeError(result.error ?? "Could not remove the address.");
        }
      } finally {
        setPendingAttendeeId(null);
      }
    });
  }

  async function removeGuest(guestId: string) {
    setGuestError(null);
    setPendingGuestId(guestId);
    try {
      const result = await removeTalkGuestAction(talkId, guestId);
      if (!result.ok) {
        setGuestError(result.error ?? "Could not remove that guest.");
      } else {
        setRemovedGuestIds((ids) => [...ids, guestId]);
        setConfirmingGuestId(null);
      }
    } finally {
      setPendingGuestId(null);
    }
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-ink text-2xl">Attendees & access</h1>
          <p className="text-muted mt-1 text-sm font-semibold">
            {talkName} — invited users always have access; a public talk can
            also admit anonymous guests.
          </p>
          <p className="text-muted mt-2 text-xs font-semibold">
            {isPublic
              ? `Public talk · ${joinOpen ? "joining open" : "joining closed"}`
              : "Private talk · invited users only"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            label="Add attendees"
            onClick={() => addDialog.current?.showModal()}
          >
            <UserPlusIcon className="size-5" />
          </IconButton>
          <IconButton
            label="Privacy settings"
            onClick={() => privacyDialog.current?.showModal()}
          >
            <LockIcon className="size-5" />
          </IconButton>
        </div>
      </div>

      {accessRevoked ? (
        <p role="alert" className="alert alert-err mb-4">
          You no longer have access to this talk.
        </p>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Filter roster"
          className="flex flex-wrap gap-1.5"
        >
          {FILTERS.map((option) => {
            const selected = filter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilter(option.value)}
                className={`chip focus-visible:outline-ink cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  selected
                    ? "bg-ink text-cream"
                    : "text-muted hover:bg-cream2 hover:text-ink bg-white"
                }`}
              >
                {option.label}
                <span className={selected ? "text-cream/70" : "text-inkfaint"}>
                  {counts[option.value]}
                </span>
              </button>
            );
          })}
        </div>
        <p aria-live="polite" className="text-muted text-xs font-semibold">
          Showing {visibleCount} of {total} {total === 1 ? "person" : "people"}
        </p>
      </div>

      {total === 0 ? (
        <p className="empty">
          No one has access yet. Add invited attendees with the add user icon,
          or make the talk public to let guests join.
        </p>
      ) : filter === "attendee" && roster.length === 0 ? (
        <p className="empty">
          No invited attendees yet. Add them with the add user icon.
        </p>
      ) : filter === "guest" && guests.length === 0 ? (
        <p className="empty">
          No guests have joined this talk. Guests appear here while the talk is
          public and joining is open.
        </p>
      ) : (
        <ul className="card divide-ink/10 divide-y-2 divide-dashed overflow-hidden">
          {filter !== "guest"
            ? roster.map((entry) => (
                <li
                  key={entry.userId}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip bg-coral text-ink">Attendee</span>
                      <span className="text-ink truncate font-mono text-sm font-bold">
                        {entry.email ?? "No email address"}
                      </span>
                    </div>
                    <span className="text-muted text-xs font-semibold">
                      added {entry.addedAtLabel}
                      {entry.emailVerifiedAt
                        ? " · email verified"
                        : " · email not verified"}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={pendingAttendeeId === entry.userId}
                    onClick={() => removeAttendee(entry.userId)}
                    className="btn btn-ghost btn-small shrink-0"
                  >
                    {pendingAttendeeId === entry.userId ? (
                      <>
                        Removing… <LoadingDots />
                      </>
                    ) : (
                      "Remove"
                    )}
                  </button>
                </li>
              ))
            : null}

          {filter !== "attendee"
            ? guests.map((guest) => (
                <li key={guest.id} className="flex flex-col gap-3 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="chip bg-cream2 text-ink">Guest</span>
                        <span className="text-ink truncate text-sm font-bold">
                          {guest.username}
                        </span>
                      </div>
                      <span className="text-muted text-xs font-semibold">
                        joined {guest.joinedAtLabel}
                      </span>
                    </div>
                    {confirmingGuestId === guest.id ? null : (
                      <button
                        type="button"
                        aria-label={`Remove ${guest.username}`}
                        onClick={() => {
                          setGuestError(null);
                          setConfirmingGuestId(guest.id);
                        }}
                        className="btn btn-danger btn-small shrink-0"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {confirmingGuestId === guest.id ? (
                    <div
                      role="alertdialog"
                      aria-label={`Remove ${guest.username}`}
                      className="border-red bg-redsoft flex flex-col gap-3 rounded-lg border-[2.5px] p-3"
                    >
                      <p className="text-reddeep text-sm font-bold">
                        Remove{" "}
                        <span className="font-bold">{guest.username}</span> from
                        this talk? Their votes and answers are deleted and their
                        browser stops working for this talk. If anonymous
                        joining is still open, they could return under a
                        different name. This cannot be undone.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={pendingGuestId === guest.id}
                          onClick={() => removeGuest(guest.id)}
                          className="btn btn-red btn-small"
                        >
                          {pendingGuestId === guest.id ? (
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
                          disabled={pendingGuestId === guest.id}
                          onClick={() => {
                            setConfirmingGuestId(null);
                            setGuestError(null);
                          }}
                          className="btn btn-ghost btn-small"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))
            : null}
        </ul>
      )}

      {attendeeError ? (
        <p role="alert" className="text-red mt-3 text-sm font-bold">
          {attendeeError}
        </p>
      ) : null}
      {guestError ? (
        <p role="alert" className="text-red mt-3 text-sm font-bold">
          {guestError}
        </p>
      ) : null}

      <Popup ref={addDialog} title="Add attendees">
        <AddPeopleForm talkId={talkId} />
      </Popup>
      <Popup ref={privacyDialog} title="Privacy & joining">
        <PrivacySettings
          talkId={talkId}
          isPublic={isPublic}
          joinOpen={joinOpen}
          joinUrl={joinUrl}
        />
      </Popup>
    </>
  );
}
