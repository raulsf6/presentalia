export const MAX_SLIDES_BYTES = 20 * 1024 * 1024;

export type SlidesValidation = { ok: true } | { ok: false; error: string };

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
    return { ok: false, error: "Slides must be a PDF file." };
  }
  if (file.size > MAX_SLIDES_BYTES) {
    return { ok: false, error: "Slides file is larger than 20 MB." };
  }
  if (file.size < 1) {
    return { ok: false, error: "Slides file is empty." };
  }
  return { ok: true };
}
