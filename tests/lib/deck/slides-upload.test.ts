import { describe, expect, test, vi } from "vitest";

import { createSlidesUploadTicket } from "@/lib/deck/slides-upload";

describe("createSlidesUploadTicket", () => {
  test("does not request a storage token for invalid file metadata", async () => {
    const createSignedUploadUrl = vi.fn();
    const result = await createSlidesUploadTicket(
      "talk-1",
      {
        name: "notes.txt",
        type: "text/plain",
        size: 20,
        pdfHeader: "not a pdf",
      },
      createSignedUploadUrl,
    );

    expect(result).toEqual({
      ok: false,
      error: "Slides must be a PDF file.",
    });
    expect(createSignedUploadUrl).not.toHaveBeenCalled();
  });

  test("requests an upsert token for the talk's single slides path", async () => {
    const createSignedUploadUrl = vi.fn(async (path: string) => ({
      path,
      token: "signed-token",
    }));
    const result = await createSlidesUploadTicket(
      "talk-1",
      {
        name: "slides.pdf",
        type: "application/pdf",
        size: 1024,
        pdfHeader: "%PDF-1.7",
      },
      createSignedUploadUrl,
    );

    expect(createSignedUploadUrl).toHaveBeenCalledWith("talk-1/slides.pdf", {
      upsert: true,
    });
    expect(result).toEqual({
      ok: true,
      path: "talk-1/slides.pdf",
      token: "signed-token",
    });
  });

  test("rejects a non-PDF renamed to .pdf before requesting storage access", async () => {
    const createSignedUploadUrl = vi.fn();
    const result = await createSlidesUploadTicket(
      "talk-1",
      {
        name: "slides.pdf",
        type: "application/pdf",
        size: 1024,
        pdfHeader: "plain text",
      },
      createSignedUploadUrl,
    );

    expect(result).toEqual({
      ok: false,
      error: "Slides must be a valid PDF file.",
    });
    expect(createSignedUploadUrl).not.toHaveBeenCalled();
  });

  test("returns a safe error when Supabase cannot issue a token", async () => {
    const result = await createSlidesUploadTicket(
      "talk-1",
      {
        name: "slides.pdf",
        type: "application/pdf",
        size: 1024,
        pdfHeader: "%PDF-1.7",
      },
      async () => null,
    );

    expect(result).toEqual({
      ok: false,
      error: "Could not prepare the upload. Please try again.",
    });
  });
});
