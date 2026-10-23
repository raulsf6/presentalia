"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  closeActivityAction,
  launchActivityAction,
} from "@/actions/activities";
import { rankTextActivityAction } from "@/actions/text";
import { ActivityTypeBadge } from "@/components/ActivityTypeBadge";
import { LoadingDots } from "@/components/LoadingDots";
import type {
  SlideDirection,
  SlideLiveActivity,
  SlideState,
} from "@/lib/deck/slide-state";
import { requestSlideMove } from "./slide-api";
import { useSlideState } from "./use-slide-state";
import { useWakeLock } from "./use-wake-lock";

const POLL_MS = 1_000;

function typeLabel(type: "poll" | "quiz" | "text"): string {
  if (type === "quiz") return "Quiz";
  if (type === "text") return "Text prompt";
  return "Poll";
}

function closeLabel(type: "poll" | "quiz" | "text"): string {
  if (type === "quiz") return "Close quiz";
  if (type === "text") return "Rank & close";
  return "Close voting";
}

/**
 * The phone clicker. Two halves, one job each, and a strip for the activity the
 * deck is sitting on. It polls slowly so it knows which step the room is on and
 * what can be launched or closed from here.
 */
export function RemoteDeck({
  talkId,
  talkName,
  slidesUpdatedAt,
  initial,
}: {
  talkId: string;
  talkName: string;
  slidesUpdatedAt: string | null;
  initial: SlideState;
}) {
  const hasSlides = slidesUpdatedAt !== null;
  const { state, status, terminal, applyPosition, refresh } = useSlideState({
    talkId,
    initial,
    intervalMs: POLL_MS,
    enabled: hasSlides,
  });
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  useWakeLock(hasSlides);

  const onActivity = state.activity !== null;
  const atStart = !onActivity && state.slide <= 1;
  const atEnd =
    !onActivity && state.count !== null && state.slide >= state.count;

  const position = state.activity
    ? `Activity after ${state.slide}`
    : state.count === null
      ? `${state.slide}`
      : `${state.slide} / ${state.count}`;

  function go(direction: SlideDirection) {
    if (!hasSlides || terminal !== null) {
      return;
    }
    if (direction === "next" && atEnd) {
      return;
    }
    if (direction === "previous" && atStart) {
      return;
    }

    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }
    void requestSlideMove(talkId, direction).then((result) => {
      if (result.ok) {
        applyPosition(result.state);
      }
    });
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setActionError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setActionError(result.error ?? "That did not work. Try again.");
      }
      refresh();
    });
  }

  return (
    <main className="bg-cream fixed inset-0 flex flex-col select-none">
      <header className="flex items-center justify-between gap-3 px-4 pt-4">
        <p className="text-ink truncate text-sm font-bold tracking-[0.02em]">
          {talkName}
        </p>
        <span className="text-muted font-mono text-sm font-bold tabular-nums">
          {position}
        </span>
      </header>

      {terminal !== null ? (
        <p className="text-red px-4 pt-3 text-xs font-bold">
          {terminal === "sign-in"
            ? "Your session ended. Sign in again."
            : terminal === "no-access"
              ? "You no longer have access to this talk."
              : "This talk no longer exists."}
        </p>
      ) : status === "reconnecting" ? (
        <p className="text-amber px-4 pt-3 text-xs font-bold tracking-[0.08em] uppercase">
          Reconnecting
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-3 p-4">
        <button
          type="button"
          onClick={() => go("previous")}
          disabled={atStart || !hasSlides || terminal !== null}
          aria-label="Previous slide"
          className="border-ink shadow-hard-md enabled:hover:shadow-hard-lg flex min-h-24 flex-1 touch-manipulation flex-col items-center justify-center gap-2 rounded-[16px] border-[3px] bg-white text-base font-bold tracking-[0.08em] uppercase transition duration-150 ease-out enabled:active:scale-[0.985] enabled:active:shadow-[1px_1px_0_var(--color-ink)] disabled:opacity-40 disabled:shadow-none"
        >
          <span aria-hidden className="text-4xl leading-none">
            ←
          </span>
          Back
        </button>
        <button
          type="button"
          onClick={() => go("next")}
          disabled={atEnd || !hasSlides || terminal !== null}
          aria-label="Next slide"
          className="border-ink bg-coral shadow-hard-md enabled:hover:shadow-hard-lg flex min-h-24 flex-1 touch-manipulation flex-col items-center justify-center gap-2 rounded-[16px] border-[3px] text-base font-bold tracking-[0.08em] uppercase transition duration-150 ease-out enabled:active:scale-[0.985] enabled:active:shadow-[1px_1px_0_var(--color-ink)] disabled:opacity-40 disabled:shadow-none"
        >
          <span aria-hidden className="text-4xl leading-none">
            →
          </span>
          Next
        </button>
      </div>

      {state.activity ? (
        <ActivityStrip
          activity={state.activity}
          pending={pending}
          error={actionError}
          onLaunch={() => run(() => launchActivityAction(state.activity!.id))}
          onClose={() => run(() => closeActivityAction(state.activity!.id))}
          onRank={() => run(() => rankTextActivityAction(state.activity!.id))}
        />
      ) : state.live ? (
        <ElsewhereStrip
          activity={state.live}
          pending={pending}
          error={actionError}
          onClose={(type) =>
            run(() =>
              type === "text"
                ? rankTextActivityAction(state.live!.id)
                : closeActivityAction(state.live!.id),
            )
          }
        />
      ) : null}

      <footer className="flex items-center justify-between gap-3 px-4 pt-2 pb-4">
        <p className="text-muted text-xs font-semibold">
          {hasSlides ? "" : "No slides uploaded yet"}
        </p>
        <Link href={`/talks/${talkId}`} className="linky">
          Back to talk
        </Link>
      </footer>
    </main>
  );
}

function ActivityStrip({
  activity,
  pending,
  error,
  onLaunch,
  onClose,
  onRank,
}: {
  activity: NonNullable<SlideState["activity"]>;
  pending: boolean;
  error: string | null;
  onLaunch: () => void;
  onClose: () => void;
  onRank: () => void;
}) {
  const isText = activity.type === "text";

  return (
    <section className="border-ink mx-4 mb-1 flex flex-col gap-2 rounded-[12px] border-[3px] bg-white p-3">
      <p className="text-ink flex items-center gap-2 text-sm font-bold">
        <ActivityTypeBadge type={activity.type} />
        <span className="line-clamp-2">{activity.question}</span>
      </p>

      {activity.status === "ready" ? (
        <button
          type="button"
          disabled={pending}
          onClick={onLaunch}
          className="btn btn-green w-full"
        >
          {pending ? (
            <>
              Launching… <LoadingDots />
            </>
          ) : (
            `Launch ${typeLabel(activity.type).toLowerCase()}`
          )}
        </button>
      ) : null}

      {activity.status === "active" ? (
        <button
          type="button"
          disabled={pending}
          onClick={isText ? onRank : onClose}
          className="btn btn-ink w-full"
        >
          {pending ? (
            <>
              {isText ? "Ranking…" : "Closing…"} <LoadingDots />
            </>
          ) : (
            closeLabel(activity.type)
          )}
        </button>
      ) : null}

      {activity.status === "locked" ? (
        <span className="text-muted text-sm font-bold">
          Ranking in progress — retry from the big screen if it fails.
        </span>
      ) : null}

      {error ? (
        <p role="alert" className="text-red text-xs font-bold">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function ElsewhereStrip({
  activity,
  pending,
  error,
  onClose,
}: {
  activity: SlideLiveActivity;
  pending: boolean;
  error: string | null;
  onClose: (type: SlideLiveActivity["type"]) => void;
}) {
  const isText = activity.type === "text";
  const ranking = activity.status === "locked";

  return (
    <section className="border-ink mx-4 mb-1 flex flex-col gap-2 rounded-[12px] border-[3px] bg-white p-3">
      <p className="text-ink flex flex-wrap items-center gap-2 text-sm font-bold">
        <span className="chip chip-live">
          <span className="pulse-dot" />
          LIVE
        </span>
        <ActivityTypeBadge type={activity.type} />
        <span>{typeLabel(activity.type)} is live</span>
      </p>
      <p className="text-muted line-clamp-2 text-xs font-semibold">
        {activity.question}
      </p>

      {ranking ? (
        <p className="text-muted text-sm font-bold">Ranking in progress</p>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => onClose(activity.type)}
          className="btn btn-ink w-full"
        >
          {pending ? (
            <>
              {isText ? "Ranking…" : "Closing…"} <LoadingDots />
            </>
          ) : (
            closeLabel(activity.type)
          )}
        </button>
      )}

      {error ? (
        <p role="alert" className="text-red text-xs font-bold">
          {error}
        </p>
      ) : null}
    </section>
  );
}
