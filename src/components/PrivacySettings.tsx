"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  setAnonymousJoinOpenAction,
  setTalkPublicAction,
} from "@/actions/anonymous-access";
import { useT } from "@/components/I18nProvider";
import {
  toErrorState,
  type ActionFailure,
  type ErrorState,
} from "@/lib/i18n/errors";

type Props = {
  talkId: string;
  isPublic: boolean;
  joinOpen: boolean;
  joinUrl: string;
};

/**
 * The talk's access settings: whether anonymous people may join, and the link
 * they use. Invited users keep access either way.
 */
export function PrivacySettings({
  talkId,
  isPublic,
  joinOpen,
  joinUrl,
}: Props) {
  const t = useT();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);

  async function run(action: () => Promise<{ ok: true } | ActionFailure>) {
    setError(null);
    setPending(true);
    try {
      const result = await action();
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-ink text-sm font-bold">
            {t("privacy.publicTitle")}
          </p>
          <p className="text-muted text-xs font-semibold">
            {isPublic
              ? t("privacy.publicDetailOn")
              : t("privacy.publicDetailOff")}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-small"
          disabled={pending}
          onClick={() => run(() => setTalkPublicAction(talkId, !isPublic))}
        >
          {isPublic ? t("privacy.makePrivate") : t("privacy.makePublic")}
        </button>
      </div>

      {isPublic ? (
        <div className="border-ink/10 flex flex-col gap-3 border-t-2 border-dashed pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-ink text-sm font-bold">
                {t("privacy.anonymousTitle")}
              </p>
              <p className="text-muted text-xs font-semibold">
                {joinOpen
                  ? t("privacy.anonymousOpen")
                  : t("privacy.anonymousClosed")}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              disabled={pending}
              onClick={() =>
                run(() => setAnonymousJoinOpenAction(talkId, !joinOpen))
              }
            >
              {joinOpen ? t("privacy.closeJoining") : t("privacy.openJoining")}
            </button>
          </div>
          <div className="flex flex-col gap-1">
            <span className="section-label">{t("privacy.joinLink")}</span>
            <code className="text-ink/80 bg-cream2 overflow-x-auto rounded-md px-3 py-2 text-xs font-semibold">
              {joinUrl}
            </code>
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
