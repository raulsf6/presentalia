"use client";

import { useEffect, useState, useTransition } from "react";

import {
  closeActivityAction,
  launchActivityAction,
} from "@/actions/activities";
import { rankTextActivityAction } from "@/actions/text";
import { ActivityTypeBadge } from "@/components/ActivityTypeBadge";
import { LiveResults } from "@/components/LiveResults";
import { LoadingDots } from "@/components/LoadingDots";
import { QuizLiveResults } from "@/components/QuizLiveResults";
import { TextLiveResults } from "@/components/TextLiveResults";
import type { PollResultsPayload } from "@/lib/activities/polls";
import type { QuizResultsPayload } from "@/lib/activities/quiz-results";
import type { TextResultsPayload } from "@/lib/activities/text-results";
import type { SlideActivity } from "@/lib/deck/slide-state";

type Loaded =
  | { type: "poll"; payload: PollResultsPayload }
  | { type: "quiz"; payload: QuizResultsPayload }
  | { type: "text"; payload: TextResultsPayload };

function launchLabel(type: SlideActivity["type"]): string {
  if (type === "quiz") return "Launch quiz";
  if (type === "text") return "Launch prompt";
  return "Launch poll";
}

function closeLabel(type: SlideActivity["type"]): string {
  if (type === "quiz") return "Close quiz";
  if (type === "text") return "Rank & close";
  return "Close voting";
}

function statusChip(activity: SlideActivity) {
  if (activity.status === "active") {
    return (
      <span className="chip chip-live">
        <span className="pulse-dot" />
        LIVE
      </span>
    );
  }
  if (activity.status === "closed") {
    return <span className="chip chip-closed">CLOSED</span>;
  }
  if (activity.status === "locked") {
    return <span className="chip chip-draft">RANKING</span>;
  }
  return null;
}

function responseLabel(payload: Loaded | null): string | null {
  if (!payload) return null;
  if (payload.type === "poll" && payload.payload.total > 0) {
    return `${payload.payload.total} ${
      payload.payload.total === 1 ? "response" : "responses"
    }`;
  }
  if (payload.type === "text" && payload.payload.activity.totalAnswers > 0) {
    return `${payload.payload.activity.totalAnswers} ${
      payload.payload.activity.totalAnswers === 1 ? "answer" : "answers"
    }`;
  }
  return null;
}

/**
 * The projected activity: what the room sees when the deck lands on a step
 * between slides. It loads the activity's payload for its current status,
 * shows a waiting view before the launch, and hands over to the existing live
 * results displays once it is live.
 */
export function ActivityStep({
  talkId,
  activity,
  counter,
  fullscreen,
  onToggleFullscreen,
  onNext,
  onStateChanged,
}: {
  talkId: string;
  activity: SlideActivity;
  counter: string;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onNext: () => void;
  onStateChanged: () => void;
}) {
  const endpoint = `/api/talks/${talkId}/activities/${activity.id}/deck`;
  const [payload, setPayload] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Activity payload failed (${response.status}).`);
        }
        const next = (await response.json()) as Loaded["payload"];
        if (!cancelled) {
          setPayload({ type: activity.type, payload: next } as Loaded);
          setLoadError(false);
        }
      } catch {
        if (!cancelled) {
          setLoadError(true);
          retry = setTimeout(load, 3_000);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (retry !== null) {
        clearTimeout(retry);
      }
    };
  }, [endpoint, activity.status, activity.type]);

  const canLaunch = activity.status === "ready";
  const isText = activity.type === "text";
  const ranking =
    activity.status === "locked" &&
    (payload?.type !== "text" || payload.payload.run?.status === "running");
  const rankingFailed =
    activity.status === "locked" &&
    payload?.type === "text" &&
    payload.payload.run?.status === "failed";
  const canClose = activity.status === "active";

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setActionError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setActionError(result.error ?? "That did not work. Try again.");
      }
      onStateChanged();
    });
  }

  const responses = responseLabel(payload);
  // The results displays repeat the question, the status chip, and the count;
  // keep the deck's own header for the waiting screen and while loading.
  const ownResults = payload !== null && activity.status !== "ready";

  return (
    <main className="bg-cream text-ink fixed inset-0 overflow-y-auto">
      <div className="relative mx-auto flex min-h-full w-full max-w-6xl flex-col gap-8 px-8 py-8">
        <div className="pointer-events-none absolute top-8 right-8 z-10">
          <ActivityTypeBadge type={activity.type} size="lg" />
        </div>
        {ownResults ? null : (
          <header className="flex flex-col gap-5">
            {statusChip(activity) || responses ? (
              <div className="flex flex-wrap items-center gap-3">
                {statusChip(activity)}
                {responses ? (
                  <span className="text-muted text-sm font-bold">
                    {responses}
                  </span>
                ) : null}
              </div>
            ) : null}
            <h1 className="font-display max-w-[calc(100%-7rem)] min-w-0 text-4xl leading-tight tracking-tight md:text-6xl">
              {activity.question}
            </h1>
          </header>
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          {loadError && !payload ? (
            <p role="alert" className="alert alert-warn p-5">
              The activity is still loading. It will retry on its own.
            </p>
          ) : null}

          {!payload ? (
            <p className="text-muted text-sm font-bold tracking-[0.12em] uppercase">
              Loading the activity…
            </p>
          ) : activity.status === "ready" ? (
            <WaitingView payload={payload} />
          ) : payload.type === "poll" ? (
            <LiveResults
              key={`${activity.id}-${activity.status}`}
              initial={payload.payload}
              projector={true}
              endpoint={endpoint}
            />
          ) : payload.type === "quiz" ? (
            <QuizLiveResults
              key={`${activity.id}-${activity.status}`}
              initial={payload.payload}
              projector={true}
              endpoint={endpoint}
            />
          ) : (
            <TextLiveResults
              key={`${activity.id}-${activity.status}`}
              initial={payload.payload}
              projector={true}
              endpoint={endpoint}
            />
          )}
        </div>

        <footer className="border-ink/15 bg-cream sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t-[3px] border-dashed pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {canLaunch ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => launchActivityAction(activity.id))}
                className="btn btn-green"
              >
                {pending ? (
                  <>
                    Launching… <LoadingDots />
                  </>
                ) : (
                  launchLabel(activity.type)
                )}
              </button>
            ) : null}

            {canClose && !isText ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => closeActivityAction(activity.id))}
                className="btn btn-ink"
              >
                {pending ? (
                  <>
                    Closing… <LoadingDots />
                  </>
                ) : (
                  closeLabel(activity.type)
                )}
              </button>
            ) : null}

            {canClose && isText ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => rankTextActivityAction(activity.id))}
                className="btn btn-green"
              >
                {pending ? (
                  <>
                    Ranking… <LoadingDots />
                  </>
                ) : (
                  closeLabel(activity.type)
                )}
              </button>
            ) : null}

            {ranking ? (
              <span className="text-muted flex items-center gap-2 text-sm font-bold">
                Ranking… <LoadingDots />
              </span>
            ) : null}

            {rankingFailed ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => rankTextActivityAction(activity.id))}
                className="btn btn-green"
              >
                {pending ? (
                  <>
                    Retrying… <LoadingDots />
                  </>
                ) : (
                  "Retry ranking"
                )}
              </button>
            ) : null}

            <button type="button" onClick={onNext} className="btn btn-ghost">
              Next →
            </button>
          </div>

          <div className="flex items-center gap-3">
            {actionError ? (
              <p role="alert" className="text-red max-w-xs text-sm font-bold">
                {actionError}
              </p>
            ) : null}
            <span className="text-muted font-mono text-sm tabular-nums">
              {counter}
            </span>
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="border-ink/30 text-ink/70 hover:border-ink hover:text-ink rounded-md border px-2.5 py-1 text-[0.65rem] font-bold tracking-[0.08em] uppercase transition"
            >
              {fullscreen ? "Exit full screen" : "Full screen"}
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}

/** The room sees the question and options before the presenter launches. */
function WaitingView({ payload }: { payload: Loaded }) {
  if (payload.type === "text") {
    return (
      <div className="flex flex-col gap-6">
        <p className="text-ink/75 text-xl font-semibold">
          {payload.payload.activity.criteria}
        </p>
        <p className="text-muted text-sm font-bold tracking-[0.12em] uppercase">
          Waiting to launch
        </p>
      </div>
    );
  }

  const options =
    payload.type === "poll"
      ? payload.payload.rows.map((row) => ({
          id: row.optionId,
          label: row.label,
        }))
      : payload.payload.options.map((option) => ({
          id: option.optionId,
          label: option.label,
        }));

  return (
    <div className="flex flex-col gap-8">
      <ul className="grid gap-4 md:grid-cols-2">
        {options.map((option) => (
          <li
            key={option.id}
            className="card text-ink flex items-center p-5 text-xl font-bold"
          >
            {option.label}
          </li>
        ))}
      </ul>
      <p className="text-muted text-sm font-bold tracking-[0.12em] uppercase">
        Waiting to launch
      </p>
    </div>
  );
}
