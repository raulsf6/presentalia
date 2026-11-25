"use client";

import { useRef, type RefObject } from "react";

import { useT } from "@/components/I18nProvider";
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
  const t = useT();
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
          label={t("slides.upload")}
          onClick={() => upload.current?.showModal()}
        >
          <UploadIcon className="size-5" />
        </IconButton>
        <IconButton
          label={t("slides.present")}
          onClick={() => present.current?.showModal()}
        >
          <PresentationIcon className="size-5" />
        </IconButton>
        <IconButton
          label={t("slides.remote")}
          onClick={() => remote.current?.showModal()}
        >
          <RemoteIcon className="size-5" />
        </IconButton>
      </div>

      <Popup ref={upload} title={t("slides.slidesPdf")}>
        <SlidesManager talkId={talkId} uploadedLabel={uploadedLabel} />
      </Popup>

      <Popup ref={present} title={t("slides.present")}>
        {hasSlides ? (
          <>
            <p className="text-ink/75 text-sm font-semibold">
              {t("slides.presentIntro")}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href={`/talks/${talkId}/present`}
                target="_blank"
                rel="noreferrer"
                className="btn"
                onClick={() => present.current?.close()}
              >
                {t("slides.openPresent")}
              </a>
              <button
                type="button"
                onClick={() => openFrom(remote)}
                className="btn btn-ghost"
              >
                {t("slides.openRemoteInstead")}
              </button>
            </div>
          </>
        ) : (
          <UploadFirst onUpload={() => openFrom(upload)} />
        )}
      </Popup>

      <Popup ref={remote} title={t("slides.remote")}>
        {hasSlides ? (
          <>
            <p className="text-ink/75 text-sm font-semibold">
              {t("slides.remoteIntro")}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a href={`/talks/${talkId}/remote`} className="btn">
                {t("slides.openRemote")}
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
  const t = useT();
  return (
    <>
      <p className="text-ink/75 text-sm font-semibold">
        {t("slides.uploadFirst")}
      </p>
      <button type="button" onClick={onUpload} className="btn mt-4">
        {t("slides.upload")}
      </button>
    </>
  );
}
