import { getActivityTalkAccess } from "@/lib/results-access";
import { loadTextResults } from "@/lib/text-results";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const { activityId } = await params;
  const access = await getActivityTalkAccess(activityId);
  if (!access) {
    return Response.json(
      { error: "Join this talk to view results." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const projector =
    new URL(request.url).searchParams.get("display") === "projector";
  const results = await loadTextResults(activityId, access, {
    projector,
  });
  if (!results || results.activity.status === "ready") {
    return Response.json(
      { error: "Activity not found." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (results.needsVote) {
    return Response.json(
      { error: "Answer before viewing results." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(results, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
