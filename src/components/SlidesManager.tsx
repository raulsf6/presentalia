"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  completeSlidesUploadAction,
  createSlidesUploadAction,
  removeSlidesAction,
  type SlidesResult,
} from "@/actions/slides";
import { LoadingDots } from "@/components/LoadingDots";
import { MAX_SLIDES_BYTES } from "@/lib/slides";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SlidesManager({
  talkId,
  uploadedLabel,
}: {
  talkId: string;
  uploadedLabel: string | null;
}) {
  const [result, setResult] = useState<SlidesResult | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [uploadStep, setUploadStep] = useState<
    "idle" | "preparing" | "uploading" | "finishing"
  >("idle");
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const router = useRouter();

  function onUpload() {
    setResult(null);
    const file = fileInput.current?.files?.[0];
    if (!file) {
      setResult({ ok: false, error: "Choose a PDF file to upload." });
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
          setResult(ticket);
          setUploadStep("idle");
          return;
        }

        setUploadStep("uploading");
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.storage
          .from("talk-slides")
          .uploadToSignedUrl(ticket.path, ticket.token, file, {
            contentType: "application/pdf",
          });
        if (error) {
          setResult({
            ok: false,
            error:
              "Upload failed — please check your connection and try again.",
          });
          setUploadStep("idle");
          return;
        }

        setUploadStep("finishing");
        const completed = await completeSlidesUploadAction(talkId);
        setResult(completed);
        if (completed.ok && fileInput.current) {
          fileInput.current.value = "";
          setSelectedName("");
        }
      } catch {
        setResult({
          ok: false,
          error: "Upload failed — please try again.",
        });
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
        setRemoveError(result.error ?? "Could not remove the slides.");
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
          ? `Current slides uploaded ${uploadedLabel}. Uploading again replaces the file attendees download and clears every activity placed in the deck plan.`
          : "No slides uploaded yet. Attendees see a download button once a PDF is uploaded."}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,.pdf"
          aria-label="Slides PDF"
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
                ? "Preparing…"
                : uploadStep === "finishing"
                  ? "Finishing…"
                  : "Uploading…"}{" "}
              <LoadingDots />
            </>
          ) : uploadedLabel ? (
            "Replace slides"
          ) : (
            "Upload slides"
          )}
        </button>
      </div>
      <p className="text-muted text-xs font-semibold">
        PDF only, up to {Math.round(MAX_SLIDES_BYTES / (1024 * 1024))} MB.
      </p>
      {result ? (
        result.ok ? (
          <p role="status" className="text-green text-sm font-bold">
            Slides uploaded. Rostered attendees can download them now.
          </p>
        ) : (
          <p role="alert" className="text-red text-sm font-bold">
            {result.error}
          </p>
        )
      ) : null}

      {uploadedLabel ? (
        <div className="border-red/25 mt-2 flex flex-col gap-2 border-t-2 border-dashed pt-4">
          {confirmRemove ? (
            <div className="border-red/50 bg-red/5 flex flex-col gap-2 rounded-lg border-[2.5px] p-3">
              <p className="text-red text-sm font-bold">
                Remove the PDF, clear the deck plan, and stop the download for
                attendees?
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
                      Removing… <LoadingDots />
                    </>
                  ) : (
                    "Yes, remove"
                  )}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirmRemove(false)}
                  className="btn btn-ghost btn-small"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="btn btn-red btn-small w-fit"
            >
              Remove slides
            </button>
          )}
          {removeError ? (
            <p role="alert" className="text-red text-sm font-bold">
              {removeError}
            </p>
          ) : null}
        </div>
      ) : removed ? (
        <p role="status" className="text-green text-sm font-bold">
          Slides removed.
        </p>
      ) : null}
    </div>
  );
}
