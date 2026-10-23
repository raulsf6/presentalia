import { loadQuizResults } from "@/lib/activities/quiz-results";
import { getActivityTalkAccess } from "@/lib/activities/results-access";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const { quizId } = await params;
  const access = await getActivityTalkAccess(quizId);
  if (!access) {
    return Response.json(
      { error: "Join this talk to view quiz results." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const projector =
    new URL(request.url).searchParams.get("display") === "projector";
  const results = await loadQuizResults(quizId, access, {
    projector,
  });
  if (!results || results.quiz.status === "ready") {
    return Response.json(
      { error: "Quiz not found." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (results.needsVote) {
    return Response.json(
      { error: "Vote before viewing quiz results." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(results, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
