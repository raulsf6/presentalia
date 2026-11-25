"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { setAnonymousJoinOpenAction } from "@/actions/anonymous-access";
import { useT } from "@/components/I18nProvider";
import { toErrorState, type ErrorState } from "@/lib/i18n/errors";

export function AnonymousJoinToggle({
  talkId,
  joinOpen,
}: {
  talkId: string;
  joinOpen: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);

  async function toggle() {
    setError(null);
    setPending(true);
    try {
      const result = await setAnonymousJoinOpenAction(talkId, !joinOpen);
      if (!result.ok) {
        setError(toErrorState(result, "errors.generic.save"));
      } else {
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="btn btn-ghost btn-small"
        disabled={pending}
        onClick={toggle}
      >
        {joinOpen ? t("privacy.closeJoining") : t("privacy.openJoining")}
      </button>
      {error ? (
        <p role="alert" className="text-red text-sm font-bold">
          {t(error.key, error.params)}
        </p>
      ) : null}
    </div>
  );
}
