"use client";

import { useLiveResults } from "@/components/useLiveResults";
import type { PollResultsPayload } from "@/lib/polls";

const pollIsActive = (payload: PollResultsPayload) =>
  payload.poll.status === "active";

export function LiveResults({
  initial,
  projector,
}: {
  initial: PollResultsPayload;
  projector: boolean;
}) {
  const { payload, accessRevoked } = useLiveResults({
    initial,
    url: `/api/polls/${initial.poll.id}/results`,
    isActive: pollIsActive,
  });

  if (!payload) {
    return (
      <p role="alert" className="alert alert-warn p-5">
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
          {poll.status === "active" ? (
            <span className="chip chip-live">
              <span className="pulse-dot" />
              LIVE
            </span>
          ) : (
            <span className="chip chip-closed">CLOSED</span>
          )}
          <span
            className={`${large ? "text-lg" : "text-sm"} text-muted font-bold`}
          >
            {total} {total === 1 ? "response" : "responses"}
          </span>
        </div>
        <h1
          className={`font-display text-ink tracking-tight ${
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
              className={`card ${large ? "p-6 md:p-8" : "p-4 md:p-5"}`}
            >
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <span
                  className={`text-ink font-bold ${
                    large ? "text-2xl md:text-3xl" : "text-base md:text-lg"
                  }`}
                >
                  <span className="text-muted mr-2">{index + 1}.</span>
                  {row.label}
                </span>
                <span
                  className={`text-ink shrink-0 tabular-nums ${
                    large ? "text-2xl md:text-3xl" : "text-sm md:text-base"
                  }`}
                >
                  <strong className="font-display">{row.percent}%</strong>
                  <span className="text-muted ml-2 font-bold">{row.votes}</span>
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`${row.label}: ${row.percent}%`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={row.percent}
                className={`bar ${large ? "h-5" : "h-4"}`}
              >
                <span
                  className="bar-fill"
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
                      key={`${voter.name}-${voterIndex}`}
                      className="border-ink/15 bg-cream2 text-ink/80 rounded-md border-[2.5px] px-3 py-1 font-medium"
                    >
                      {voter.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {voters === null ? (
        <p
          className={`${large ? "text-lg" : "text-sm"} text-muted font-semibold`}
        >
          Results are anonymous.
        </p>
      ) : null}
      {poll.status === "active" ? (
        <p className="text-muted text-xs font-semibold" aria-live="polite">
          Results update automatically as votes arrive.
        </p>
      ) : null}
    </section>
  );
}
