import { createLiveEventStream } from "@/lib/platform/live-event-stream";
import { subscribeToTalkStatus } from "@/lib/platform/live-event-bus";
import { loadTalkAccess } from "@/lib/talks/membership";

/** Hobby's maximum. The stream closes itself a little earlier. */
export const maxDuration = 300;

/**
 * Generic activity-change signal for one talk. The event carries no activity
 * data; the overview refreshes through its normal authorized page loader.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ talkId: string }> },
) {
  const { talkId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access) {
    return new Response("Not found.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const stream = createLiveEventStream(
    (listener) => subscribeToTalkStatus(talkId, listener),
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
