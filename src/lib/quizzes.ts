const QUESTION_MAX_LENGTH = 500;
const QUESTION_MIN_LENGTH = 1;
const OPTION_LABEL_MAX_LENGTH = 200;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 8;

export type ValidQuizInput = {
  ok: true;
  question: string;
  options: string[];
  correctIndex: number;
  resultsIdentifiable: boolean;
};

export type InvalidQuizInput = { ok: false; error: string };

export function validateQuizInput(input: {
  question: string;
  options: string[];
  correctIndex: number;
  resultsIdentifiable?: boolean;
}): ValidQuizInput | InvalidQuizInput {
  const question = input.question.trim();
  if (
    question.length < QUESTION_MIN_LENGTH ||
    question.length > QUESTION_MAX_LENGTH
  ) {
    return { ok: false, error: "A quiz needs a question." };
  }
  const options = input.options.map((option) => option.trim());
  if (options.length < MIN_OPTIONS) {
    return { ok: false, error: "A quiz needs at least 2 answer options." };
  }
  if (options.length > MAX_OPTIONS) {
    return { ok: false, error: "A quiz can have at most 8 answer options." };
  }
  if (
    options.some(
      (option) =>
        option.length === 0 || option.length > OPTION_LABEL_MAX_LENGTH,
    )
  ) {
    return { ok: false, error: "Answer options cannot be empty." };
  }
  const uniqueLabels = new Set(options.map((option) => option.toLowerCase()));
  if (uniqueLabels.size !== options.length) {
    return { ok: false, error: "Answer options must be unique." };
  }
  if (
    !Number.isInteger(input.correctIndex) ||
    input.correctIndex < 0 ||
    input.correctIndex >= options.length
  ) {
    return { ok: false, error: "Choose the correct answer." };
  }
  return {
    ok: true,
    question,
    options,
    correctIndex: input.correctIndex,
    resultsIdentifiable: input.resultsIdentifiable ?? false,
  };
}
