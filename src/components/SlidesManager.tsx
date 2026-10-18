"use client";

import { useRef, useState, useTransition } from "react";

import {
  completeSlidesUploadAction,
  createSlidesUploadAction,
  type SlidesResult,
} from "@/actions/slides";
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

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600">
        {uploadedLabel
          ? `Current slides uploaded ${uploadedLabel}. Uploading again replaces the file attendees download.`
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
          className="text-sm"
        />
        <button
          type="button"
          onClick={onUpload}
          disabled={pending || !selectedName}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending
            ? uploadStep === "preparing"
              ? "Preparing…"
              : uploadStep === "finishing"
                ? "Finishing…"
                : "Uploading…"
            : uploadedLabel
              ? "Replace slides"
              : "Upload slides"}
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        PDF only, up to {Math.round(MAX_SLIDES_BYTES / (1024 * 1024))} MB.
      </p>
      {result ? (
        result.ok ? (
          <p role="status" className="text-sm font-medium text-emerald-700">
            Slides uploaded. Rostered attendees can download them now.
          </p>
        ) : (
          <p role="alert" className="text-sm text-red-600">
            {result.error}
          </p>
        )
      ) : null}
    </div>
  );
}
