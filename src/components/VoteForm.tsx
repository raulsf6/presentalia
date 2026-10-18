"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { submitVoteAction } from "@/actions/vote";

export function VoteForm({
  pollId,
  options,
}: {
  pollId: string;
  options: { id: string; label: string }[];
}) {
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || pending || celebrating) return;
    setError(null);
    startTransition(async () => {
      const result = await submitVoteAction(pollId, selected);
      if (!result.ok) {
        setError(result.error ?? "Your vote was not accepted.");
        return;
      }
      if (!result.talkId) {
        // Defensive fallback: refreshing the poll page redirects an
        // already-voted member to the results from the server side.
        router.refresh();
        return;
      }
      // The vote is saved. Play the celebration, then move to the results.
      const resultsHref = `/talks/${result.talkId}/polls/${pollId}/results`;
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
        className="flex flex-col gap-2"
        disabled={pending || celebrating}
      >
        <legend className="sr-only">Choose one answer</legend>
        {options.map((option) => {
          const isSelected = selected === option.id;
          return (
            <label
              key={option.id}
              className={`border-ink flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3.5 transition duration-150 ${
                isSelected
                  ? "bg-peach shadow-[0_3px_0_var(--color-coral)]"
                  : "shadow-hard hover:shadow-hard-lg bg-white hover:-translate-y-0.5"
              }`}
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
                <span
                  aria-hidden="true"
                  className="bg-coral font-display ml-auto flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white"
                >
                  ✓
                </span>
              ) : null}
            </label>
          );
        })}
      </fieldset>
      <p className="text-muted text-xs font-semibold">
        Your vote is final and cannot be changed.
      </p>
      <button
        type="submit"
        disabled={!selected || pending || celebrating}
        className={`pow-btn ${celebrating ? "is-celebrating" : ""}`}
      >
        <span aria-hidden="true" className="pow-btn-shadow" />
        <span aria-hidden="true" className="pow-btn-frame" />
        <span className="pow-btn-inner">
          {pending ? "Submitting…" : "Submit my vote"}
        </span>
      </button>
      {error ? (
        <p role="alert" className="text-red text-sm font-bold">
          {error}
        </p>
      ) : null}
    </form>
  );
}
