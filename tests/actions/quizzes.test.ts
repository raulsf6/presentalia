import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireTalkManager: vi.fn(),
  isRosteredAttendee: vi.fn(),
  getDb: vi.fn(),
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  redirect: vi.fn(),
  clearQuizResultsCache: vi.fn(),
  transaction: vi.fn(),
  inserts: [] as { table: unknown; values: unknown }[],
}));

vi.mock("@/lib/membership", () => ({
  requireTalkManager: mocks.requireTalkManager,
  isRosteredAttendee: mocks.isRosteredAttendee,
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: vi.fn(),
}));

vi.mock("@/lib/quiz-results", () => ({
  clearQuizResultsCache: mocks.clearQuizResultsCache,
}));

vi.mock("@/db", () => ({
  getDb: mocks.getDb,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  updateTag: mocks.updateTag,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import { activities, quizOptions, quizzes } from "@/db/schema";
import { createQuizAction } from "@/actions/quizzes";

function quizForm(options: string[], correctIndex: string | null) {
  const form = new FormData();
  form.set("question", "  Which framework?  ");
  for (const option of options) {
    form.append("options", option);
  }
  if (correctIndex !== null) {
    form.set("correctIndex", correctIndex);
  }
  form.set("resultsIdentifiable", "on");
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.inserts.length = 0;
  mocks.requireTalkManager.mockResolvedValue({
    ok: true,
    user: { id: "presenter-1", email: "presenter@example.com" },
    talk: { id: "talk-1" },
    access: "presenter",
  });
  mocks.redirect.mockReturnValue(undefined);
  mocks.getDb.mockReturnValue({
    transaction: mocks.transaction,
  });
  mocks.transaction.mockImplementation(
    async (
      callback: (tx: {
        insert: (table: unknown) => {
          values: (values: unknown) => {
            returning: () => Promise<{ id: string }[]>;
          };
        };
      }) => Promise<unknown>,
    ) => {
      const tx = {
        insert: (table: unknown) => ({
          values: (values: unknown) => {
            mocks.inserts.push({ table, values });
            return {
              returning: async () => [{ id: "quiz-1" }],
            };
          },
        }),
      };
      return callback(tx);
    },
  );
});

describe("createQuizAction", () => {
  test("creates the activity, quiz, and one correct option atomically", async () => {
    await createQuizAction(
      "talk-1",
      { ok: true },
      quizForm(["A", "B", "C"], "1"),
    );

    expect(mocks.requireTalkManager).toHaveBeenCalledWith("talk-1");
    expect(mocks.inserts[0]).toEqual({
      table: activities,
      values: { talkId: "talk-1", type: "quiz", status: "draft" },
    });
    expect(mocks.inserts[1]).toEqual({
      table: quizzes,
      values: {
        activityId: "quiz-1",
        question: "Which framework?",
        resultsIdentifiable: true,
      },
    });
    expect(mocks.inserts[2]).toEqual({
      table: quizOptions,
      values: [
        { quizId: "quiz-1", label: "A", position: 0, isCorrect: false },
        { quizId: "quiz-1", label: "B", position: 1, isCorrect: true },
        { quizId: "quiz-1", label: "C", position: 2, isCorrect: false },
      ],
    });
    expect(mocks.updateTag).toHaveBeenCalledWith("activities:talk-1");
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/talks/talk-1/activities/quiz-1",
    );
  });

  test("rejects a quiz without a selected correct answer", async () => {
    const result = await createQuizAction(
      "talk-1",
      { ok: true },
      quizForm(["A", "B"], null),
    );

    expect(result).toEqual({
      ok: false,
      error: "Choose the correct answer.",
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  test("rejects duplicate option labels", async () => {
    const result = await createQuizAction(
      "talk-1",
      { ok: true },
      quizForm(["CrewAI", "crewai"], "0"),
    );

    expect(result).toEqual({
      ok: false,
      error: "Answer options must be unique.",
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
