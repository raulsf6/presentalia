import { getSessionUser } from "@/lib/auth";
import { loadQuizResults } from "@/lib/quiz-results";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json(
      { error: "Sign in to view quiz results." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { quizId } = await params;
  const projector =
    new URL(request.url).searchParams.get("display") === "projector";
  const results = await loadQuizResults(quizId, user, { projector });
  if (!results || results.quiz.status === "draft") {
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
