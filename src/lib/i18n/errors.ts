import type { ErrorKey, MessageParams } from "@/lib/i18n/dictionaries/en";

/**
 * The only failure shape server actions return for user-facing errors.
 * Client components translate it at render time, so an error already on screen
 * follows a language switch too.
 */
export type ActionFailure = {
  ok: false;
  errorKey: ErrorKey;
  errorParams?: MessageParams;
};

export type ErrorState = {
  key: ErrorKey;
  params?: MessageParams;
};

/** Converts an action failure to render state, with a defensive fallback. */
export function toErrorState(
  failure: { errorKey?: ErrorKey; errorParams?: MessageParams },
  fallback: ErrorKey,
): ErrorState {
  return {
    key: failure.errorKey ?? fallback,
    params: failure.errorParams,
  };
}
