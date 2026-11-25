import { NextResponse, type NextRequest } from "next/server";

import { getLocale } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/translate";
import { loadTalkAccess } from "@/lib/talks/membership";
import { createSupabaseServiceClient } from "@/lib/platform/supabase/service";

/**
 * Serves the talk's PDF only to authorized viewers: the owner, an admin, or a
 * rostered attendee (checked by loadTalkAccess in the server app). A short-lived
 * signed URL to the private bucket is issued server-side.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ talkId: string }> },
) {
  const { talkId } = await params;
  const locale = await getLocale();
  const t = createTranslator(locale);
  const access = await loadTalkAccess(talkId);
  if (!access || !access.talk.slidesUpdatedAt) {
    return NextResponse.json(
      { error: t("errors.talk.notFound") },
      { status: 404 },
    );
  }

  const service = createSupabaseServiceClient();
  const { data, error } = await service.storage
    .from("talk-slides")
    .createSignedUrl(`${talkId}/slides.pdf`, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: t("errors.slides.notAvailable") },
      { status: 503 },
    );
  }
  return NextResponse.redirect(data.signedUrl, 302);
}
