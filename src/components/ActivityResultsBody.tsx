import { CloudLiveResults } from "@/components/CloudLiveResults";
import { PollLiveResults } from "@/components/PollLiveResults";
import { QuizLiveResults } from "@/components/QuizLiveResults";
import { TextLiveResults } from "@/components/TextLiveResults";
import type { LoadedActivityResults } from "@/lib/activities/activity-results";

/** Renders the type-specific live results display for a loaded activity. */
export function ActivityResultsBody({
  loaded,
  projector,
}: {
  loaded: LoadedActivityResults;
  projector: boolean;
}) {
  const key = `${loaded.type}-${loaded.status}-${projector ? "projector" : "attendee"}`;

  switch (loaded.type) {
    case "poll":
      return (
        <PollLiveResults
          key={key}
          initial={loaded.payload}
          projector={projector}
        />
      );
    case "quiz":
      return (
        <QuizLiveResults
          key={key}
          initial={loaded.payload}
          projector={projector}
        />
      );
    case "text":
      return (
        <TextLiveResults
          key={key}
          initial={loaded.payload}
          projector={projector}
        />
      );
    case "cloud":
      return (
        <CloudLiveResults
          key={key}
          initial={loaded.payload}
          projector={projector}
        />
      );
    default:
      return null;
  }
}
