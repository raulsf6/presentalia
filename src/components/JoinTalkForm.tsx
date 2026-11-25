"use client";

import { useActionState } from "react";

import {
  joinPublicTalkAction,
  type AnonymousAccessResult,
} from "@/actions/anonymous-access";
import { useT } from "@/components/I18nProvider";
import { LoadingDots } from "@/components/LoadingDots";

const initial: AnonymousAccessResult = { ok: true };

export function JoinTalkForm({ talkId }: { talkId: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    joinPublicTalkAction.bind(null, talkId),
    initial,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-ink text-sm font-bold">
          {t("join.nameLabel")} <span className="text-red">*</span>
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          minLength={2}
          maxLength={32}
          autoComplete="nickname"
          autoCapitalize="words"
          placeholder={t("join.namePlaceholder")}
          className="input"
          aria-describedby="username-hint"
        />
        <p id="username-hint" className="text-muted text-xs font-semibold">
          {t("join.nameHint")}
        </p>
      </div>
      {!state.ok && state.errorKey ? (
        <p role="alert" className="text-red text-sm font-bold">
          {t(state.errorKey, state.errorParams)}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="btn w-fit">
        {pending ? (
          <>
            {t("join.joining")} <LoadingDots />
          </>
        ) : (
          t("join.join")
        )}
      </button>
    </form>
  );
}
