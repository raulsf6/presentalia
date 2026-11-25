"use client";

import { useActionState } from "react";

import {
  createCloudActivityAction,
  type CloudActionResult,
} from "@/actions/cloud";
import { useT } from "@/components/I18nProvider";
import { LoadingDots } from "@/components/LoadingDots";
import { CLOUD_PROMPT_MAX_LENGTH } from "@/lib/activities/cloud-activity";

const initial: CloudActionResult = { ok: true };

export function CloudForm({ talkId }: { talkId: string }) {
  const t = useT();
  const action = createCloudActivityAction.bind(null, talkId);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="prompt" className="text-ink text-sm font-bold">
          {t("cloud.questionLabel")}
        </label>
        <textarea
          id="prompt"
          name="prompt"
          required
          maxLength={CLOUD_PROMPT_MAX_LENGTH}
          rows={2}
          placeholder={t("cloud.questionPlaceholder")}
          className="input"
        />
      </div>

      <div className="border-ink/15 bg-cream2 rounded-lg border-[2.5px] p-3">
        <p className="text-ink text-xs font-semibold">{t("cloud.how")}</p>
      </div>

      {!state.ok ? (
        <p role="alert" className="text-red text-sm font-bold">
          {t(state.errorKey, state.errorParams)}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="btn w-fit">
        {pending ? (
          <>
            {t("form.creating")} <LoadingDots />
          </>
        ) : (
          t("cloud.create")
        )}
      </button>
    </form>
  );
}
