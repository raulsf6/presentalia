import { hasPdfHeader, validateSlidesFile } from "@/lib/deck/slides";

export type SlidesUploadTicket =
  { ok: true; path: string; token: string } | { ok: false; error: string };

export type CreateSignedSlidesUrl = (
  path: string,
  options: { upsert: true },
) => Promise<{ path: string; token: string } | null>;

/**
 * Validates metadata before asking Supabase for a time-limited upload token.
 * The actual file is uploaded directly from the browser to private Storage,
 * avoiding Vercel function body limits; the bucket also enforces PDF/20 MB.
 */
export async function createSlidesUploadTicket(
  talkId: string,
  file: { name: string; type: string; size: number; pdfHeader: string },
  createSignedUploadUrl: CreateSignedSlidesUrl,
): Promise<SlidesUploadTicket> {
  const validation = validateSlidesFile(file);
  if (!validation.ok) {
    return validation;
  }
  if (!hasPdfHeader(file.pdfHeader)) {
    return { ok: false, error: "Slides must be a valid PDF file." };
  }

  const path = `${talkId}/slides.pdf`;
  const ticket = await createSignedUploadUrl(path, { upsert: true });
  if (!ticket) {
    return {
      ok: false,
      error: "Could not prepare the upload. Please try again.",
    };
  }
  return { ok: true, path: ticket.path, token: ticket.token };
}
