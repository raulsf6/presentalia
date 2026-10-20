"use client";

import { useLiveResults } from "@/components/useLiveResults";
import type { TextResultsPayload } from "@/lib/text-results";

const textIsLive = (payload: TextResultsPayload) =>
  payload.activity.status !== "closed";

export function TextLiveResults({
  initial,
  projector,
}: {
  initial: TextResultsPayload;
  projector: boolean;
}) {
  const { payload, accessRevoked } = useLiveResults({
    initial,
    url: `/api/text/${initial.activity.id}/results${projector ? "?display=projector" : ""}`,
    isActive: textIsLive,
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

  const { activity, mode, rows, summary, dropped, droppedCount, run } = payload;
  const large = projector;
  const closed = activity.status === "closed";
  const ranked = mode === "ranked";

  return (
    <section className={`flex flex-col ${large ? "gap-10" : "gap-7"}`}>
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {closed ? (
            <span className="chip chip-closed">CLOSED</span>
          ) : (
            <span className="chip chip-live">
              <span className="pulse-dot" />
              LIVE
            </span>
          )}
          {closed ? (
            <span className="text-muted text-sm font-bold">
              {activity.totalAnswers}{" "}
              {activity.totalAnswers === 1 ? "answer" : "answers"}
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
          {activity.prompt}
        </h1>
        <p
          className={`text-muted font-semibold ${large ? "text-lg" : "text-sm"}`}
        >
          Ranked for: {activity.criteria}
        </p>
      </header>

      {mode === "waiting" ? (
        <section className="card flex flex-col gap-2 p-6">
          <p className="text-ink font-bold">
            {run?.status === "failed"
              ? "The last ranking attempt failed."
              : "Answers are still coming in."}
          </p>
          <p className="text-muted text-sm font-semibold">
            {run?.status === "failed"
              ? "The presenter can retry or publish every answer."
              : "Results appear here when the presenter closes the activity."}
          </p>
          {run?.status === "failed" && run.error ? (
            <p className="text-muted text-xs font-semibold">{run.error}</p>
          ) : null}
        </section>
      ) : mode === "ranking" ? (
        <section className="card flex flex-col gap-2 p-6">
          <p className="text-ink font-bold">Ranking the answers…</p>
          <p className="text-muted text-sm font-semibold">
            The results will appear as soon as the model finishes.
          </p>
        </section>
      ) : (
        <>
          {summary ? (
            <div className="border-ink/15 bg-cream2 rounded-lg border-[2.5px] p-4">
              <p
                className={`text-ink font-bold ${large ? "text-xl" : "text-sm"}`}
              >
                {summary}
              </p>
            </div>
          ) : (
            <div className="border-ink/15 bg-cream2 rounded-lg border-[2.5px] p-4">
              <p
                className={`text-ink font-bold ${large ? "text-xl" : "text-sm"}`}
              >
                Published without AI ranking.
              </p>
            </div>
          )}

          {rows.length === 0 ? (
            <p className="empty">
              Every answer was filtered out as off-topic or spam.
            </p>
          ) : ranked ? (
            <ol className={`flex flex-col ${large ? "gap-7" : "gap-4"}`}>
              {rows.map((row) => (
                <li
                  key={row.answerId}
                  className={`card ${large ? "p-6 md:p-8" : "p-4 md:p-5"}`}
                >
                  <div className="flex items-baseline gap-3">
                    <span
                      className={`font-display text-ink shrink-0 ${
                        large ? "text-4xl" : "text-xl"
                      }`}
                    >
                      {row.rank}.
                    </span>
                    <div className="flex flex-col gap-2">
                      <p
                        className={`text-ink font-bold ${
                          large ? "text-2xl md:text-3xl" : "text-base md:text-lg"
                        }`}
                      >
                        {row.body}
                        {row.email ? (
                          <span className="text-muted ml-2 text-xs font-semibold">
                            {row.email}
                          </span>
                        ) : null}
                      </p>
                      {row.rationale && row.rank !== null && row.rank <= 5 ? (
                        <p
                          className={`text-muted font-semibold ${
                            large ? "text-base" : "text-xs"
                          }`}
                        >
                          {row.rationale}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <ul className={`flex flex-col ${large ? "gap-4" : "gap-3"}`}>
              {rows.map((row) => (
                <li
                  key={row.answerId}
                  className={`card ${large ? "p-6" : "p-4"}`}
                >
                  <p
                    className={`text-ink font-bold ${
                      large ? "text-2xl" : "text-base"
                    }`}
                  >
                    {row.body}
                    {row.email ? (
                      <span className="text-muted ml-2 text-xs font-semibold">
                        {row.email}
                      </span>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {droppedCount > 0 ? (
            <p
              className={`text-muted font-semibold ${large ? "text-lg" : "text-sm"}`}
            >
              {droppedCount} off-topic{" "}
              {droppedCount === 1 ? "answer was" : "answers were"} omitted.
            </p>
          ) : null}

          {dropped && dropped.length > 0 ? (
            <section className="card flex flex-col gap-3 p-4">
              <h2 className="section-label">Omitted answers (presenter only)</h2>
              <ul className="flex flex-col gap-2">
                {dropped.map((row) => (
                  <li key={row.answerId} className="text-sm">
                    <span className="text-ink font-semibold">{row.body}</span>
                    <span className="text-muted ml-2 text-xs font-bold">
                      {row.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {activity.resultsIdentifiable ? (
            <p className="text-muted text-xs font-semibold">
              {projector
                ? "Results are identifiable. Email addresses are hidden on the projector."
                : "Results are identifiable. Attendee email addresses appear next to their answers."}
            </p>
          ) : (
            <p className="text-muted text-xs font-semibold">
              Results are anonymous.
            </p>
          )}

          {run ? (
            <p className="text-muted text-[0.65rem] font-semibold">
              Ranked with {run.model ?? "the configured model"}.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
