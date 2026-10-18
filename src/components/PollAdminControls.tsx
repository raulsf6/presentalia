"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { closePollAction, launchPollAction } from "@/actions/polls";
import { LoadingDots } from "@/components/LoadingDots";

export function PollAdminControls({
  pollId,
  status,
  launchBlockedReason,
}: {
  pollId: string;
  status: "draft" | "active" | "closed";
  /** When set on a draft, launching is unavailable and this explains why. */
  launchBlockedReason?: string | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const action = status === "draft" ? launchPollAction : closePollAction;

  function runAction() {
    setError(null);
    startTransition(async () => {
      const result = await action(pollId);
      if (!result.ok) {
        setError(result.error ?? "Could not update the poll.");
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  if (status === "closed") {
    return (
      <p className="text-muted text-sm font-semibold">
        This poll is closed. Its question, options, and results setting are
        read-only.
      </p>
    );
  }

  if (launchBlockedReason && status === "draft") {
    return (
      <div className="flex flex-col gap-2">
        <button type="button" disabled className="btn w-fit">
          Launch poll…
        </button>
        <p className="text-muted text-xs font-semibold">
          {launchBlockedReason}
        </p>
      </div>
    );
  }

  const launch = status === "draft";
  const prompt = launch
    ? "Launch this poll now? Attendees will be able to vote, and the question, options, and results identity setting will be locked."
    : "Close voting now? Attendees will no longer be able to submit votes, but everyone authorized can still see the final results.";

  return (
    <div className="flex flex-col gap-3">
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={`btn w-fit ${launch ? "btn-green" : "btn-ink"}`}
        >
          {launch ? "Launch poll…" : "Close poll…"}
        </button>
      ) : (
        <div className="border-amber bg-ambersoft flex flex-col gap-3 rounded-lg border-[2.5px] p-4">
          <p className="text-amberdeep text-sm font-bold">{prompt}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={runAction}
              className={`btn btn-small ${launch ? "btn-green" : "btn-ink"}`}
            >
              {pending ? (
                <>
                  {launch ? "Launching…" : "Closing…"} <LoadingDots />
                </>
              ) : launch ? (
                "Yes, launch poll 🎉"
              ) : (
                "Yes, close voting"
              )}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="btn btn-ghost btn-small"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-red text-sm font-bold">
          {error}
        </p>
      ) : null}
    </div>
  );
}
