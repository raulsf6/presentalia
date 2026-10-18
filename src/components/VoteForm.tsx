"use client";

import { useState, useTransition } from "react";

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
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await submitVoteAction(pollId, selected);
      if (!result.ok) {
        setError(result.error ?? "Your vote was not accepted.");
      }
      // A successful action redirects to results. No option can be revised.
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Choose one answer</legend>
        {options.map((option) => (
          <label
            key={option.id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
              selected === option.id
                ? "border-zinc-900 bg-zinc-50"
                : "border-zinc-200 bg-white hover:border-zinc-400"
            }`}
          >
            <input
              type="radio"
              name="option"
              value={option.id}
              checked={selected === option.id}
              onChange={() => setSelected(option.id)}
              className="size-4 accent-zinc-900"
            />
            <span className="text-base font-medium text-zinc-900">
              {option.label}
            </span>
          </label>
        ))}
      </fieldset>
      <p className="text-xs text-zinc-500">
        Your vote is final and cannot be changed.
      </p>
      <button
        type="submit"
        disabled={!selected || pending}
        className="rounded-md bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit my vote"}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </form>
  );
}
