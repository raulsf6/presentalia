import { loadDeckActivity } from "@/lib/deck-activity";
import { authorizeManagerAccess } from "@/lib/slide-access";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

/**
 * The projected deck's activity payload, whatever the activity's status.
 * Attendee results routes hide a ready activity; this one is the projector's
 * door and is manager-only.
 *
 * The response is the type-specific payload itself, in the same shape the
 * attendee results routes serve, because the deck's live-results components
 * poll this URL directly.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ talkId: string; activityId: string }> },
) {
  const { talkId, activityId } = await params;
  const authorization = await authorizeManagerAccess(talkId);
  if (!authorization.ok) {
    return Response.json(
      { error: authorization.error },
      { status: authorization.status, headers: NO_STORE },
    );
  }

  const payload = await loadDeckActivity(
    talkId,
    activityId,
    authorization.access,
  );
  if (!payload) {
    return Response.json(
      { error: "Activity not found." },
      { status: 404, headers: NO_STORE },
    );
  }

  return Response.json(payload.payload, { headers: NO_STORE });
}
