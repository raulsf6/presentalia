import { isManager, loadTalkAccess } from "@/lib/membership";
import { formatGuestJoinedAt } from "@/lib/talk-guests";
import { loadTalkGuests } from "@/lib/talk-guests-db";

/** Manager-only guest list for the live roster view. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ talkId: string }> },
) {
  const { talkId } = await params;
  const access = await loadTalkAccess(talkId);
  if (!access || !isManager(access)) {
    return Response.json(
      { error: "Not found." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const guests = await loadTalkGuests(talkId);
  return Response.json(
    {
      guests: guests.map((guest) => ({
        id: guest.id,
        username: guest.username,
        joinedAtLabel: formatGuestJoinedAt(guest.joinedAt),
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
