"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import {
  addRosterAction,
  importRosterCsvAction,
  type RosterSummary,
} from "@/actions/roster";
import { LoadingDots } from "@/components/LoadingDots";
import { parseCsv, parseEmailList } from "@/lib/talks/roster";

function formatList(items: string[], limit = 5): string {
  const shown = items.slice(0, limit).join(", ");
  const rest = items.length - Math.min(items.length, limit);
  return rest > 0 ? `${shown} … (+${rest} more)` : shown;
}

function Summary({ summary }: { summary: RosterSummary }) {
  if (!summary.ok) {
    return (
      <p role="alert" className="text-red text-sm font-bold">
        {summary.error}
      </p>
    );
  }
  return (
    <div role="status" className="flex flex-col gap-1 text-sm font-semibold">
      {summary.added !== undefined ? (
        <p className="text-green font-bold">
          Added {summary.added} {summary.added === 1 ? "address" : "addresses"}.
        </p>
      ) : null}
      {summary.invalid && summary.invalid.length > 0 ? (
        <p className="text-amberdeep font-bold">
          Couldn&apos;t read: {formatList(summary.invalid)}
        </p>
      ) : null}
      {summary.duplicates && summary.duplicates.length > 0 ? (
        <p className="text-muted">
          Ignored duplicates: {formatList(summary.duplicates)}
        </p>
      ) : null}
      {summary.alreadyPresent && summary.alreadyPresent.length > 0 ? (
        <p className="text-muted">
          Already on the roster: {formatList(summary.alreadyPresent)}
        </p>
      ) : null}
      {summary.inviteFailed && summary.inviteFailed.length > 0 ? (
        <p className="text-amberdeep font-bold">
          Added to the roster, but couldn&apos;t send an invite to:{" "}
          {formatList(summary.inviteFailed)}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The roster's add form: invite addresses by hand or import a CSV. Both paths
 * report what was added, skipped, or already present instead of failing
 * silently.
 */
export function AddPeopleForm({ talkId }: { talkId: string }) {
  const [raw, setRaw] = useState("");
  const [summary, setSummary] = useState<RosterSummary | null>(null);
  const [csvSummary, setCsvSummary] = useState<RosterSummary | null>(null);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [csvTooLarge, setCsvTooLarge] = useState(false);
  const csvInput = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [csvPending, startCsvTransition] = useTransition();

  const preview = useMemo(() => parseEmailList(raw), [raw]);
  const csvPreview = useMemo(() => parseCsv(csvText), [csvText]);

  function onCsvSelected(file: File | undefined) {
    setCsvSummary(null);
    setCsvFileName(file?.name ?? "");
    const tooLarge = Boolean(file && file.size > 1024 * 1024);
    setCsvTooLarge(tooLarge);
    if (!file || tooLarge) {
      setCsvText("");
      return;
    }
    void file.text().then(setCsvText);
  }

  function onAdd() {
    setSummary(null);
    startTransition(async () => {
      const result = await addRosterAction(talkId, raw);
      setSummary(result);
      if (result.ok) {
        setRaw("");
      }
    });
  }

  function onImportCsv() {
    setCsvSummary(null);
    const file = csvInput.current?.files?.[0];
    if (!file) {
      setCsvSummary({ ok: false, error: "Please choose a CSV file." });
      return;
    }
    const formData = new FormData();
    formData.set("csv", file);
    startCsvTransition(async () => {
      const result = await importRosterCsvAction(talkId, formData);
      setCsvSummary(result);
      if (result.ok && csvInput.current) {
        csvInput.current.value = "";
        setCsvFileName("");
        setCsvText("");
        setCsvTooLarge(false);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div>
          <p className="text-ink text-sm font-bold">Invite by email</p>
          <p className="text-muted text-xs font-semibold">
            Invited users always have access to this talk, even when it is
            private.
          </p>
        </div>
        <textarea
          rows={3}
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          placeholder={
            "one@email.com, another@email.com\none per line also works"
          }
          aria-label="Email addresses"
          className="input font-mono"
        />
        {raw.trim().length > 0 ? (
          <div className="text-muted flex flex-col gap-1 text-xs font-semibold">
            <p>
              {preview.valid.length} valid{" "}
              {preview.valid.length === 1 ? "address" : "addresses"} will be
              added
              {preview.duplicates.length > 0
                ? `, ${preview.duplicates.length} duplicate${preview.duplicates.length === 1 ? "" : "s"} ignored`
                : ""}
              .
            </p>
            {preview.invalid.length > 0 ? (
              <p className="text-amberdeep font-bold">
                Couldn&apos;t read: {formatList(preview.invalid)}
              </p>
            ) : null}
          </div>
        ) : null}
        <button
          type="button"
          onClick={onAdd}
          disabled={pending || raw.trim().length === 0}
          className="btn w-fit"
        >
          {pending ? (
            <>
              Adding… <LoadingDots />
            </>
          ) : (
            "Add addresses"
          )}
        </button>
        {summary ? <Summary summary={summary} /> : null}
      </section>

      <section className="border-ink/15 flex flex-col gap-3 border-t-2 border-dashed pt-5">
        <h3 className="section-label">Import CSV</h3>
        <p className="text-muted text-xs font-semibold">
          First column is used, or the column headed &quot;email&quot;. 1 MB
          limit.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={csvInput}
            type="file"
            accept=".csv,text/csv"
            aria-label="CSV file"
            onChange={(event) => onCsvSelected(event.target.files?.[0])}
            className="text-muted file:border-ink file:text-ink file:shadow-hard hover:file:bg-cream2 hover:file:shadow-hard-md focus-visible:outline-ink text-xs font-medium file:mr-3 file:cursor-pointer file:rounded-md file:border-[2.5px] file:bg-white file:px-3.5 file:py-1.5 file:font-sans file:text-xs file:font-bold file:tracking-[0.04em] file:uppercase file:transition file:duration-150 hover:file:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2"
          />
          <button
            type="button"
            onClick={onImportCsv}
            disabled={csvPending || !csvFileName}
            className="btn btn-ghost"
          >
            {csvPending ? (
              <>
                Importing… <LoadingDots />
              </>
            ) : (
              "Import CSV"
            )}
          </button>
        </div>
        {csvTooLarge ? (
          <p role="alert" className="text-red text-sm font-bold">
            That CSV is too large (1 MB limit).
          </p>
        ) : csvFileName && csvText ? (
          <div className="text-muted flex flex-col gap-1 text-xs font-semibold">
            <span className="border-ink/30 text-ink mb-1 flex w-fit items-center gap-1.5 rounded-lg border-[2.5px] border-dashed px-3 py-1.5 font-bold">
              📄 {csvFileName}
            </span>
            <p>
              Preview: {csvPreview.valid.length} valid{" "}
              {csvPreview.valid.length === 1 ? "address" : "addresses"} will be
              added
              {csvPreview.duplicates.length > 0
                ? `, ${csvPreview.duplicates.length} duplicate${csvPreview.duplicates.length === 1 ? "" : "s"} ignored`
                : ""}
              .
            </p>
            {csvPreview.invalid.length > 0 ? (
              <p className="text-amberdeep font-bold">
                Couldn&apos;t read: {formatList(csvPreview.invalid)}
              </p>
            ) : null}
            {csvPreview.duplicates.length > 0 ? (
              <p className="text-muted">
                Duplicate addresses: {formatList(csvPreview.duplicates)}
              </p>
            ) : null}
          </div>
        ) : null}
        {csvSummary ? <Summary summary={csvSummary} /> : null}
      </section>
    </div>
  );
}
