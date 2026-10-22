import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireTalkManager: vi.fn(),
  saveDeckPlan: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/membership", () => ({
  requireTalkManager: mocks.requireTalkManager,
}));
vi.mock("@/lib/deck-plan", () => ({
  saveDeckPlan: mocks.saveDeckPlan,
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { saveDeckPlanAction } from "@/actions/deck";

const plan = {
  pageCount: 9,
  placements: [{ activityId: "activity-1", afterSlide: 3 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireTalkManager.mockResolvedValue({
    ok: true,
    user: { id: "presenter-1", email: "presenter@example.com" },
    talk: { id: "talk-1" },
    access: "presenter",
  });
  mocks.saveDeckPlan.mockResolvedValue({ ok: true });
});

describe("saveDeckPlanAction", () => {
  test("refuses a caller who cannot manage the talk", async () => {
    mocks.requireTalkManager.mockResolvedValue({
      ok: false,
      error: "You can't manage this talk.",
    });

    const result = await saveDeckPlanAction("talk-1", plan);

    expect(result).toEqual({
      ok: false,
      error: "You can't manage this talk.",
    });
    expect(mocks.saveDeckPlan).not.toHaveBeenCalled();
  });

  test("saves the plan and revalidates both pages", async () => {
    const result = await saveDeckPlanAction("talk-1", plan);

    expect(result).toEqual({ ok: true });
    expect(mocks.saveDeckPlan).toHaveBeenCalledWith("talk-1", plan);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/talks/talk-1/slides");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/talks/talk-1");
  });

  test("does not revalidate when the save is rejected", async () => {
    mocks.saveDeckPlan.mockResolvedValue({
      ok: false,
      error: "Only ready activities can be placed in the deck.",
    });

    const result = await saveDeckPlanAction("talk-1", plan);

    expect(result).toMatchObject({ ok: false });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
