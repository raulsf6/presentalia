"use client";

import { AnsweredCounter } from "@/components/AnsweredCounter";
import { useT } from "@/components/I18nProvider";
import { useLiveResults } from "@/components/useLiveResults";
import type { CloudItem } from "@/lib/activities/cloud-activity";
import type { CloudResultsPayload } from "@/lib/activities/cloud-results";

const CLOUD_COLORS = [
  "#d9481f",
  "#0f7a3b",
  "#7a5200",
  "#1f140b",
  "#6f614f",
] as const;

const cloudIsLive = (payload: CloudResultsPayload) =>
  payload.activity.status !== "closed";

function colorFor(key: string): string {
  let hash = 0;
  for (const character of key) {
    hash = (hash * 31 + character.codePointAt(0)!) | 0;
  }
  return CLOUD_COLORS[Math.abs(hash) % CLOUD_COLORS.length];
}

function fontSizeFor(
  item: CloudItem,
  maxCount: number,
  large: boolean,
  itemCount: number,
): number {
  const crowded = itemCount > 60;
  const min = large ? 1.35 : 1;
  const max = large ? (crowded ? 3.5 : 5.5) : crowded ? 2.25 : 3.25;
  if (maxCount <= 1) {
    return min * 1.4;
  }
  const t = Math.sqrt((item.count - 1) / (maxCount - 1));
  return min + t * (max - min);
}

export function CloudLiveResults({
  initial,
  projector,
  endpoint,
}: {
  initial: CloudResultsPayload;
  projector: boolean;
  /** Overrides the attendee results URL, for the projected deck. */
  endpoint?: string;
}) {
  const t = useT();
  const { payload, accessRevoked } = useLiveResults({
    initial,
    url: endpoint ?? `/api/cloud/${initial.activity.id}/results`,
    isActive: cloudIsLive,
    activityId: initial.activity.id,
  });

  if (!payload) {
    return (
      <p role="alert" className="alert alert-warn p-5">
        {accessRevoked ? t("results.accessRevoked") : t("results.unavailable")}
      </p>
    );
  }

  const { activity, mode, items, hiddenIdeas, attendees } = payload;
  const large = projector;
  const closed = activity.status === "closed";
  const maxCount = items.reduce(
    (largest, item) => Math.max(largest, item.count),
    0,
  );

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
            answered={activity.totalIdeas}
            attendees={attendees}
            large={large}
          />
          <span
            className={`text-muted font-bold ${large ? "text-lg" : "text-sm"}`}
          >
            {t(
              activity.totalIdeas === 1 ? "results.ideaOne" : "results.ideas",
              {
                total: activity.totalIdeas,
                unique: activity.uniqueIdeas,
              },
            )}
          </span>
        </div>
        <h1
          className={`font-display text-ink tracking-tight ${
            large
              ? "max-w-[calc(100%-7rem)] text-4xl leading-tight md:text-6xl"
              : "text-2xl md:text-3xl"
          }`}
        >
          {activity.prompt}
        </h1>
      </header>

      {mode === "waiting" ? (
        <section className="card flex flex-col gap-2 p-6">
          <p
            className={`text-ink font-bold ${large ? "text-xl" : "text-base"}`}
          >
            {t("results.ideaIn")}
          </p>
          <p
            className={`text-muted font-semibold ${large ? "text-base" : "text-sm"}`}
          >
            {t("results.watchBigScreen")}
          </p>
        </section>
      ) : items.length === 0 ? (
        <p className="empty">
          {closed ? t("results.noIdeas") : t("results.waitingFirstIdea")}
        </p>
      ) : (
        <ul
          aria-label={t("results.cloudAria")}
          className={`flex flex-wrap content-center items-center justify-center ${
            large
              ? "min-h-[22rem] gap-x-10 gap-y-6"
              : "min-h-[14rem] gap-x-5 gap-y-3"
          }`}
        >
          {items.map((item) => (
            <li
              key={item.key}
              className="font-display max-w-full text-center leading-none"
              style={{
                color: colorFor(item.key),
                fontSize: `${fontSizeFor(item, maxCount, large, items.length)}rem`,
              }}
            >
              {item.label}
              <span className="sr-only">
                {" "}
                {t(
                  item.count === 1
                    ? "results.mentions.one"
                    : "results.mentions.other",
                  { count: item.count },
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {hiddenIdeas > 0 ? (
        <p
          className={`text-muted font-semibold ${large ? "text-lg" : "text-sm"}`}
        >
          {t(hiddenIdeas === 1 ? "results.oneMoreIdea" : "results.moreIdeas", {
            count: hiddenIdeas,
          })}
        </p>
      ) : null}

      <p
        className={`text-muted font-semibold ${large ? "text-base" : "text-xs"}`}
      >
        {t("results.repeatedBigger")}
      </p>
    </section>
  );
}
