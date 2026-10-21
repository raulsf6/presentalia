import { z } from "zod";

import { authorizeSlideRequest } from "@/lib/slide-access";
import { reportSlideCount } from "@/lib/slide-state";

const NO_STORE = { "Cache-Control": "no-store" } as const;

const bodySchema = z.object({
  count: z.number().int().min(1).max(2000),
});

export async function POST(
  request: Request,
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

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Send the deck's page count." },
      { status: 400, headers: NO_STORE },
    );
  }

  const state = await reportSlideCount(talkId, parsed.data.count);
  if (!state) {
    return Response.json(
      { error: "Talk not found." },
      { status: 404, headers: NO_STORE },
    );
  }

  return Response.json(state, { headers: NO_STORE });
}
