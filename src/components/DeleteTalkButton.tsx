"use client";

import { useState, useTransition } from "react";

import { deleteTalkAction } from "@/actions/talks";
import { useT } from "@/components/I18nProvider";
import { LoadingDots } from "@/components/LoadingDots";
import { toErrorState, type ErrorState } from "@/lib/i18n/errors";

export function DeleteTalkButton({
  talkId,
  talkName,
}: {
  talkId: string;
  talkName: string;
}) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="btn btn-danger"
      >
        {t("talk.deleteButton")}
      </button>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-label={t("talk.deleteAria")}
      className="border-red bg-redsoft flex flex-col gap-3 rounded-lg border-[2.5px] p-4"
    >
      <p className="text-reddeep text-sm font-bold">
        {t("talk.deleteConfirm", { name: talkName })}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteTalkAction(talkId);
              if (!result.ok) {
                setError(toErrorState(result, "errors.generic.delete"));
              }
            })
          }
          className="btn btn-red btn-small"
        >
          {pending ? (
            <>
              {t("talk.deleting")} <LoadingDots />
            </>
          ) : (
            t("talk.deleteYes")
          )}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          className="btn btn-ghost btn-small"
        >
          {t("common.cancel")}
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-red text-sm font-bold">
          {t(error.key, error.params)}
        </p>
      ) : null}
    </div>
  );
}
