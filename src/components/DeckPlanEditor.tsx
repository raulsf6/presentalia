"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { saveDeckPlanAction } from "@/actions/deck";
import { ActivityTypeBadge } from "@/components/ActivityTypeBadge";
import { LoadingDots } from "@/components/LoadingDots";
import { SlideCanvas } from "@/components/slides/slide-canvas";
import { usePdfDocument } from "@/components/slides/use-pdf-document";
import type { DeckPlan, DeckPlanEntry } from "@/lib/deck/deck-plan";

type Item = { activityId: string; afterSlide: number };

function statusChip(status: DeckPlanEntry["status"]) {
  if (status === "ready") {
    return null;
  }
  if (status === "closed") {
    return <span className="chip chip-closed">CLOSED</span>;
  }
  return (
    <span className="chip chip-live">
      <span className="pulse-dot" />
      {status === "locked" ? "RANKING" : "LIVE"}
    </span>
  );
}

/** The plan's effective shape, so two equal plans compare equal. */
function serialize(items: Item[]): string {
  const gaps = new Map<number, string[]>();
  for (const item of items) {
    const gap = gaps.get(item.afterSlide) ?? [];
    gap.push(item.activityId);
    gaps.set(item.afterSlide, gap);
  }
  return [...gaps.entries()]
    .sort(([a], [b]) => a - b)
    .map(([afterSlide, ids]) => `${afterSlide}:${ids.join(",")}`)
    .join("|");
}

/**
 * The deck plan as a filmstrip: the PDF's pages in a row, a drop target between
 * each pair, and the talk's ready activities above it. Placed cards stay
 * draggable, so an activity moves by dragging it to another gap or out to the
 * palette. Nothing is persisted until Save.
 */
export function DeckPlanEditor({
  talkId,
  slidesUpdatedAt,
  initial,
}: {
  talkId: string;
  slidesUpdatedAt: string;
  initial: DeckPlan;
}) {
  const { pdf, error: pdfError } = usePdfDocument(talkId, slidesUpdatedAt);
  const [items, setItems] = useState<Item[]>(() =>
    initial.placements.map((placement) => ({
      activityId: placement.activityId,
      afterSlide: placement.afterSlide,
    })),
  );
  const [baseline, setBaseline] = useState(() =>
    serialize(
      initial.placements.map((placement) => ({
        activityId: placement.activityId,
        afterSlide: placement.afterSlide,
      })),
    ),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [hoverGap, setHoverGap] = useState<number | null>(null);
  const gapElements = useRef(new Map<number, HTMLDivElement>());
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activities = useMemo(
    () =>
      new Map(initial.activities.map((activity) => [activity.id, activity])),
    [initial.activities],
  );
  const placedIds = useMemo(
    () => new Set(items.map((item) => item.activityId)),
    [items],
  );
  const palette = initial.activities.filter(
    (activity) => activity.status === "ready" && !placedIds.has(activity.id),
  );
  const dirty = serialize(items) !== baseline;

  useEffect(() => {
    if (!dirty) {
      return;
    }
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /** The gap closest to the pointer, so a drop does not have to land on it. */
  function nearestGap(clientX: number): number | null {
    let best: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const [page, element] of gapElements.current) {
      const box = element.getBoundingClientRect();
      const distance = Math.abs(clientX - (box.left + box.width / 2));
      if (distance < bestDistance) {
        bestDistance = distance;
        best = page;
      }
    }
    return best;
  }

  function dropOnStrip(event: React.DragEvent) {
    event.preventDefault();
    const activityId = event.dataTransfer.getData("text/plain");
    const page = hoverGap ?? nearestGap(event.clientX);
    setHoverGap(null);
    setDragging(null);
    if (activityId && page !== null) {
      place(activityId, page);
    }
  }

  function place(activityId: string, afterSlide: number) {
    if (!activities.has(activityId)) {
      return;
    }
    setSaved(false);
    setError(null);
    setItems((previous) => [
      ...previous.filter((item) => item.activityId !== activityId),
      { activityId, afterSlide },
    ]);
    setSelected(null);
  }

  function remove(activityId: string) {
    setSaved(false);
    setError(null);
    setItems((previous) =>
      previous.filter((item) => item.activityId !== activityId),
    );
  }

  function dropOutside(event: React.DragEvent) {
    event.preventDefault();
    const activityId = event.dataTransfer.getData("text/plain");
    setDragging(null);
    if (activityId && placedIds.has(activityId)) {
      remove(activityId);
    }
  }

  function save() {
    if (!pdf) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveDeckPlanAction(talkId, {
        pageCount: pdf.numPages,
        placements: items.map((item) => ({
          activityId: item.activityId,
          afterSlide: item.afterSlide,
        })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBaseline(serialize(items));
      setSaved(true);
    });
  }

  if (pdfError && !pdf) {
    return (
      <p role="alert" className="alert alert-warn p-5">
        The deck could not be loaded, so it cannot be planned right now.
      </p>
    );
  }

  if (!pdf) {
    return (
      <p className="text-muted text-sm font-semibold">Loading the deck…</p>
    );
  }

  const pages = Array.from({ length: pdf.numPages }, (_, index) => index + 1);
  const draggingPlaced = dragging !== null && placedIds.has(dragging);

  return (
    <div className="flex flex-col gap-5">
      <div
        onDragOver={(event) => {
          if (draggingPlaced) {
            event.preventDefault();
          }
        }}
        onDrop={dropOutside}
        className={`flex flex-wrap items-center gap-2 rounded-lg border-[2.5px] border-dashed p-2 transition ${
          draggingPlaced ? "border-red bg-red/5" : "border-ink/20 bg-white/60"
        }`}
      >
        <span className="section-label mr-1">Ready to place</span>
        {palette.length === 0 ? (
          <span className="text-muted text-xs font-semibold">
            No ready activity to place. New activities start ready; a live or
            closed one cannot be added.
          </span>
        ) : (
          palette.map((activity) => (
            <button
              key={activity.id}
              type="button"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", activity.id);
                setDragging(activity.id);
              }}
              onDragEnd={() => setDragging(null)}
              onClick={() =>
                setSelected((current) =>
                  current === activity.id ? null : activity.id,
                )
              }
              aria-pressed={selected === activity.id}
              className={`border-ink flex cursor-grab flex-col items-start gap-1 rounded-md border-[2.5px] bg-white px-2 py-1.5 text-left shadow-[2px_2px_0_var(--color-ink)] transition hover:-translate-y-0.5 ${
                selected === activity.id ? "bg-ambersoft" : ""
              }`}
            >
              <ActivityTypeBadge type={activity.type} />
              <span className="text-ink max-w-40 truncate text-[0.7rem] font-bold">
                {activity.question}
              </span>
            </button>
          ))
        )}
        {draggingPlaced ? (
          <span className="text-red text-xs font-bold">
            Drop here to take it out
          </span>
        ) : null}
      </div>

      <div className="relative">
        <div
          className="overflow-x-auto py-6"
          onDragOver={(event) => {
            event.preventDefault();
            setHoverGap(nearestGap(event.clientX));
          }}
          onDragLeave={(event) => {
            if (
              !event.currentTarget.contains(event.relatedTarget as Node | null)
            ) {
              setHoverGap(null);
            }
          }}
          onDrop={dropOnStrip}
        >
          <div className="mx-auto flex w-max min-w-full items-center justify-center gap-1 px-2">
            {pages.map((page) => (
              <div key={page} className="flex shrink-0 items-center gap-1">
                <figure
                  aria-label={`Slide ${page}`}
                  className="border-ink relative h-36 w-60 shrink-0 overflow-hidden rounded-md border-[3px] bg-white shadow-[3px_3px_0_var(--color-ink)] transition duration-150 hover:z-20 hover:scale-[1.08] hover:shadow-[6px_6px_0_var(--color-ink)]"
                >
                  <SlideCanvas
                    pdf={pdf}
                    page={page}
                    mode="contain"
                    className="absolute inset-0"
                  />
                  <figcaption className="text-muted bg-cream/85 absolute bottom-1 left-1 rounded px-1 font-mono text-[0.65rem] font-bold">
                    {page}
                  </figcaption>
                </figure>

                {page < pdf.numPages ? (
                  <Gap
                    page={page}
                    items={items}
                    activities={activities}
                    target={
                      dragging !== null ? hoverGap === page : selected !== null
                    }
                    selected={selected}
                    onPlace={place}
                    register={(element) => {
                      if (element) {
                        gapElements.current.set(page, element);
                      } else {
                        gapElements.current.delete(page);
                      }
                    }}
                    onDragStart={(activityId) => {
                      setDragging(activityId);
                      setSelected(null);
                    }}
                    onDragEnd={() => setDragging(null)}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-ink/20 flex flex-wrap items-center gap-3 border-t-[3px] border-dashed pt-4">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="btn btn-green"
        >
          {pending ? (
            <>
              Saving… <LoadingDots />
            </>
          ) : (
            "Save plan"
          )}
        </button>
        <span className="text-muted text-xs font-semibold">
          {items.length === 0
            ? "No activities placed."
            : `${items.length} placed.`}
        </span>
        {saved && !dirty ? (
          <span className="text-green text-xs font-bold">Saved.</span>
        ) : null}
        {error ? (
          <p role="alert" className="text-red text-xs font-bold">
            {error}
          </p>
        ) : null}
        <span className="text-muted ml-auto text-[0.7rem] font-semibold">
          Drag an activity into a gap, or tap it and then tap a gap.
        </span>
      </div>
    </div>
  );
}

/** The space between two pages, and the activities placed in it. */
function Gap({
  page,
  items,
  activities,
  target,
  selected,
  onPlace,
  register,
  onDragStart,
  onDragEnd,
}: {
  page: number;
  items: Item[];
  activities: Map<string, DeckPlanEntry>;
  /** The gap a drop would land in, or every empty gap while choosing by tap. */
  target: boolean;
  selected: string | null;
  onPlace: (activityId: string, afterSlide: number) => void;
  register: (element: HTMLDivElement | null) => void;
  onDragStart: (activityId: string) => void;
  onDragEnd: () => void;
}) {
  const placed = items.filter((item) => item.afterSlide === page);
  const empty = placed.length === 0;

  return (
    <div
      ref={register}
      onClick={() => {
        if (selected) {
          onPlace(selected, page);
        }
      }}
      className={`flex shrink-0 flex-col justify-center gap-1 rounded-lg border-[2.5px] border-dashed p-1 transition-all duration-150 ${
        empty
          ? target
            ? "border-green bg-greensoft/40 min-h-24 w-12 cursor-pointer"
            : "border-ink/20 hover:border-ink/50 hover:bg-cream2 min-h-24 w-10 cursor-pointer"
          : target
            ? "border-green bg-greensoft/30 max-h-40 w-28 overflow-y-auto"
            : "border-ink/25 bg-cream2 max-h-40 w-28 overflow-y-auto"
      }`}
    >
      {empty ? (
        <span
          className={`text-center text-xl leading-none ${
            target ? "text-green" : "text-muted/50"
          }`}
        >
          +
        </span>
      ) : (
        placed.map((item) => {
          const activity = activities.get(item.activityId);
          if (!activity) {
            return null;
          }
          return (
            <div
              key={item.activityId}
              draggable
              onClick={(event) => event.stopPropagation()}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", item.activityId);
                onDragStart(item.activityId);
              }}
              onDragEnd={onDragEnd}
              title={activity.question}
              className="border-ink shrink-0 cursor-grab rounded-md border-[2.5px] bg-white px-1 py-0.5 shadow-[2px_2px_0_var(--color-ink)] transition duration-150 hover:z-10 hover:scale-105"
            >
              <span className="flex flex-wrap items-center gap-1">
                {statusChip(activity.status)}
                <ActivityTypeBadge type={activity.type} />
              </span>
              <p className="text-ink mt-0.5 line-clamp-2 text-[0.6rem] leading-tight font-bold">
                {activity.question}
              </p>
            </div>
          );
        })
      )}
    </div>
  );
}
