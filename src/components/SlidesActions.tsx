"use client";

import { useRef, type ReactNode, type RefObject } from "react";

import { SlidesManager } from "@/components/SlidesManager";
import { PresentationIcon, RemoteIcon, UploadIcon } from "@/components/icons";

/**
 * The Slides page's three jobs, collapsed into icon buttons with popups: the
 * upload form, the projector link, and the phone remote. Keeping them off the
 * page leaves the deck plan full width.
 */
export function SlidesActions({
  talkId,
  uploadedLabel,
}: {
  talkId: string;
  uploadedLabel: string | null;
}) {
  const upload = useRef<HTMLDialogElement>(null);
  const present = useRef<HTMLDialogElement>(null);
  const remote = useRef<HTMLDialogElement>(null);
  const hasSlides = uploadedLabel !== null;

  function openFrom(dialog: RefObject<HTMLDialogElement | null>) {
    present.current?.close();
    remote.current?.close();
    dialog.current?.showModal();
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <IconButton
          label="Upload slides"
          onClick={() => upload.current?.showModal()}
        >
          <UploadIcon className="size-5" />
        </IconButton>
        <IconButton
          label="Present"
          onClick={() => present.current?.showModal()}
        >
          <PresentationIcon className="size-5" />
        </IconButton>
        <IconButton label="Remote" onClick={() => remote.current?.showModal()}>
          <RemoteIcon className="size-5" />
        </IconButton>
      </div>

      <Popup ref={upload} title="Slides PDF">
        <SlidesManager talkId={talkId} uploadedLabel={uploadedLabel} />
      </Popup>

      <Popup ref={present} title="Present">
        {hasSlides ? (
          <>
            <p className="text-ink/75 text-sm font-semibold">
              Open <strong>Present</strong> on the laptop connected to the big
              screen, then use the remote on your phone.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href={`/talks/${talkId}/present`}
                target="_blank"
                rel="noreferrer"
                className="btn"
                onClick={() => present.current?.close()}
              >
                Open Present ↗
              </a>
              <button
                type="button"
                onClick={() => openFrom(remote)}
                className="btn btn-ghost"
              >
                Open Remote instead
              </button>
            </div>
          </>
        ) : (
          <UploadFirst onUpload={() => openFrom(upload)} />
        )}
      </Popup>

      <Popup ref={remote} title="Remote">
        {hasSlides ? (
          <>
            <p className="text-ink/75 text-sm font-semibold">
              Open this on the phone in your hand, signed in as the same
              account. The remote moves the deck and launches or closes the
              activity the deck is sitting on.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a href={`/talks/${talkId}/remote`} className="btn">
                Open Remote
              </a>
            </div>
          </>
        ) : (
          <UploadFirst onUpload={() => openFrom(upload)} />
        )}
      </Popup>
    </>
  );
}

function UploadFirst({ onUpload }: { onUpload: () => void }) {
  return (
    <>
      <p className="text-ink/75 text-sm font-semibold">
        Upload the talk&apos;s PDF first. The deck is what Present projects and
        what the remote moves.
      </p>
      <button type="button" onClick={onUpload} className="btn mt-4">
        Upload slides
      </button>
    </>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="border-ink text-ink shadow-hard-md hover:shadow-hard-lg inline-flex size-10 items-center justify-center rounded-lg border-[3px] bg-white transition"
    >
      {children}
    </button>
  );
}

function Popup({
  ref,
  title,
  children,
}: {
  ref: RefObject<HTMLDialogElement | null>;
  title: string;
  children: ReactNode;
}) {
  return (
    <dialog
      ref={ref}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          ref.current?.close();
        }
      }}
      className="border-ink text-ink shadow-hard-lg backdrop:bg-ink/50 m-auto max-h-[85vh] w-[min(38rem,calc(100vw-2rem))] overflow-y-auto rounded-[12px] border-[3px] bg-white p-0"
    >
      <div className="border-ink/15 sticky top-0 flex items-center justify-between gap-4 border-b-[2.5px] bg-white px-5 py-3">
        <h2 className="font-display text-lg">{title}</h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Close"
          className="border-ink/25 hover:border-ink rounded-md border px-2 py-0.5 text-sm font-bold"
        >
          ×
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
