import type { ErrorKey } from "@/lib/i18n/dictionaries/en";

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

export type InvalidQuizInput = { ok: false; errorKey: ErrorKey };

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
    return { ok: false, errorKey: "errors.quiz.questionRequired" };
  }
  const options = input.options.map((option) => option.trim());
  if (options.length < MIN_OPTIONS) {
    return { ok: false, errorKey: "errors.quiz.minOptions" };
  }
  if (options.length > MAX_OPTIONS) {
    return { ok: false, errorKey: "errors.quiz.maxOptions" };
  }
  if (
    options.some(
      (option) =>
        option.length === 0 || option.length > OPTION_LABEL_MAX_LENGTH,
    )
  ) {
    return { ok: false, errorKey: "errors.quiz.emptyOption" };
  }
  const uniqueLabels = new Set(options.map((option) => option.toLowerCase()));
  if (uniqueLabels.size !== options.length) {
    return { ok: false, errorKey: "errors.quiz.duplicateOption" };
  }
  if (
    !Number.isInteger(input.correctIndex) ||
    input.correctIndex < 0 ||
    input.correctIndex >= options.length
  ) {
    return { ok: false, errorKey: "errors.quiz.correctRequired" };
  }
  return {
    ok: true,
    question,
    options,
    correctIndex: input.correctIndex,
    resultsIdentifiable: input.resultsIdentifiable ?? false,
  };
}
