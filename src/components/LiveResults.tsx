"use client";

import { useEffect, useState } from "react";

import type { PollResultsPayload } from "@/lib/polls";

export function LiveResults({
  initial,
  projector,
}: {
  initial: PollResultsPayload;
  projector: boolean;
}) {
  const [payload, setPayload] = useState<PollResultsPayload | null>(initial);
  const [accessRevoked, setAccessRevoked] = useState(false);
  const pollId = initial.poll.id;
  const isActive = payload?.poll.status === "active";

  useEffect(() => {
    if (!isActive) return;

    let disposed = false;

    async function refresh() {
      try {
        const response = await fetch(`/api/polls/${pollId}/results`, {
          cache: "no-store",
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 404) {
            setPayload(null);
            setAccessRevoked(true);
          }
          return;
        }
        const next = (await response.json()) as PollResultsPayload;
        if (!disposed) {
          setPayload(next);
          setAccessRevoked(false);
        }
      } catch {
        // A temporary network failure should not erase the last known result;
        // the next poll will retry.
      }
    }

    const interval = window.setInterval(() => void refresh(), 5_000);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [isActive, pollId]);

  if (!payload) {
    return (
      <p role="alert" className="rounded-lg bg-amber-50 p-5 text-amber-900">
        {accessRevoked
          ? "You no longer have access to these results."
          : "Results are temporarily unavailable. Refresh to try again."}
      </p>
    );
  }

  const { poll, rows, total, voters } = payload;
  const large = projector;

  return (
    <section className={`flex flex-col ${large ? "gap-10" : "gap-7"}`}>
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              poll.status === "active"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {poll.status === "active" ? "Live" : "Closed"}
          </span>
          <span className={`${large ? "text-lg" : "text-sm"} text-zinc-500`}>
            {total} {total === 1 ? "response" : "responses"}
          </span>
        </div>
        <h1
          className={`font-bold tracking-tight text-zinc-950 ${
            large
              ? "text-4xl leading-tight md:text-6xl"
              : "text-2xl md:text-3xl"
          }`}
        >
          {poll.question}
        </h1>
      </header>

      <ol className={`flex flex-col ${large ? "gap-7" : "gap-4"}`}>
        {rows.map((row, index) => {
          const optionVoters = voters?.filter(
            (voter) => voter.optionId === row.optionId,
          );
          return (
            <li
              key={row.optionId}
              className={`rounded-xl border border-zinc-200 bg-white ${
                large ? "p-6 md:p-8" : "p-4 md:p-5"
              }`}
            >
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <span
                  className={`font-semibold text-zinc-900 ${
                    large ? "text-2xl md:text-3xl" : "text-base md:text-lg"
                  }`}
                >
                  <span className="mr-2 text-zinc-400">{index + 1}.</span>
                  {row.label}
                </span>
                <span
                  className={`shrink-0 text-zinc-700 tabular-nums ${
                    large ? "text-2xl md:text-3xl" : "text-sm md:text-base"
                  }`}
                >
                  <strong className="font-bold">{row.percent}%</strong>
                  <span className="ml-2 text-zinc-500">{row.votes}</span>
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`${row.label}: ${row.percent}%`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={row.percent}
                className={`overflow-hidden rounded-full bg-zinc-100 ${
                  large ? "h-5" : "h-3"
                }`}
              >
                <div
                  className="h-full rounded-full bg-indigo-600 transition-[width] duration-500"
                  style={{ width: `${row.percent}%` }}
                />
              </div>
              {voters ? (
                <div
                  className={`mt-4 flex flex-wrap gap-2 ${
                    large ? "text-base" : "text-xs"
                  }`}
                >
                  {optionVoters?.map((voter, voterIndex) => (
                    <span
                      key={`${voter.email}-${voterIndex}`}
                      className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700"
                    >
                      {voter.email}
                    </span>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {voters === null ? (
        <p className={`${large ? "text-lg" : "text-sm"} text-zinc-500`}>
          Results are anonymous.
        </p>
      ) : null}
      {poll.status === "active" ? (
        <p className="text-xs text-zinc-400" aria-live="polite">
          Results update automatically as votes arrive.
        </p>
      ) : null}
    </section>
  );
}
