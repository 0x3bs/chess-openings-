import raw from "../../data/line-ideas.json";
import type { Locale } from "../i18n/config";

type StoredLineIdea = {
  lineId: string;
  en: string;
  ar: string;
  source: string;
  evalCp: number;
  distinguishingMove: string | null;
};

const stored = raw as unknown as { lines: StoredLineIdea[] };

const byLineId = new Map<string, StoredLineIdea>(
  stored.lines.map((idea) => [idea.lineId, idea]),
);

/**
 * The auto-generated study note for a whole line, or `null` when the
 * generator dropped it (the line is still shown, just without a note).
 */
export function lineIdeaFor(lineId: string, locale: Locale): string | null {
  const idea = byLineId.get(lineId);
  if (!idea) return null;
  const text = locale === "ar" ? idea.ar : idea.en;
  return text?.trim() ? text : null;
}

export function explainedLineCount(): number {
  return byLineId.size;
}
