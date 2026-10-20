export const PROMPT_MAX_LENGTH = 500;
export const CRITERIA_MAX_LENGTH = 500;
export const ANSWER_MAX_LENGTH = 500;

/** Above this, a single ranking call is refused; publish unranked instead. */
export const RANKED_ANSWER_LIMIT = 100;

/** Written by the GDPR write guard when an Auth user is deleted. */
export const REMOVED_ANSWER_BODY = "[answer removed]";

export type ValidTextActivityInput = {
  ok: true;
  prompt: string;
  criteria: string;
  resultsIdentifiable: boolean;
};

export type InvalidTextActivityInput = { ok: false; error: string };

export function validateTextActivityInput(input: {
  prompt: string;
  criteria: string;
  resultsIdentifiable?: boolean;
}): ValidTextActivityInput | InvalidTextActivityInput {
  const prompt = input.prompt.trim();
  if (prompt.length < 1 || prompt.length > PROMPT_MAX_LENGTH) {
    return { ok: false, error: "A text prompt needs a question." };
  }
  const criteria = input.criteria.trim();
  if (criteria.length < 1 || criteria.length > CRITERIA_MAX_LENGTH) {
    return { ok: false, error: "Add a criterion for ranking the answers." };
  }
  return {
    ok: true,
    prompt,
    criteria,
    resultsIdentifiable: input.resultsIdentifiable ?? false,
  };
}

export type ValidTextAnswer = { ok: true; body: string };
export type InvalidTextAnswer = { ok: false; error: string };

export function validateTextAnswer(raw: string): ValidTextAnswer | InvalidTextAnswer {
  const body = raw.trim();
  if (body.length < 1) {
    return { ok: false, error: "Write an answer first." };
  }
  if (body.length > ANSWER_MAX_LENGTH) {
    return {
      ok: false,
      error: `Answers can be at most ${ANSWER_MAX_LENGTH} characters.`,
    };
  }
  return { ok: true, body };
}

export function isRemovedAnswer(body: string): boolean {
  return body === REMOVED_ANSWER_BODY;
}
