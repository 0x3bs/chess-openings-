"use client";

import { useMemo, useRef } from "react";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { fill } from "@/lib/i18n/plural";
import type { TextHotspot } from "@/lib/openings/types";

type Segment = {
  key: string;
  text: string;
  hotspot?: TextHotspot;
};

type Occurrence = {
  start: number;
  end: number;
  hotspot: TextHotspot;
  order: number;
};

function segmentsFor(text: string, hotspots: TextHotspot[]): Segment[] {
  if (!hotspots.length) return [{ key: "plain", text }];

  const lower = text.toLowerCase();
  const occurrences: Occurrence[] = [];

  hotspots.forEach((hotspot, order) => {
    for (const phrase of hotspot.phrases) {
      const needle = phrase.toLowerCase();
      if (!needle) continue;

      let from = 0;
      while (from <= lower.length - needle.length) {
        const start = lower.indexOf(needle, from);
        if (start === -1) break;
        occurrences.push({
          start,
          end: start + needle.length,
          hotspot,
          order,
        });
        from = start + Math.max(1, needle.length);
      }
    }
  });

  occurrences.sort(
    (a, b) =>
      a.start - b.start ||
      b.end - b.start - (a.end - a.start) ||
      a.order - b.order,
  );

  const chosen: Occurrence[] = [];
  let cursor = 0;
  for (const occurrence of occurrences) {
    if (occurrence.start < cursor) continue;
    chosen.push(occurrence);
    cursor = occurrence.end;
  }

  if (!chosen.length) return [{ key: "plain", text }];

  const segments: Segment[] = [];
  let position = 0;

  chosen.forEach((occurrence, index) => {
    if (occurrence.start > position) {
      segments.push({
        key: `text-${index}`,
        text: text.slice(position, occurrence.start),
      });
    }

    segments.push({
      key: `hot-${occurrence.hotspot.id}-${occurrence.start}`,
      text: text.slice(occurrence.start, occurrence.end),
      hotspot: occurrence.hotspot,
    });
    position = occurrence.end;
  });

  if (position < text.length) {
    segments.push({ key: "tail", text: text.slice(position) });
  }

  return segments;
}

export type IdeaTextProps = {
  text: string;
  hotspots?: TextHotspot[];
  activeId?: string | null;
  onActivate?: (hotspot: TextHotspot | null) => void;
  className?: string;
  as?: "span" | "p";
};

/**
 * Renders coach prose with hoverable chess phrases. Every underlined phrase
 * can light up its own arrow or circles on the board.
 */
export function IdeaText({
  text,
  hotspots = [],
  activeId = null,
  onActivate,
  className,
  as = "span",
}: IdeaTextProps) {
  const { m } = useI18n();
  const pointerDownRef = useRef(false);
  const pointerTypeRef = useRef<string>("mouse");
  const segments = useMemo(
    () => segmentsFor(text, hotspots),
    [text, hotspots],
  );

  const content = segments.map((segment) => {
    if (!segment.hotspot) return <span key={segment.key}>{segment.text}</span>;

    const hotspot = segment.hotspot;
    const active = activeId === hotspot.id;

    return (
      <button
        key={segment.key}
        type="button"
        className={`idea-hotspot${active ? " is-active" : ""}`}
        aria-pressed={active}
        title={fill(m.idea.showOnBoard, { label: hotspot.label })}
        onPointerDown={(event) => {
          pointerDownRef.current = true;
          pointerTypeRef.current = event.pointerType;
        }}
        onPointerEnter={(event) => {
          if (event.pointerType !== "mouse") return;
          event.stopPropagation();
          onActivate?.(hotspot);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "mouse") return;
          event.stopPropagation();
          onActivate?.(null);
        }}
        onPointerUp={() => {
          pointerDownRef.current = false;
        }}
        onClick={(event) => {
          // A mouse click is already covered by hover. Touch taps and keyboard
          // activation (detail 0) toggle the annotation explicitly.
          if (event.detail !== 0 && pointerTypeRef.current === "mouse") return;
          event.stopPropagation();
          onActivate?.(active ? null : hotspot);
          pointerTypeRef.current = "mouse";
        }}
        onBlur={() => {
          if (!pointerDownRef.current) onActivate?.(null);
        }}
      >
        {segment.text}
      </button>
    );
  });

  if (as === "p") {
    return <p className={className}>{content}</p>;
  }

  return <span className={className}>{content}</span>;
}
