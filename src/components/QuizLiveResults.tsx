"use client";

import { useLiveResults } from "@/components/useLiveResults";
import type { QuizResultsPayload } from "@/lib/quiz-results";

const quizIsActive = (payload: QuizResultsPayload) =>
  payload.quiz.status === "active";

export function QuizLiveResults({
  initial,
  projector,
}: {
  initial: QuizResultsPayload;
  projector: boolean;
}) {
  const { payload, accessRevoked } = useLiveResults({
    initial,
    url: `/api/quizzes/${initial.quiz.id}/results${projector ? "?display=projector" : ""}`,
    isActive: quizIsActive,
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

  const { quiz, options, rows, total, voters, viewer, showResults, needsVote } =
    payload;
  const large = projector;
  const closed = quiz.status === "closed";
  const showWaiting = !closed && !showResults;
  const totalResponses = total ?? 0;
  const correctVotes = quiz.correctVotes ?? 0;
  const correctPercent =
    totalResponses === 0
      ? 0
      : Math.round((correctVotes / totalResponses) * 100);
  const correctRow =
    closed && quiz.correctOptionId
      ? rows.find((row) => row.optionId === quiz.correctOptionId)
      : null;
  return (
    <section className={`flex flex-col ${large ? "gap-10" : "gap-7"}`}>
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {quiz.status === "active" ? (
            <span className="chip chip-live">
              <span className="pulse-dot" />
              LIVE
            </span>
          ) : (
            <span className="chip chip-closed">CLOSED</span>
          )}
          {showResults && total !== null ? (
            <span
              className={`${large ? "text-lg" : "text-sm"} text-muted font-bold`}
            >
              {total} {total === 1 ? "response" : "responses"}
            </span>
          ) : null}
        </div>
        <h1
          className={`font-display text-ink tracking-tight ${
            large
              ? "text-4xl leading-tight md:text-6xl"
              : "text-2xl md:text-3xl"
          }`}
        >
          {quiz.question}
        </h1>
      </header>

      {needsVote ? (
        <p className="empty">
          Vote on the quiz first. Results are revealed after you answer.
        </p>
      ) : showWaiting ? (
        <section className="card flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-2">
            <h2 className="section-label">Answer options</h2>
            <ol
              className={`text-ink list-inside list-decimal space-y-2 font-semibold ${
                large ? "text-xl md:text-2xl" : "text-sm"
              }`}
            >
              {options.map((option) => (
                <li key={option.optionId}>{option.label}</li>
              ))}
            </ol>
          </div>
          <p className="text-ink font-bold">Voting is open.</p>
          <p className="text-muted text-sm font-semibold">
            Percentages, the number of responses, and the correct answer will be
            revealed when the quiz closes.
          </p>
        </section>
      ) : (
        <>
          {closed ? (
            <div
              className={`border-ink/15 bg-cream2 rounded-lg border-[2.5px] ${
                large ? "p-5" : "p-4"
              }`}
            >
              <p
                className={`text-ink font-bold ${large ? "text-xl" : "text-sm"}`}
                aria-live="polite"
              >
                {totalResponses === 0
                  ? "No responses yet."
                  : `${correctVotes} of ${totalResponses} got it right (${correctPercent}%)`}
              </p>
            </div>
          ) : null}

          <ol className={`flex flex-col ${large ? "gap-7" : "gap-4"}`}>
            {rows.map((row, index) => {
              const isCorrect = closed && row.optionId === quiz.correctOptionId;
              const isViewer =
                closed && !projector && viewer?.optionId === row.optionId;
              const optionVoters = voters?.filter(
                (voter) => voter.optionId === row.optionId,
              );
              return (
                <li
                  key={row.optionId}
                  className={`card ${large ? "p-6 md:p-8" : "p-4 md:p-5"} ${
                    isCorrect ? "border-green bg-greensoft" : ""
                  }`}
                >
                  <div className="mb-3 flex items-baseline justify-between gap-4">
                    <span
                      className={`text-ink font-bold ${
                        large ? "text-2xl md:text-3xl" : "text-base md:text-lg"
                      }`}
                    >
                      <span className="text-muted mr-2">{index + 1}.</span>
                      {row.label}
                      <span className="mt-1 flex flex-wrap gap-2">
                        {isCorrect ? (
                          <span className="chip chip-slide text-[0.65rem]">
                            ✓ Correct answer
                          </span>
                        ) : null}
                        {isViewer ? (
                          <span className="chip chip-soft-amber text-[0.65rem]">
                            Your pick
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span
                      className={`text-ink shrink-0 tabular-nums ${
                        large ? "text-2xl md:text-3xl" : "text-sm md:text-base"
                      }`}
                    >
                      <strong className="font-display">{row.percent}%</strong>
                      <span className="text-muted ml-2 font-bold">
                        {row.votes}
                      </span>
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
                          key={`${voter.email}-${voterIndex}`}
                          className="border-ink/15 bg-cream2 text-ink/80 rounded-md border-[2.5px] px-3 py-1 font-medium"
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

          {closed && viewer && !projector ? (
            <p
              className={`text-sm font-bold ${
                viewer.correct ? "text-green" : "text-red"
              }`}
            >
              {viewer.correct
                ? "You got it right."
                : `Your pick was not correct. The correct answer is ${
                    correctRow?.label ?? "the highlighted option"
                  }.`}
            </p>
          ) : null}

          {voters === null ? (
            <p
              className={`${large ? "text-lg" : "text-sm"} text-muted font-semibold`}
            >
              Results are anonymous.
            </p>
          ) : null}
          {quiz.status === "active" ? (
            <p className="text-muted text-xs font-semibold" aria-live="polite">
              Results update automatically as votes arrive.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
