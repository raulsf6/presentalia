import { describe, expect, test } from "vitest";

import { MAX_SLIDES_BYTES, validateSlidesFile } from "@/lib/deck/slides";

describe("validateSlidesFile", () => {
  test("accepts a file with PDF content type", () => {
    expect(
      validateSlidesFile({
        name: "slides.pdf",
        type: "application/pdf",
        size: 1024,
      }),
    ).toEqual({ ok: true });
  });

  test("accepts a file identified only by its .pdf extension", () => {
    expect(
      validateSlidesFile({ name: "Slides.PDF", type: "", size: 1024 }),
    ).toEqual({ ok: true });
  });

  test("accepts a pdf-named file even when the content type is generic", () => {
    expect(
      validateSlidesFile({
        name: "slides.pdf",
        type: "application/octet-stream",
        size: 1024,
      }),
    ).toEqual({ ok: true });
  });

  test("rejects a non-PDF file", () => {
    expect(
      validateSlidesFile({ name: "slides.txt", type: "text/plain", size: 10 }),
    ).toEqual({ ok: false, error: "Slides must be a PDF file." });
  });

  test("rejects a file with no name and no type", () => {
    expect(validateSlidesFile({ name: "", type: "", size: 10 })).toEqual({
      ok: false,
      error: "Slides must be a PDF file.",
    });
  });

  test("rejects a file larger than 20 MB", () => {
    expect(
      validateSlidesFile({
        name: "slides.pdf",
        type: "application/pdf",
        size: MAX_SLIDES_BYTES + 1,
      }),
    ).toEqual({ ok: false, error: "Slides file is larger than 20 MB." });
  });

  test("accepts a file at exactly the 20 MB limit", () => {
    expect(
      validateSlidesFile({
        name: "slides.pdf",
        type: "application/pdf",
        size: MAX_SLIDES_BYTES,
      }),
    ).toEqual({ ok: true });
  });

  test("rejects an empty file", () => {
    expect(
      validateSlidesFile({
        name: "slides.pdf",
        type: "application/pdf",
        size: 0,
      }),
    ).toEqual({ ok: false, error: "Slides file is empty." });
  });
});
