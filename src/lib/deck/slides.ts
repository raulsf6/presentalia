import type { ErrorKey, MessageParams } from "@/lib/i18n/dictionaries/en";

export const MAX_SLIDES_BYTES = 20 * 1024 * 1024;

export type SlidesValidation =
  { ok: true } | { ok: false; errorKey: ErrorKey; errorParams?: MessageParams };

/** PDF headers are expected within the first 1 KB of the file. */
export function hasPdfHeader(header: string): boolean {
  return header.slice(0, 1024).includes("%PDF-");
}

/**
 * Validates an uploaded slide file: PDF only (by content type or .pdf
 * extension) and at most 20 MB. Rejected before anything reaches storage.
 */
export function validateSlidesFile(file: {
  name: string;
  type: string;
  size: number;
}): SlidesValidation {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return { ok: false, errorKey: "errors.slides.invalidPdf" };
  }
  if (file.size > MAX_SLIDES_BYTES) {
    return {
      ok: false,
      errorKey: "errors.slides.tooLarge",
      errorParams: { maxMb: Math.round(MAX_SLIDES_BYTES / (1024 * 1024)) },
    };
  }
  if (file.size < 1) {
    return { ok: false, errorKey: "errors.slides.empty" };
  }
  return { ok: true };
}
