/**
 * Pick a small, diverse study set for every course and put each line in one of
 * three separate difficulty levels.
 *
 * Rules (all deterministic, no hand-picking):
 *  - a line must be at least MIN_PLIES long to be studied;
 *  - two lines may not reach the same position (transposition check);
 *  - two lines may not share their first LCP_PLIES plies, so every line in the
 *    set branches early instead of differing on move seven;
 *  - at most MAX_PER_COURSE lines per course;
 *  - each level is a separate band: beginner, intermediate and advanced do not
 *    repeat each other's lines.
 *
 * Nothing is deleted. Lines outside the set stay in the catalogue and are
 * revealed by the "Show all lines" switch in the course page.
 *
 * Writes data/curation.json and review/curation.md.
 */
import { Chess } from "chess.js";
import { writeFileSync } from "node:fs";
import { englishOpening } from "../lib/openings/english";
import { buildOpening, catalogueOpenings } from "../lib/openings/catalog";
import lichessLines from "../lib/openings/lichess-lines.json";
import { markPartialLines, partialLineIds } from "../lib/openings/partial";
import type { LineSeed } from "../lib/openings/catalog";
import type { LineTier, Opening, OpeningLine } from "../lib/openings/types";

export const MIN_PLIES = 12;
export const LCP_PLIES = 12;
export const MAX_PER_COURSE = 60;
export const MIN_PER_COURSE = 20;

const imported = lichessLines as unknown as Record<string, LineSeed[]>;

type Candidate = {
  line: OpeningLine;
  san: string[];
  fen: string;
  score: number;
};

type Hidden = {
  id: string;
  name: string;
  plies: number;
  reason: string;
};

function allOpenings(): Opening[] {
  const englishImported = imported.english ?? [];
  const english: Opening = englishImported.length
    ? {
        ...englishOpening,
        lines: [
          ...englishOpening.lines,
          ...buildOpening({
            slug: "english-imported",
            name: englishOpening.name,
            eco: englishOpening.eco,
            side: "white",
            intro: englishOpening.intro,
            themes: englishOpening.themes,
            lines: englishImported,
          }).lines,
        ],
      }
    : englishOpening;

  const list = [english, ...catalogueOpenings];
  const partialIds = partialLineIds(
    list.flatMap((opening) =>
      opening.lines.map((line) => ({
        id: line.id,
        name: line.name,
        moves: line.moves.map((move) => move.san),
      })),
    ),
  );
  return list.map((opening) => markPartialLines(opening, partialIds));
}

function finalFen(san: string[]): string {
  const chess = new Chess();
  for (const move of san) chess.move(move);
  return chess.fen().split(" ").slice(0, 4).join(" ");
}

function commonPrefix(a: string[], b: string[]): number {
  let index = 0;
  while (index < a.length && index < b.length && a[index] === b[index]) {
    index += 1;
  }
  return index;
}

function scoreOf(line: OpeningLine): number {
  const manual = line.source === "manual" ? 120 : 0;
  const level =
    line.level === "basic"
      ? 45
      : line.level === "common"
        ? 30
        : line.level === "advanced"
          ? 15
          : 25;
  // Longer lines teach more, but cap the bonus so one very long line cannot
  // outrank every manual line.
  const depth = Math.min(line.moves.length, 24);
  return manual + level + depth;
}

function tierKey(line: OpeningLine): number {
  if (line.source === "manual") return 0;
  if (line.level === "basic") return 1;
  if (!line.level) return 2;
  if (line.level === "common") return 3;
  return 4;
}

function assignTiers(selected: OpeningLine[]): Record<string, LineTier> {
  // Beginner = the simplest lines first: hand-written core, then basic, then
  // short common lines. Intermediate takes the next band; Advanced keeps the
  // deepest named theory. The bands never overlap.
  const ordered = [...selected].sort(
    (a, b) =>
      tierKey(a) - tierKey(b) ||
      a.moves.length - b.moves.length ||
      a.name.localeCompare(b.name, "en"),
  );
  const beginner = Math.max(5, Math.round(ordered.length * 0.3));
  const intermediate = Math.max(
    beginner + 1,
    Math.round(ordered.length * 0.65),
  );
  const tiers: Record<string, LineTier> = {};
  ordered.forEach((line, index) => {
    tiers[line.id] =
      index < beginner
        ? "beginner"
        : index < intermediate
          ? "intermediate"
          : "advanced";
  });
  return tiers;
}

function selectCourse(opening: Opening): {
  selected: OpeningLine[];
  hidden: Hidden[];
  relaxed: boolean;
} {
  const hidden: Hidden[] = [];
  const candidates: Candidate[] = [];

  for (const line of opening.lines) {
    const san = line.moves.map((move) => move.san);
    if (line.partial) {
      hidden.push({
        id: line.id,
        name: line.name,
        plies: san.length,
        reason: "famous short entry line (partial)",
      });
      continue;
    }
    if (san.length < MIN_PLIES) {
      hidden.push({
        id: line.id,
        name: line.name,
        plies: san.length,
        reason: `shorter than ${MIN_PLIES} plies`,
      });
      continue;
    }
    candidates.push({
      line,
      san,
      fen: finalFen(san),
      score: scoreOf(line),
    });
  }

  candidates.sort(
    (a, b) =>
      b.score - a.score ||
      b.san.length - a.san.length ||
      a.line.name.localeCompare(b.line.name, "en"),
  );

  const selected: Candidate[] = [];
  const selectedIds = new Set<string>();
  const seenFen = new Set<string>();

  function tryAdd(candidate: Candidate, lcp: number): boolean {
    if (selected.length >= MAX_PER_COURSE) return false;
    if (selectedIds.has(candidate.line.id)) return false;
    if (seenFen.has(candidate.fen)) return false;
    if (selected.some((kept) => commonPrefix(kept.san, candidate.san) >= lcp)) {
      return false;
    }
    selected.push(candidate);
    selectedIds.add(candidate.line.id);
    seenFen.add(candidate.fen);
    return true;
  }

  for (const candidate of candidates) tryAdd(candidate, LCP_PLIES);

  // A few short courses cannot reach the target with a strict six-move
  // branch. For those only, allow lines that branch from move six. This is
  // still a real early branch, and the relaxation is reported.
  let relaxed = false;
  if (selected.length < MIN_PER_COURSE) {
    relaxed = true;
    for (const candidate of candidates) {
      if (selected.length >= MIN_PER_COURSE) break;
      tryAdd(candidate, 10);
    }
  }

  for (const candidate of candidates) {
    if (selectedIds.has(candidate.line.id)) continue;
    const fenTwin = selected.find((kept) => kept.fen === candidate.fen);
    const twin12 = selected.find(
      (kept) => commonPrefix(kept.san, candidate.san) >= LCP_PLIES,
    );
    const twin10 = selected.find(
      (kept) => commonPrefix(kept.san, candidate.san) >= 10,
    );
    const reason = fenTwin
      ? `same final position as ${fenTwin.line.id}`
      : twin12
        ? `shares its first ${LCP_PLIES} plies with ${twin12.line.id}`
        : twin10
          ? `shares its first 10 plies with ${twin10.line.id}`
          : `over the ${MAX_PER_COURSE}-line cap`;
    hidden.push({
      id: candidate.line.id,
      name: candidate.line.name,
      plies: candidate.san.length,
      reason,
    });
  }

  return {
    selected: selected.map((item) => item.line),
    hidden,
    relaxed,
  };
}

function main() {
  const courses: Record<
    string,
    {
      total: number;
      curated: string[];
      tiers: Record<string, LineTier>;
      hidden: string[];
      counts: { beginner: number; intermediate: number; advanced: number };
      relaxed: boolean;
    }
  > = {};
  const report: string[] = [
    "# Curated study lines",
    "",
    `Generated by \`npm run curate\`. Rules: at least ${MIN_PLIES} plies, no`,
    `shared first ${LCP_PLIES} plies, no duplicate final position, at most`,
    `${MAX_PER_COURSE} lines per course, target at least ${MIN_PER_COURSE}.`,
    "Nothing is deleted: hidden lines remain available behind \"Show all lines\".",
    "Levels are separate bands: every curated line belongs to exactly one of Beginner, Intermediate or Advanced.",
    "",
    "| Course | Total | Curated | Beginner | Intermediate | Advanced | Hidden |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];

  const hiddenSections: string[] = [];
  const shortCourses: string[] = [];
  const relaxedCourses: string[] = [];

  for (const opening of allOpenings()) {
    const { selected, hidden, relaxed } = selectCourse(opening);
    const tiers = assignTiers(selected);
    const counts = { beginner: 0, intermediate: 0, advanced: 0 };
    for (const tier of Object.values(tiers)) counts[tier] += 1;

    courses[opening.slug] = {
      total: opening.lines.length,
      curated: selected.map((line) => line.id),
      tiers,
      hidden: hidden.map((item) => item.id),
      counts,
      relaxed,
    };

    report.push(
      `| ${opening.name} | ${opening.lines.length} | ${selected.length} | ${counts.beginner} | ${counts.intermediate} | ${counts.advanced} | ${hidden.length} |`,
    );

    if (selected.length < MIN_PER_COURSE) {
      shortCourses.push(`${opening.slug} (${selected.length})`);
    }
    if (relaxed) relaxedCourses.push(opening.slug);

    if (hidden.length) {
      hiddenSections.push(
        "",
        `## ${opening.name}`,
        "",
        "| Line | Plies | Reason |",
        "| --- | ---: | --- |",
        ...hidden.map(
          (item) =>
            `| \`${item.id}\` ${item.name.replace(/\|/g, "\\|")} | ${item.plies} | ${item.reason} |`,
        ),
      );
    }
  }

  writeFileSync(
    "data/curation.json",
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        rules: {
          minPlies: MIN_PLIES,
          lcpPlies: LCP_PLIES,
          maxPerCourse: MAX_PER_COURSE,
          minPerCourse: MIN_PER_COURSE,
        },
        courses,
      },
      null,
      2,
    )}\n`,
  );

  report.push(
    "",
    shortCourses.length
      ? `Courses below the ${MIN_PER_COURSE}-line target: ${shortCourses.join(", ")}.`
      : `Every course reaches the ${MIN_PER_COURSE}-line target.`,
    relaxedCourses.length
      ? `Courses that needed branches from move six: ${relaxedCourses.join(", ")}.`
      : "Every course branches within the first six moves.",
    "",
    "## Hidden lines",
    ...hiddenSections,
    "",
  );
  writeFileSync("review/curation.md", `${report.join("\n")}\n`);

  console.log(
    `Curated ${Object.values(courses).reduce((sum, item) => sum + item.curated.length, 0)} of ${Object.values(courses).reduce((sum, item) => sum + item.total, 0)} lines.`,
  );
  console.log(
    shortCourses.length
      ? `Below ${MIN_PER_COURSE}: ${shortCourses.join(", ")}`
      : `Every course reaches ${MIN_PER_COURSE} lines.`,
  );
  console.log("Wrote data/curation.json and review/curation.md");
}

main();
