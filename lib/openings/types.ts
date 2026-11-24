export type CoachColor = "blue" | "green" | "orange";

export type CoachShape =
  | { kind: "circle"; square: string }
  | { kind: "arrow"; from: string; to: string };

/**
 * A phrase inside an explanation that can be hovered, tapped or focused to
 * draw its idea on the board. `phrases` are matched case-insensitively.
 */
export type TextHotspot = {
  id: string;
  phrases: string[];
  /** Short description announced by assistive technology. */
  label: string;
  shapes: CoachShape[];
};

export type CoachPoint = {
  id: string;
  color: CoachColor;
  /** Short label shown on the card, e.g. "The idea". */
  title: string;
  /** One or two plain-language sentences. */
  text: string;
  /** Squares / arrows that light up on the board while this card is hovered. */
  shapes: CoachShape[];
  /** Words in `text` that each draw their own detail on the board. */
  hotspots?: TextHotspot[];
};

/**
 * The single, primary explanation shown for every move in the step-through
 * trainer. One short sentence plus one board highlight.
 */
export type MoveIdea = {
  text: string;
  shapes: CoachShape[];
  /** Words in `text` that each draw their own detail on the board. */
  hotspots?: TextHotspot[];
};

export type OpeningSource = {
  label: string;
  url: string;
};

export type LineMove = {
  san: string;
  /** One-sentence idea for every move. */
  idea?: MoveIdea;
  /** Optional deeper notes, shown behind a toggle. */
  coach?: CoachPoint[];
};

export type LineLevel = "basic" | "common" | "advanced";

export type OpeningLine = {
  id: string;
  name: string;
  eco: string;
  side: "white" | "black";
  summary: string;
  tags: string[];
  /** Where the line and its explanations can be checked. */
  sources?: OpeningSource[];
  moves: LineMove[];
  /** Tree metadata from the CC0 Lichess opening-name dataset. */
  parentName?: string;
  family?: string;
  level?: LineLevel;
  source?: "lichess" | "manual";
  /** Famous short entry line that also has a longer named continuation. */
  partial?: boolean;
  /**
   * One short auto-generated study note for the whole line, already in the
   * active locale. Absent when the generator dropped the note.
   */
  idea?: string;
};

export type Opening = {
  slug: string;
  name: string;
  eco: string;
  side: "white" | "black";
  intro: string;
  themes: string[];
  /** Provenance note kept with the course data. */
  sourceNote?: string;
  lines: OpeningLine[];
};
