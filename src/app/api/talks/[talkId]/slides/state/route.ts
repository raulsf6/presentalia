import { authorizeSlideRequest } from "@/lib/deck/slide-access";
import { readSlideState } from "@/lib/deck/slide-state";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ talkId: string }> },
) {
  const { talkId } = await params;
  const access = await authorizeSlideRequest(talkId);
  if (!access.ok) {
    return Response.json(
      { error: access.error },
      { status: access.status, headers: NO_STORE },
    );
  }

  const state = await readSlideState(talkId);
  if (!state) {
    return Response.json(
      { error: "Talk not found." },
      { status: 404, headers: NO_STORE },
    );
  }

  return Response.json(state, { headers: NO_STORE });
}
