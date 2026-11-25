"use client";

import { useActionState } from "react";

import {
  createTextActivityAction,
  type TextActionResult,
} from "@/actions/text";
import { useT } from "@/components/I18nProvider";
import { LoadingDots } from "@/components/LoadingDots";

const initial: TextActionResult = { ok: true };

export function TextForm({ talkId }: { talkId: string }) {
  const t = useT();
  const action = createTextActivityAction.bind(null, talkId);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="prompt" className="text-ink text-sm font-bold">
          {t("text.promptLabel")}
        </label>
        <textarea
          id="prompt"
          name="prompt"
          required
          maxLength={500}
          rows={2}
          placeholder={t("text.promptPlaceholder")}
          className="input"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="criteria" className="text-ink text-sm font-bold">
          {t("text.criteriaLabel")}
        </label>
        <textarea
          id="criteria"
          name="criteria"
          required
          maxLength={500}
          rows={2}
          placeholder={t("text.criteriaPlaceholder")}
          className="input"
        />
        <p className="text-muted text-xs font-semibold">
          {t("text.criteriaHint")}
        </p>
      </div>

      <div className="border-amber bg-ambersoft rounded-lg border-[2.5px] p-3">
        <p className="text-amberdeep text-xs font-semibold">
          {t("text.aiNotice")}
        </p>
      </div>

      <label className="border-ink bg-cream flex cursor-pointer items-start gap-3 rounded-xl border-2 px-3.5 py-3">
        <input
          type="checkbox"
          name="resultsIdentifiable"
          className="accent-coral mt-0.5 size-4"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-ink text-sm font-bold">
            {t("text.identifiableTitle")}
          </span>
          <span className="text-muted text-xs font-semibold">
            {t("text.identifiableDetail")}
          </span>
        </span>
      </label>

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
          t("text.create")
        )}
      </button>
    </form>
  );
}
