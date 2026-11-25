"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  completeSlidesUploadAction,
  createSlidesUploadAction,
  removeSlidesAction,
} from "@/actions/slides";
import { useT } from "@/components/I18nProvider";
import { LoadingDots } from "@/components/LoadingDots";
import { MAX_SLIDES_BYTES } from "@/lib/deck/slides";
import { toErrorState, type ErrorState } from "@/lib/i18n/errors";
import { createSupabaseBrowserClient } from "@/lib/platform/supabase/browser";

export function SlidesManager({
  talkId,
  uploadedLabel,
}: {
  talkId: string;
  uploadedLabel: string | null;
}) {
  const t = useT();
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [uploadStep, setUploadStep] = useState<
    "idle" | "preparing" | "uploading" | "finishing"
  >("idle");
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removeError, setRemoveError] = useState<ErrorState | null>(null);
  const [removed, setRemoved] = useState(false);
  const router = useRouter();

  function onUpload() {
    setError(null);
    setUploaded(false);
    const file = fileInput.current?.files?.[0];
    if (!file) {
      setError({ key: "errors.slides.choosePdf" });
      return;
    }
    startTransition(async () => {
      try {
        setUploadStep("preparing");
        const pdfHeader = await file.slice(0, 1024).text();
        const ticket = await createSlidesUploadAction(talkId, {
          name: file.name,
          type: file.type,
          size: file.size,
          pdfHeader,
        });
        if (!ticket.ok) {
          setError(toErrorState(ticket, "errors.slides.prepareFailed"));
          setUploadStep("idle");
          return;
        }

        setUploadStep("uploading");
        const supabase = createSupabaseBrowserClient();
        const { error: uploadError } = await supabase.storage
          .from("talk-slides")
          .uploadToSignedUrl(ticket.path, ticket.token, file, {
            contentType: "application/pdf",
          });
        if (uploadError) {
          setError({ key: "errors.slides.uploadFailed" });
          setUploadStep("idle");
          return;
        }

        setUploadStep("finishing");
        const completed = await completeSlidesUploadAction(talkId);
        if (!completed.ok) {
          setError(toErrorState(completed, "errors.slides.uploadIncomplete"));
        } else {
          setUploaded(true);
          if (fileInput.current) {
            fileInput.current.value = "";
            setSelectedName("");
          }
        }
      } catch {
        setError({ key: "errors.slides.uploadFailedRetry" });
      } finally {
        setUploadStep("idle");
      }
    });
  }

  function onRemove() {
    setRemoveError(null);
    startTransition(async () => {
      const result = await removeSlidesAction(talkId);
      if (!result.ok) {
        setRemoveError(toErrorState(result, "errors.slides.removeFailed"));
        return;
      }
      setConfirmRemove(false);
      setRemoved(true);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink/75 text-sm font-semibold">
        {uploadedLabel
          ? t("slides.currentSlides", { date: uploadedLabel })
          : t("slides.noneUploaded")}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,.pdf"
          aria-label={t("slides.slidesPdf")}
          onChange={(event) =>
            setSelectedName(event.target.files?.[0]?.name ?? "")
          }
          className="text-muted file:border-ink file:text-ink file:shadow-hard hover:file:bg-cream2 hover:file:shadow-hard-md focus-visible:outline-ink text-xs font-medium file:mr-3 file:cursor-pointer file:rounded-md file:border-[2.5px] file:bg-white file:px-3.5 file:py-1.5 file:font-sans file:text-xs file:font-bold file:tracking-[0.04em] file:uppercase file:transition file:duration-150 hover:file:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2"
        />
        <button
          type="button"
          onClick={onUpload}
          disabled={pending || !selectedName}
          className="btn"
        >
          {pending ? (
            <>
              {uploadStep === "preparing"
                ? t("slides.preparing")
                : uploadStep === "finishing"
                  ? t("slides.finishing")
                  : t("slides.uploading")}{" "}
              <LoadingDots />
            </>
          ) : uploadedLabel ? (
            t("slides.replace")
          ) : (
            t("slides.upload")
          )}
        </button>
      </div>
      <p className="text-muted text-xs font-semibold">
        {t("slides.pdfLimit", {
          max: Math.round(MAX_SLIDES_BYTES / (1024 * 1024)),
        })}
      </p>
      {uploaded ? (
        <p role="status" className="text-green text-sm font-bold">
          {t("slides.uploaded")}
        </p>
      ) : error ? (
        <p role="alert" className="text-red text-sm font-bold">
          {t(error.key, error.params)}
        </p>
      ) : null}

      {uploadedLabel ? (
        <div className="border-red/25 mt-2 flex flex-col gap-2 border-t-2 border-dashed pt-4">
          {confirmRemove ? (
            <div className="border-red/50 bg-red/5 flex flex-col gap-2 rounded-lg border-[2.5px] p-3">
              <p className="text-red text-sm font-bold">
                {t("slides.removeConfirm")}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={onRemove}
                  className="btn btn-red btn-small"
                >
                  {pending ? (
                    <>
                      {t("slides.removing")} <LoadingDots />
                    </>
                  ) : (
                    t("slides.yesRemove")
                  )}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirmRemove(false)}
                  className="btn btn-ghost btn-small"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="btn btn-red btn-small w-fit"
            >
              {t("slides.removeSlides")}
            </button>
          )}
          {removeError ? (
            <p role="alert" className="text-red text-sm font-bold">
              {t(removeError.key, removeError.params)}
            </p>
          ) : null}
        </div>
      ) : removed ? (
        <p role="status" className="text-green text-sm font-bold">
          {t("slides.removed")}
        </p>
      ) : null}
    </div>
  );
}
