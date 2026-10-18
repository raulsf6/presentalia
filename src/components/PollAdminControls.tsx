"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { closePollAction, launchPollAction } from "@/actions/polls";

export function PollAdminControls({
  pollId,
  status,
}: {
  pollId: string;
  status: "draft" | "active" | "closed";
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
      <p className="text-sm text-zinc-500">
        This poll is closed. Its question, options, and results setting are
        read-only.
      </p>
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
          className={`w-fit rounded-md px-4 py-2 text-sm font-medium text-white transition-colors ${
            launch
              ? "bg-emerald-700 hover:bg-emerald-800"
              : "bg-zinc-900 hover:bg-zinc-700"
          }`}
        >
          {launch ? "Launch poll…" : "Close poll…"}
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-md border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">{prompt}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={runAction}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending
                ? launch
                  ? "Launching…"
                  : "Closing…"
                : launch
                  ? "Yes, launch poll"
                  : "Yes, close voting"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
