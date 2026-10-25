import { getActivityTalkAccess } from "@/lib/activities/results-access";
import { createLiveEventStream } from "@/lib/platform/live-event-stream";
import { subscribeToActivityResults } from "@/lib/platform/live-event-bus";

/** Hobby's maximum. The stream closes itself a little earlier. */
export const maxDuration = 300;

/**
 * Generic result-change signal for one activity. The event carries no result
 * data; the results view fetches its normal authorized JSON payload.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const { activityId } = await params;
  const access = await getActivityTalkAccess(activityId);
  if (!access) {
    return new Response("Not found.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const stream = createLiveEventStream(
    (listener) => subscribeToActivityResults(activityId, listener),
    { signal: request.signal },
  );

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
