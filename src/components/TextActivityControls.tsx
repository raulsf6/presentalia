"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  publishTextUnrankedAction,
  rankTextActivityAction,
} from "@/actions/text";
import { LoadingDots } from "@/components/LoadingDots";
import { RANKED_ANSWER_LIMIT } from "@/lib/activities/text-activity";

type Mode = "rank" | "unranked";

export function TextActivityControls({
  activityId,
  status,
  runStatus,
  answerCount,
}: {
  activityId: string;
  status: "active" | "locked";
  runStatus: "running" | "succeeded" | "failed" | null;
  answerCount: number;
}) {
  const [confirming, setConfirming] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const ranking = runStatus === "running";
  const overCap = answerCount > RANKED_ANSWER_LIMIT;
  const empty = answerCount === 0;
  const label = status === "locked" ? "Retry ranking" : "Rank & close";

  function run(mode: Mode) {
    setError(null);
    startTransition(async () => {
      const result =
        mode === "rank"
          ? await rankTextActivityAction(activityId)
          : await publishTextUnrankedAction(activityId);
      if (!result.ok) {
        setError(result.error ?? "Could not update the activity.");
        return;
      }
      setConfirming(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending || ranking || overCap || empty}
          onClick={() => setConfirming("rank")}
          className="btn btn-green btn-small"
        >
          {pending && confirming === "rank" ? (
            <>
              Ranking… <LoadingDots />
            </>
          ) : (
            `${label}…`
          )}
        </button>
        <button
          type="button"
          disabled={pending || ranking}
          onClick={() => setConfirming("unranked")}
          className="btn btn-ghost btn-small"
        >
          {pending && confirming === "unranked"
            ? "Closing…"
            : "Close without ranking…"}
        </button>
        <span className="text-muted text-xs font-semibold">
          {answerCount} {answerCount === 1 ? "answer" : "answers"}
        </span>
      </div>

      {overCap ? (
        <p className="text-amberdeep text-xs font-semibold">
          {answerCount} answers is above the {RANKED_ANSWER_LIMIT}-answer limit
          for AI ranking. Close without ranking to publish them all.
        </p>
      ) : null}

      {empty ? (
        <p className="text-muted text-xs font-semibold">
          No answers yet. Ranking starts after at least one attendee answers.
        </p>
      ) : null}

      {ranking ? (
        <p className="text-muted text-xs font-semibold">
          Ranking is in progress. You can publish every answer if it fails or
          times out.
        </p>
      ) : null}

      {confirming ? (
        <div className="border-amber bg-ambersoft flex flex-col gap-3 rounded-lg border-[2.5px] p-4">
          <p className="text-amberdeep text-sm font-bold">
            {confirming === "rank"
              ? status === "locked"
                ? `Retry ranking the ${answerCount} answers? The room will see the result as soon as the model finishes.`
                : `Rank the ${answerCount} answers and close? No more answers will be accepted, and the room will see the result as soon as the model finishes.`
              : `Close without ranking? All ${answerCount} answers will be published in submission order, with no AI ranking.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(confirming)}
              className="btn btn-small"
            >
              {pending ? (
                <>
                  {confirming === "rank" ? "Ranking…" : "Closing…"}{" "}
                  <LoadingDots />
                </>
              ) : confirming === "rank" ? (
                "Yes, rank and close"
              ) : (
                "Yes, close without ranking"
              )}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(null)}
              className="btn btn-ghost btn-small"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-red text-sm font-bold">
          {error}
        </p>
      ) : null}
    </div>
  );
}
