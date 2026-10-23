"use client";

import { useRef, type RefObject } from "react";

import { IconButton } from "@/components/IconButton";
import { Popup } from "@/components/Popup";
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
