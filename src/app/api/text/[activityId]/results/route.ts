import { getSessionUser } from "@/lib/auth";
import { loadTextResults } from "@/lib/text-results";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json(
      { error: "Sign in to view results." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { activityId } = await params;
  const projector =
    new URL(request.url).searchParams.get("display") === "projector";
  const results = await loadTextResults(activityId, user, { projector });
  if (!results || results.activity.status === "draft") {
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
