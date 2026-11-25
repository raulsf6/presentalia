"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  publishTextUnrankedAction,
  rankTextActivityAction,
} from "@/actions/text";
import { useI18n } from "@/components/I18nProvider";
import { LoadingDots } from "@/components/LoadingDots";
import { RANKED_ANSWER_LIMIT } from "@/lib/activities/text-activity";
import { toErrorState, type ErrorState } from "@/lib/i18n/errors";

type Mode = "rank" | "unranked";

export function TextActivityControls({
  activityId,
  status,
  runStatus,
  answerCount,
}: {
  activityId: string;
  status: "active" | "locked";
  runStatus: "running" | "succeeded" | "failed" | null;
  answerCount: number;
}) {
  const { t, locale } = useI18n();
  const [confirming, setConfirming] = useState<Mode | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const ranking = runStatus === "running";
  const overCap = answerCount > RANKED_ANSWER_LIMIT;
  const empty = answerCount === 0;
  const label =
    status === "locked"
      ? t("text.controls.retryRanking")
      : t("text.controls.rankClose");

  function run(mode: Mode) {
    setError(null);
    startTransition(async () => {
      const result =
        mode === "rank"
          ? await rankTextActivityAction(activityId, locale)
          : await publishTextUnrankedAction(activityId);
      if (!result.ok) {
        setError(toErrorState(result, "errors.activity.updateFailed"));
        return;
      }
      setConfirming(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending || ranking || overCap || empty}
          onClick={() => setConfirming("rank")}
          className="btn btn-green btn-small"
        >
          {pending && confirming === "rank" ? (
            <>
              {t("text.controls.ranking")} <LoadingDots />
            </>
          ) : (
            `${label}…`
          )}
        </button>
        <button
          type="button"
          disabled={pending || ranking}
          onClick={() => setConfirming("unranked")}
          className="btn btn-ghost btn-small"
        >
          {pending && confirming === "unranked"
            ? t("text.controls.closing")
            : t("text.controls.closeNoRank")}
        </button>
        <span className="text-muted text-xs font-semibold">
          {t(
            answerCount === 1
              ? "text.controls.answerCount.one"
              : "text.controls.answerCount.other",
            { count: answerCount },
          )}
        </span>
      </div>

      {overCap ? (
        <p className="text-amberdeep text-xs font-semibold">
          {t("text.controls.overCap", {
            count: answerCount,
            limit: RANKED_ANSWER_LIMIT,
          })}
        </p>
      ) : null}

      {empty ? (
        <p className="text-muted text-xs font-semibold">
          {t("text.controls.noAnswers")}
        </p>
      ) : null}

      {ranking ? (
        <p className="text-muted text-xs font-semibold">
          {t("text.controls.rankingProgress")}
        </p>
      ) : null}

      {confirming ? (
        <div className="border-amber bg-ambersoft flex flex-col gap-3 rounded-lg border-[2.5px] p-4">
          <p className="text-amberdeep text-sm font-bold">
            {confirming === "rank"
              ? status === "locked"
                ? t("text.controls.retryPrompt", { count: answerCount })
                : t("text.controls.rankPrompt", { count: answerCount })
              : t("text.controls.unrankedPrompt", { count: answerCount })}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(confirming)}
              className="btn btn-small"
            >
              {pending ? (
                <>
                  {confirming === "rank"
                    ? t("text.controls.ranking")
                    : t("text.controls.closing")}{" "}
                  <LoadingDots />
                </>
              ) : confirming === "rank" ? (
                t("text.controls.yesRank")
              ) : (
                t("text.controls.yesUnranked")
              )}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(null)}
              className="btn btn-ghost btn-small"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-red text-sm font-bold">
          {t(error.key, error.params)}
        </p>
      ) : null}
    </div>
  );
}
