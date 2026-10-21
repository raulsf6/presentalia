import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Full-screen explanation for a slide screen that cannot show the deck: no
 * upload yet, access changed, or the talk disappeared. Keeps the same message
 * shape on the projector and the phone.
 */
export function SlideScreenMessage({
  tone,
  title,
  detail,
  children,
}: {
  tone: "dark" | "light";
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <main
      className={`fixed inset-0 flex items-center justify-center p-6 ${
        tone === "dark" ? "bg-ink" : "bg-cream"
      }`}
    >
      <div className="card max-w-md p-6 text-center">
        <h1 className="font-display text-ink text-xl">{title}</h1>
        <p className="text-muted mt-2 text-sm font-semibold">{detail}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {children}
        </div>
      </div>
    </main>
  );
}

/** The usual "back to the talk" action on these screens. */
export function BackToTalk({ talkId }: { talkId: string }) {
  return (
    <Link href={`/talks/${talkId}`} className="btn btn-ghost btn-small">
      Back to talk
    </Link>
  );
}
