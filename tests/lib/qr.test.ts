import { describe, expect, test } from "vitest";

import { renderQrSvg } from "@/lib/qr";

describe("renderQrSvg", () => {
  test("renders the join URL as an inline SVG", async () => {
    const svg = await renderQrSvg("https://example.com/join/talk-1");

    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg.length).toBeGreaterThan(500);
  });

  test("rejects an empty value", async () => {
    await expect(renderQrSvg("")).rejects.toThrow();
  });
});
