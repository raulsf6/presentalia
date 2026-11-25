"use client";

import { useActionState } from "react";

import { createTalkAction, type ActionResult } from "@/actions/talks";
import { useT } from "@/components/I18nProvider";
import { LoadingDots } from "@/components/LoadingDots";

const initial: ActionResult = { ok: true };

export function CreateTalkForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    createTalkAction,
    initial,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-ink text-sm font-bold">
          {t("createTalk.nameLabel")} <span className="text-red">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={200}
          placeholder={t("createTalk.namePlaceholder")}
          className="input"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="heldAt" className="text-ink text-sm font-bold">
          {t("createTalk.dateLabel")}{" "}
          <span className="text-muted text-xs font-semibold">
            {t("createTalk.optional")}
          </span>
        </label>
        <input id="heldAt" name="heldAt" type="date" className="input" />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="description" className="text-ink text-sm font-bold">
          {t("createTalk.descriptionLabel")}{" "}
          <span className="text-muted text-xs font-semibold">
            {t("createTalk.optional")}
          </span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder={t("createTalk.descriptionPlaceholder")}
          className="input"
        />
      </div>
      <label className="border-ink bg-cream flex cursor-pointer items-start gap-3 rounded-xl border-2 px-3.5 py-3">
        <input
          type="checkbox"
          name="isPublic"
          className="accent-coral mt-0.5 size-4"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-ink text-sm font-bold">
            {t("createTalk.publicTitle")}
          </span>
          <span className="text-muted text-xs font-semibold">
            {t("createTalk.publicDetail")}
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
            {t("createTalk.creating")} <LoadingDots />
          </>
        ) : (
          t("createTalk.create")
        )}
      </button>
    </form>
  );
}
