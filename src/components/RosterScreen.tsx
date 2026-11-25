"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import { removeTalkGuestAction } from "@/actions/anonymous-access";
import { removeRosterEntryAction } from "@/actions/roster";
import { AddPeopleForm } from "@/components/AddPeopleForm";
import { IconButton } from "@/components/IconButton";
import { useI18n } from "@/components/I18nProvider";
import { LoadingDots } from "@/components/LoadingDots";
import { Popup } from "@/components/Popup";
import { PrivacySettings } from "@/components/PrivacySettings";
import { LockIcon, UserPlusIcon } from "@/components/icons";
import { useLiveResults } from "@/components/useLiveResults";
import type { MessageKey } from "@/lib/i18n/dictionaries/en";
import { toErrorState, type ErrorState } from "@/lib/i18n/errors";
import { formatDate } from "@/lib/i18n/translate";

export type RosterPerson = {
  userId: string;
  email: string | null;
  addedAt: string;
  emailVerifiedAt: string | null;
};

export type GuestListEntry = {
  id: string;
  username: string;
  joinedAt: string;
};

type GuestPayload = { guests: GuestListEntry[] };

type Filter = "all" | "attendee" | "guest";

const FILTERS: ReadonlyArray<{ value: Filter; label: MessageKey }> = [
  { value: "all", label: "roster.filter.all" },
  { value: "attendee", label: "roster.filter.attendee" },
  { value: "guest", label: "roster.filter.guest" },
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
  const { t, locale } = useI18n();
  const [filter, setFilter] = useState<Filter>("all");
  const [removedGuestIds, setRemovedGuestIds] = useState<string[]>([]);
  const [confirmingGuestId, setConfirmingGuestId] = useState<string | null>(
    null,
  );
  const [pendingGuestId, setPendingGuestId] = useState<string | null>(null);
  const [pendingAttendeeId, setPendingAttendeeId] = useState<string | null>(
    null,
  );
  const [guestError, setGuestError] = useState<ErrorState | null>(null);
  const [attendeeError, setAttendeeError] = useState<ErrorState | null>(null);
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
          setAttendeeError(toErrorState(result, "errors.roster.removeFailed"));
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
        setGuestError(toErrorState(result, "errors.roster.removeGuestFailed"));
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
          <h1 className="font-display text-ink text-2xl">
            {t("roster.title")}
          </h1>
          <p className="text-muted mt-1 text-sm font-semibold">
            {t("roster.subtitle", { name: talkName })}
          </p>
          <p className="text-muted mt-2 text-xs font-semibold">
            {isPublic
              ? joinOpen
                ? t("roster.publicOpen")
                : t("roster.publicClosed")
              : t("roster.private")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            label={t("roster.addAttendees")}
            onClick={() => addDialog.current?.showModal()}
          >
            <UserPlusIcon className="size-5" />
          </IconButton>
          <IconButton
            label={t("roster.privacySettings")}
            onClick={() => privacyDialog.current?.showModal()}
          >
            <LockIcon className="size-5" />
          </IconButton>
        </div>
      </div>

      {accessRevoked ? (
        <p role="alert" className="alert alert-err mb-4">
          {t("roster.noAccess")}
        </p>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label={t("roster.filter")}
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
                {t(option.label)}
                <span className={selected ? "text-cream/70" : "text-inkfaint"}>
                  {counts[option.value]}
                </span>
              </button>
            );
          })}
        </div>
        <p aria-live="polite" className="text-muted text-xs font-semibold">
          {t(total === 1 ? "roster.showing.one" : "roster.showing.other", {
            visible: visibleCount,
            total,
          })}
        </p>
      </div>

      {total === 0 ? (
        <p className="empty">{t("roster.empty.all")}</p>
      ) : filter === "attendee" && roster.length === 0 ? (
        <p className="empty">{t("roster.empty.attendee")}</p>
      ) : filter === "guest" && guests.length === 0 ? (
        <p className="empty">{t("roster.empty.guest")}</p>
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
                      <span className="chip bg-coral text-ink">
                        {t("roster.chip.attendee")}
                      </span>
                      <span className="text-ink truncate font-mono text-sm font-bold">
                        {entry.email ?? t("common.noEmail")}
                      </span>
                    </div>
                    <span className="text-muted text-xs font-semibold">
                      {t("roster.added", {
                        date: formatDate(locale, new Date(entry.addedAt), {
                          month: "short",
                          day: "numeric",
                          timeZone: "UTC",
                        }),
                      })}
                      {entry.emailVerifiedAt
                        ? t("roster.emailVerified")
                        : t("roster.emailNotVerified")}
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
                        {t("roster.removing")} <LoadingDots />
                      </>
                    ) : (
                      t("common.remove")
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
                        <span className="chip bg-cream2 text-ink">
                          {t("roster.chip.guest")}
                        </span>
                        <span className="text-ink truncate text-sm font-bold">
                          {guest.username}
                        </span>
                      </div>
                      <span className="text-muted text-xs font-semibold">
                        {t("roster.joined", {
                          date: formatDate(locale, new Date(guest.joinedAt), {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            timeZone: "UTC",
                          }),
                        })}
                      </span>
                    </div>
                    {confirmingGuestId === guest.id ? null : (
                      <button
                        type="button"
                        aria-label={t("roster.removeGuestAria", {
                          name: guest.username,
                        })}
                        onClick={() => {
                          setGuestError(null);
                          setConfirmingGuestId(guest.id);
                        }}
                        className="btn btn-danger btn-small shrink-0"
                      >
                        {t("common.remove")}
                      </button>
                    )}
                  </div>

                  {confirmingGuestId === guest.id ? (
                    <div
                      role="alertdialog"
                      aria-label={t("roster.removeGuestAria", {
                        name: guest.username,
                      })}
                      className="border-red bg-redsoft flex flex-col gap-3 rounded-lg border-[2.5px] p-3"
                    >
                      <p className="text-reddeep text-sm font-bold">
                        {t("roster.removeGuestConfirm", {
                          name: guest.username,
                        })}
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
                              {t("roster.removing")} <LoadingDots />
                            </>
                          ) : (
                            t("roster.yesRemoveGuest")
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
                          {t("common.cancel")}
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
          {t(attendeeError.key, attendeeError.params)}
        </p>
      ) : null}
      {guestError ? (
        <p role="alert" className="text-red mt-3 text-sm font-bold">
          {t(guestError.key, guestError.params)}
        </p>
      ) : null}

      <Popup ref={addDialog} title={t("roster.addDialog")}>
        <AddPeopleForm talkId={talkId} />
      </Popup>
      <Popup ref={privacyDialog} title={t("roster.privacyDialog")}>
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
