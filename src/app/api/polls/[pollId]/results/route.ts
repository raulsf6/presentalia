import { getSessionUser } from "@/lib/auth";
import { loadPollResults } from "@/lib/poll-results";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pollId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json(
      { error: "Sign in to view poll results." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { pollId } = await params;
  const results = await loadPollResults(pollId, user);
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
