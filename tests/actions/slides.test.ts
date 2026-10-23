import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireTalkManager: vi.fn(),
  clearSlides: vi.fn(),
  remove: vi.fn(),
  from: vi.fn(),
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("@/lib/talks/membership", () => ({
  requireTalkManager: mocks.requireTalkManager,
}));
vi.mock("@/lib/deck/slide-state", () => ({
  clearSlides: mocks.clearSlides,
  markSlidesUploaded: vi.fn(),
}));
vi.mock("@/lib/platform/supabase/service", () => ({
  createSupabaseServiceClient: () => ({
    storage: { from: mocks.from },
  }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  updateTag: mocks.updateTag,
}));

import { removeSlidesAction } from "@/actions/slides";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireTalkManager.mockResolvedValue({
    ok: true,
    user: { id: "presenter-1", email: "presenter@example.com" },
    talk: { id: "talk-1" },
    access: "presenter",
  });
  mocks.from.mockReturnValue({ remove: mocks.remove });
  mocks.remove.mockResolvedValue({ data: [], error: null });
  mocks.clearSlides.mockResolvedValue(true);
});

describe("removeSlidesAction", () => {
  test("refuses a caller who cannot manage the talk", async () => {
    mocks.requireTalkManager.mockResolvedValue({
      ok: false,
      error: "You can't manage this talk.",
    });

    const result = await removeSlidesAction("talk-1");

    expect(result).toMatchObject({ ok: false });
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.clearSlides).not.toHaveBeenCalled();
  });

  test("removes the stored PDF and clears the plan", async () => {
    const result = await removeSlidesAction("talk-1");

    expect(result).toEqual({ ok: true });
    expect(mocks.from).toHaveBeenCalledWith("talk-slides");
    expect(mocks.remove).toHaveBeenCalledWith(["talk-1/slides.pdf"]);
    expect(mocks.clearSlides).toHaveBeenCalledWith("talk-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/talks/talk-1/slides");
  });

  test("keeps the talk intact when storage refuses", async () => {
    mocks.remove.mockResolvedValue({
      data: null,
      error: { message: "storage down" },
    });

    const result = await removeSlidesAction("talk-1");

    expect(result).toMatchObject({ ok: false });
    expect(mocks.clearSlides).not.toHaveBeenCalled();
  });

  test("reports a talk that vanished between the guard and the write", async () => {
    mocks.clearSlides.mockResolvedValue(false);

    const result = await removeSlidesAction("talk-1");

    expect(result).toEqual({ ok: false, error: "Talk not found." });
  });
});
