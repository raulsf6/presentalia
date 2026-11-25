"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  closeActivityAction,
  launchActivityAction,
} from "@/actions/activities";
import { useT } from "@/components/I18nProvider";
import { LoadingDots } from "@/components/LoadingDots";
import type { MessageKey } from "@/lib/i18n/dictionaries/en";
import { toErrorState, type ErrorState } from "@/lib/i18n/errors";

const TYPE_KEYS = {
  poll: "activity.type.poll",
  quiz: "activity.type.quiz",
  text: "activity.type.text",
  cloud: "activity.type.cloud",
} as const satisfies Record<string, MessageKey>;

const CLOSED_KEYS = {
  poll: "activity.closed.poll",
  quiz: "activity.closed.quiz",
  text: "activity.closed.text",
  cloud: "activity.closed.cloud",
} as const satisfies Record<string, MessageKey>;

const LAUNCH_PROMPT_KEYS = {
  poll: "activity.launchPrompt.poll",
  quiz: "activity.launchPrompt.quiz",
  text: "activity.launchPrompt.text",
  cloud: "activity.launchPrompt.cloud",
} as const satisfies Record<string, MessageKey>;

const CLOSE_PROMPT_KEYS = {
  poll: "activity.closePrompt.poll",
  quiz: "activity.closePrompt.quiz",
  text: "activity.closePrompt.text",
  cloud: "activity.closePrompt.cloud",
} as const satisfies Record<string, MessageKey>;

const CLOSE_YES_KEYS = {
  poll: "activity.closeYes.poll",
  quiz: "activity.closeYes.quiz",
  text: "activity.closeYes.text",
  cloud: "activity.closeYes.cloud",
} as const satisfies Record<string, MessageKey>;

export function ActivityAdminControls({
  activityId,
  kind,
  status,
  launchBlockedReason,
}: {
  activityId: string;
  kind: "poll" | "quiz" | "text" | "cloud";
  status: "ready" | "active" | "closed";
  /** When set on a ready activity, launching is unavailable and this explains why. */
  launchBlockedReason?: string | null;
}) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const typeLabel = t(TYPE_KEYS[kind]);

  const action =
    status === "ready" ? launchActivityAction : closeActivityAction;

  function runAction() {
    setError(null);
    startTransition(async () => {
      const result = await action(activityId);
      if (!result.ok) {
        setError(toErrorState(result, "errors.activity.updateFailed"));
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  if (status === "closed") {
    return (
      <p className="text-muted text-sm font-semibold">{t(CLOSED_KEYS[kind])}</p>
    );
  }

  if (launchBlockedReason && status === "ready") {
    return (
      <div className="flex flex-col gap-2">
        <button type="button" disabled className="btn w-fit">
          {t("activity.launch.button", { type: typeLabel })}
        </button>
        <p className="text-muted text-xs font-semibold">
          {launchBlockedReason}
        </p>
      </div>
    );
  }

  const launch = status === "ready";
  const prompt = launch
    ? t(LAUNCH_PROMPT_KEYS[kind])
    : t(CLOSE_PROMPT_KEYS[kind]);

  return (
    <div className="flex flex-col gap-3">
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={`btn w-fit ${launch ? "btn-green" : "btn-ink"}`}
        >
          {launch
            ? t("activity.launch.button", { type: typeLabel })
            : t("activity.close.button", { type: typeLabel })}
        </button>
      ) : (
        <div className="border-amber bg-ambersoft flex flex-col gap-3 rounded-lg border-[2.5px] p-4">
          <p className="text-amberdeep text-sm font-bold">{prompt}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={runAction}
              className={`btn btn-small ${launch ? "btn-green" : "btn-ink"}`}
            >
              {pending ? (
                <>
                  {launch ? t("activity.launching") : t("activity.closing")}{" "}
                  <LoadingDots />
                </>
              ) : launch ? (
                t("activity.launchYes", { type: typeLabel })
              ) : (
                t(CLOSE_YES_KEYS[kind])
              )}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="btn btn-ghost btn-small"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-red text-sm font-bold">
          {t(error.key, error.params)}
        </p>
      ) : null}
    </div>
  );
}
