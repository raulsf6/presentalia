"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { submitQuizVoteAction } from "@/actions/quizzes";
import { submitVoteAction } from "@/actions/vote";

export function VoteForm({
  activityId,
  kind = "poll",
  options,
}: {
  activityId: string;
  kind?: "poll" | "quiz";
  options: { id: string; label: string }[];
}) {
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const action = kind === "quiz" ? submitQuizVoteAction : submitVoteAction;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || pending || celebrating) return;
    setError(null);
    startTransition(async () => {
      const result = await action(activityId, selected);
      if (!result.ok) {
        setError(result.error ?? "Your vote was not accepted.");
        return;
      }
      if (!result.talkId) {
        // Defensive fallback: refreshing the activity page redirects an
        // already-voted member to the results from the server side.
        router.refresh();
        return;
      }
      // The vote is saved. Play the celebration, then move to the results.
      const resultsHref = `/talks/${result.talkId}/activities/${activityId}/results`;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduceMotion) {
        router.push(resultsHref);
        return;
      }
      setCelebrating(true);
      window.setTimeout(() => {
        router.push(resultsHref);
      }, 700);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <fieldset
        className="flex flex-col gap-2.5"
        disabled={pending || celebrating}
      >
        <legend className="sr-only">Choose one answer</legend>
        {options.map((option) => {
          const isSelected = selected === option.id;
          return (
            <label
              key={option.id}
              className={`vote-option ${isSelected ? "is-selected" : ""}`}
            >
              <input
                type="radio"
                name="option"
                value={option.id}
                checked={isSelected}
                onChange={() => setSelected(option.id)}
                className="accent-coral size-5"
              />
              <span className="text-ink text-base font-bold">
                {option.label}
              </span>
              {isSelected ? (
                <span aria-hidden="true" className="vote-option-check">
                  ✓
                </span>
              ) : null}
            </label>
          );
        })}
      </fieldset>
      <p className="text-muted text-xs font-medium">
        Your vote is final and cannot be changed.
      </p>
      <div className={`vote-celebrate ${celebrating ? "is-celebrating" : ""}`}>
        <button
          type="submit"
          disabled={!selected || pending || celebrating}
          className="vote-btn"
        >
          {pending ? "Submitting…" : "Submit my vote"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-red text-sm font-bold">
          {error}
        </p>
      ) : null}
    </form>
  );
}
