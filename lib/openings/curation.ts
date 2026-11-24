import raw from "../../data/curation.json";
import type { LineTier, Opening, OpeningLine } from "./types";

type StoredCourse = {
  total: number;
  curated: string[];
  tiers: Record<string, LineTier>;
  hidden: string[];
  counts: Record<LineTier, number>;
};

type StoredCuration = {
  rules: {
    minPlies: number;
    lcpPlies: number;
    maxPerCourse: number;
    minPerCourse: number;
  };
  courses: Record<string, StoredCourse>;
};

const stored = raw as unknown as StoredCuration;

export const CURATION_RULES = stored.rules;

/**
 * Mark the small curated study set and the study level of every line.
 * Lines outside the set are kept in the catalogue; the UI hides them until the
 * reader asks for "all lines", so no progress and no id ever disappears.
 */
export function applyCuration(opening: Opening): Opening {
  const entry = stored.courses[opening.slug];
  if (!entry) return opening;

  const curated = new Set(entry.curated);
  let changed = false;
  const lines = opening.lines.map((line) => {
    const isCurated = curated.has(line.id);
    const tier = entry.tiers[line.id];
    if (line.curated === isCurated && line.tier === tier) return line;
    changed = true;
    return { ...line, curated: isCurated, tier };
  });

  return changed ? { ...opening, lines } : opening;
}

/** Number of curated lines per tier, used by the level selector. */
export function curationCounts(
  opening: Opening,
): Record<LineTier, number> | null {
  const entry = stored.courses[opening.slug];
  return entry ? entry.counts : null;
}

export function hasCuration(opening: Opening): boolean {
  return Boolean(stored.courses[opening.slug]?.curated.length);
}

/**
 * The lines that make up the course. Falls back to every line when a course
 * has no curation entry yet, so the UI never shows an empty course.
 */
export function courseLines(opening: Opening): OpeningLine[] {
  const curated = opening.lines.filter((line) => line.curated);
  return curated.length ? curated : opening.lines;
}
