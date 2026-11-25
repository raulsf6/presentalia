"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { submitCloudAnswerAction } from "@/actions/cloud";
import { useT } from "@/components/I18nProvider";
import {
  CLOUD_IDEA_MAX_LENGTH,
  CLOUD_IDEA_MAX_WORDS,
} from "@/lib/activities/cloud-activity";
import { toErrorState, type ErrorState } from "@/lib/i18n/errors";

export function CloudAnswerForm({ activityId }: { activityId: string }) {
  const t = useT();
  const [body, setBody] = useState("");
  const [error, setError] = useState<ErrorState | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await submitCloudAnswerAction(activityId, body);
      if (!result.ok) {
        setError(toErrorState(result, "errors.cloud.notAccepting"));
        return;
      }
      if (!result.talkId) {
        router.refresh();
        return;
      }
      router.push(`/talks/${result.talkId}/activities/${activityId}/results`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="idea" className="text-ink text-sm font-bold">
          {t("cloud.answerLabel")}
        </label>
        <input
          id="idea"
          name="idea"
          type="text"
          required
          maxLength={CLOUD_IDEA_MAX_LENGTH}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t("cloud.answerPlaceholder")}
          className="input"
          autoComplete="off"
        />
        <p className="text-muted text-xs font-semibold">
          {t("cloud.limits", { count: CLOUD_IDEA_MAX_WORDS })}
        </p>
      </div>

      <p className="text-muted text-xs font-medium">{t("cloud.final")}</p>

      <button
        type="submit"
        disabled={!body.trim() || pending}
        className="btn w-fit"
      >
        {pending ? t("cloud.sending") : t("cloud.send")}
      </button>
      {error ? (
        <p role="alert" className="text-red text-sm font-bold">
          {t(error.key, error.params)}
        </p>
      ) : null}
    </form>
  );
}
