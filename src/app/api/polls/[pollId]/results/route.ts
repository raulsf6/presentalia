import { loadPollResults } from "@/lib/activities/poll-results";
import { getActivityTalkAccess } from "@/lib/activities/results-access";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pollId: string }> },
) {
  const { pollId } = await params;
  const access = await getActivityTalkAccess(pollId);
  if (!access) {
    return Response.json(
      { error: "Join this talk to view poll results." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const fresh = new URL(request.url).searchParams.get("fresh") === "1";
  const results = await loadPollResults(pollId, access, { fresh });
  if (!results) {
    return Response.json(
      { error: "Poll not found." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(results, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
