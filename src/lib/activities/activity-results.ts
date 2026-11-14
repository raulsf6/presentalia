import { getDb, type Db } from "@/db";
import type { ActivityStatus } from "@/lib/activities/activities";
import {
  loadCloudResults,
  type CloudResultsPayload,
} from "@/lib/activities/cloud-results";
import { loadPollResults } from "@/lib/activities/poll-results";
import type { PollResultsPayload } from "@/lib/activities/polls";
import {
  loadQuizResults,
  type QuizResultsPayload,
} from "@/lib/activities/quiz-results";
import {
  loadTextResults,
  type TextResultsPayload,
} from "@/lib/activities/text-results";
import type { TalkAccess } from "@/lib/talks/membership";

type LoadedBase = {
  talkId: string;
  status: ActivityStatus;
  needsVote: boolean;
};

/** The resolved results payload, discriminated by the activity type. */
export type LoadedActivityResults =
  | (LoadedBase & { type: "poll"; payload: PollResultsPayload })
  | (LoadedBase & { type: "quiz"; payload: QuizResultsPayload })
  | (LoadedBase & { type: "text"; payload: TextResultsPayload })
  | (LoadedBase & { type: "cloud"; payload: CloudResultsPayload });

export type ActivityResultsRef = {
  id: string;
  type: string;
};

export type LoadActivityResultsOptions = {
  projector?: boolean;
  db?: Db;
};

/**
 * Loads the type-specific results payload and normalizes the fields the page
 * uses for its shared guards. Unknown types and missing payloads return null.
 */
export async function loadActivityResults(
  activity: ActivityResultsRef,
  access: TalkAccess,
  { projector = false, db = getDb() }: LoadActivityResultsOptions = {},
): Promise<LoadedActivityResults | null> {
  switch (activity.type) {
    case "poll": {
      const payload = await loadPollResults(activity.id, access, { db });
      return payload
        ? {
            type: "poll",
            payload,
            talkId: payload.poll.talkId,
            status: payload.poll.status,
            needsVote: false,
          }
        : null;
    }
    case "quiz": {
      const payload = await loadQuizResults(activity.id, access, {
        db,
        projector,
      });
      return payload
        ? {
            type: "quiz",
            payload,
            talkId: payload.quiz.talkId,
            status: payload.quiz.status,
            needsVote: payload.needsVote,
          }
        : null;
    }
    case "text": {
      const payload = await loadTextResults(activity.id, access, {
        db,
        projector,
      });
      return payload
        ? {
            type: "text",
            payload,
            talkId: payload.activity.talkId,
            status: payload.activity.status,
            needsVote: payload.needsVote,
          }
        : null;
    }
    case "cloud": {
      const payload = await loadCloudResults(activity.id, access, { db });
      return payload
        ? {
            type: "cloud",
            payload,
            talkId: payload.activity.talkId,
            status: payload.activity.status,
            needsVote: payload.needsVote,
          }
        : null;
    }
    default:
      return null;
  }
}
