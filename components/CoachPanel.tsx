"use client";

import { IdeaText } from "./IdeaText";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import type { CoachPoint, TextHotspot } from "@/lib/openings/types";

function squaresFor(point: CoachPoint): string[] {
  const squares = new Set<string>();
  for (const shape of point.shapes) {
    if (shape.kind === "circle") squares.add(shape.square);
    else {
      squares.add(shape.from);
      squares.add(shape.to);
    }
  }
  return [...squares].slice(0, 8);
}

export type CoachPanelProps = {
  points: CoachPoint[];
  activeId: string | null;
  onActivate: (id: string | null) => void;
  activeHotspotId?: string | null;
  onHotspot?: (hotspot: TextHotspot | null) => void;
  heading: string;
  subheading?: string;
  emptyText: string;
  children?: React.ReactNode;
};

export function CoachPanel({
  points,
  activeId,
  onActivate,
  activeHotspotId = null,
  onHotspot,
  heading,
  subheading,
  emptyText,
  children,
}: CoachPanelProps) {
  const { m } = useI18n();
  const colorMeta = {
    blue: { label: m.coach.kindIdea, dot: "coach-dot-blue", card: "coach-card-blue" },
    green: { label: m.coach.kindWhy, dot: "coach-dot-green", card: "coach-card-green" },
    orange: {
      label: m.coach.kindCareful,
      dot: "coach-dot-orange",
      card: "coach-card-orange",
    },
  } as const;

  const activePoint = points.find((point) => point.id === activeId) ?? null;
  const activeSquares = activePoint ? squaresFor(activePoint) : [];

  return (
    <section className="coach-panel" aria-label={m.coach.panelAria}>
      <header className="coach-header">
        <span className="coach-badge">{m.coach.badge}</span>
        <div className="coach-header-text">
          <h2 className="coach-title">{heading}</h2>
          {subheading ? <p className="coach-subtitle">{subheading}</p> : null}
        </div>
      </header>

      <div className="coach-legend" aria-label={m.coach.legendAria}>
        <span>
          <span className="coach-dot coach-dot-blue" aria-hidden />{" "}
          {m.coach.idea}
        </span>
        <span>
          <span className="coach-dot coach-dot-green" aria-hidden />{" "}
          {m.coach.why}
        </span>
        <span>
          <span className="coach-dot coach-dot-orange" aria-hidden />{" "}
          {m.coach.careful}
        </span>
      </div>

      {points.length === 0 ? (
        <p className="coach-empty">{emptyText}</p>
      ) : (
        <div className="coach-list">
          {points.map((point) => {
            const meta = colorMeta[point.color];
            const active = activeId === point.id;
            return (
              <article
                key={point.id}
                role="group"
                tabIndex={0}
                aria-label={`${point.title}. ${point.text}`}
                className={`coach-card ${meta.card}${active ? " is-active" : ""}`}
                data-active={active ? "true" : "false"}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") onActivate(point.id);
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse") onActivate(null);
                }}
                onPointerUp={(event) => {
                  // Touch and pen have no hover, so a tap toggles the highlight.
                  if (event.pointerType !== "mouse") {
                    onActivate(active ? null : point.id);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  onActivate(active ? null : point.id);
                }}
              >
                <span className="coach-card-top">
                  <span className={`coach-dot ${meta.dot}`} aria-hidden />
                  <span className="coach-card-label">{point.title}</span>
                  <span className="coach-card-kind">{meta.label}</span>
                </span>
                <IdeaText
                  as="span"
                  className="coach-card-text"
                  text={point.text}
                  hotspots={point.hotspots}
                  activeId={activeHotspotId}
                  onActivate={onHotspot}
                />
              </article>
            );
          })}
        </div>
      )}

      {activePoint && activeSquares.length > 0 ? (
        <div className="coach-squares">
          <span className="coach-squares-label">{m.coach.onBoard}</span>
          {activeSquares.map((square) => (
            <span className="square-chip" key={square}>
              {square}
            </span>
          ))}
        </div>
      ) : null}

      {points.length > 0 ? (
        <p className="coach-hintline">{m.coach.hint}</p>
      ) : null}

      {children}
    </section>
  );
}
