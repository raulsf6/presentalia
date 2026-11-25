"use client";

import { useActionState } from "react";

import { requestMagicLinkAction, type MagicLinkState } from "@/actions/auth";
import { useT } from "@/components/I18nProvider";
import { LoadingDots } from "@/components/LoadingDots";

const initial: MagicLinkState = { ok: false };

export function MagicLinkForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    requestMagicLinkAction,
    initial,
  );

  if (state.ok) {
    return (
      <div role="status" className="alert alert-ok">
        <p className="font-bold">{t("login.sentTitle")}</p>
        <p className="mt-1 font-semibold">{t("login.sentDetail")}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-ink text-sm font-bold">
          {t("login.emailLabel")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t("login.emailPlaceholder")}
          className="input"
        />
      </div>
      <button type="submit" disabled={pending} className="btn w-full">
        {pending ? (
          <>
            {t("login.sending")} <LoadingDots />
          </>
        ) : (
          <>{t("login.send")}</>
        )}
      </button>
      {!state.ok && state.errorKey ? (
        <p role="alert" className="text-red text-sm font-bold">
          {t(state.errorKey, state.errorParams)}
        </p>
      ) : null}
    </form>
  );
}
