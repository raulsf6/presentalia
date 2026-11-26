"use client";

import { AnsweredCounter } from "@/components/AnsweredCounter";
import { useT } from "@/components/I18nProvider";
import { useLiveResults } from "@/components/useLiveResults";
import { isRemovedAnswer } from "@/lib/activities/text-activity";
import type { TextResultsPayload } from "@/lib/activities/text-results";

const textIsLive = (payload: TextResultsPayload) =>
  payload.activity.status !== "closed";

export function TextLiveResults({
  initial,
  projector,
  endpoint,
}: {
  initial: TextResultsPayload;
  projector: boolean;
  /** Overrides the attendee results URL, for the projected deck. */
  endpoint?: string;
}) {
  const t = useT();
  const { payload, accessRevoked } = useLiveResults({
    initial,
    url:
      endpoint ??
      `/api/text/${initial.activity.id}/results${projector ? "?display=projector" : ""}`,
    isActive: textIsLive,
    activityId: initial.activity.id,
  });

  if (!payload) {
    return (
      <p role="alert" className="alert alert-warn p-5">
        {accessRevoked ? t("results.accessRevoked") : t("results.unavailable")}
      </p>
    );
  }

  const {
    activity,
    mode,
    rows,
    summary,
    dropped,
    droppedCount,
    run,
    attendees,
  } = payload;
  const large = projector;
  const closed = activity.status === "closed";
  const ranked = mode === "ranked";

  return (
    <section className={`flex flex-col ${large ? "gap-10" : "gap-7"}`}>
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {closed ? (
            <span className="chip chip-closed">{t("status.closed")}</span>
          ) : (
            <span className="chip chip-live">
              <span className="pulse-dot" />
              {t("status.live")}
            </span>
          )}
          <AnsweredCounter
            answered={activity.totalAnswers}
            attendees={attendees}
            large={large}
          />
        </div>
        <h1
          className={`font-display text-ink tracking-tight ${
            large
              ? "text-3xl leading-tight md:text-4xl"
              : "text-2xl md:text-3xl"
          }`}
        >
          {activity.prompt}
        </h1>
        <p
          className={`text-muted font-semibold ${large ? "text-lg" : "text-sm"}`}
        >
          {t("activity.rankedFor", { criteria: activity.criteria })}
        </p>
      </header>

      {mode === "waiting" ? (
        <section className="card flex flex-col gap-2 p-6">
          <p className="text-ink font-bold">
            {run?.status === "failed"
              ? t("results.lastRankingFailed")
              : t("results.answersComing")}
          </p>
          <p className="text-muted text-sm font-semibold">
            {run?.status === "failed"
              ? t("results.retryOrPublish")
              : t("results.appearWhenClosed")}
          </p>
        </section>
      ) : mode === "ranking" ? (
        <section className="card flex flex-col gap-2 p-6">
          <p className="text-ink font-bold">{t("results.rankingAnswers")}</p>
          <p className="text-muted text-sm font-semibold">
            {t("results.appearWhenModel")}
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
                {t("results.publishedUnranked")}
              </p>
            </div>
          )}

          {rows.length === 0 ? (
            <p className="empty">{t("results.allFiltered")}</p>
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
                          large
                            ? "text-2xl md:text-3xl"
                            : "text-base md:text-lg"
                        }`}
                      >
                        {isRemovedAnswer(row.body)
                          ? t("text.answerRemoved")
                          : row.body}
                        {row.name ? (
                          <span className="text-muted ml-2 text-xs font-semibold">
                            {row.name}
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
                    {isRemovedAnswer(row.body)
                      ? t("text.answerRemoved")
                      : row.body}
                    {row.name ? (
                      <span className="text-muted ml-2 text-xs font-semibold">
                        {row.name}
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
              {t(
                droppedCount === 1
                  ? "results.omitted.one"
                  : "results.omitted.other",
                { count: droppedCount },
              )}
            </p>
          ) : null}

          {dropped && dropped.length > 0 ? (
            <section className="card flex flex-col gap-3 p-4">
              <h2 className="section-label">{t("results.omittedTitle")}</h2>
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
                ? t("results.identifiableProjector")
                : t("results.identifiable")}
            </p>
          ) : (
            <p className="text-muted text-xs font-semibold">
              {t("results.resultsAnonymous")}
            </p>
          )}

          {run ? (
            <p className="text-muted text-[0.65rem] font-semibold">
              {t("results.rankedWith", {
                model: run.model ?? t("results.configuredModel"),
              })}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
