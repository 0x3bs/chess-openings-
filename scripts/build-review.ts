/**
 * Build the human review files from the generated data:
 *   review/top-100.md        curated study list, English + Arabic
 *   review/random-sample.md  seeded 5% sample for spot-checking
 *   review/report.md         generation and rejection report
 */
import { readFileSync, writeFileSync } from "node:fs";
import { openings } from "../lib/openings";
import type { Opening, OpeningLine } from "../lib/openings/types";

type StoredLineIdea = {
  lineId: string;
  en: string;
  ar: string;
  source: string;
  evalCp: number;
  distinguishingMove: string | null;
};

type IdeaFile = {
  generatedAt: string;
  engine: string;
  totalLines: number;
  accepted: number;
  rejected: number;
  lines: StoredLineIdea[];
};

type Rejection = {
  lineId: string;
  name: string;
  opening: string;
  reasons: string[];
  en: string;
  ar: string;
};

type IdeaReport = {
  generatedAt: string;
  totalLines: number;
  accepted: number;
  rejectedCount: number;
  reasonCounts: Record<string, number>;
  perOpening: Record<string, { total: number; accepted: number }>;
  rejected: Rejection[];
};

type AuditEntry = {
  opening: string;
  lineId: string;
  name: string;
  side: string;
  flags: Array<{ kind: string; ply: number; san: string; detail: string }>;
};

const SEED = Number(process.env.REVIEW_SEED ?? 20261124);
const SAMPLE_RATE = 0.05;

const ideas = JSON.parse(
  readFileSync("data/line-ideas.json", "utf8"),
) as IdeaFile;
const report = JSON.parse(
  readFileSync("review/idea-report.json", "utf8"),
) as IdeaReport;

let audit: AuditEntry[] = [];
try {
  audit = JSON.parse(
    readFileSync("scripts/audit-report.json", "utf8"),
  ) as AuditEntry[];
} catch {
  console.warn("No scripts/audit-report.json; review files skip audit flags.");
}

const flagged = new Set(audit.map((entry) => entry.lineId));

const ideaById = new Map(ideas.lines.map((idea) => [idea.lineId, idea]));

type Entry = { opening: Opening; line: OpeningLine; idea: StoredLineIdea };

const allEntries: Entry[] = [];
for (const opening of openings) {
  for (const line of opening.lines) {
    const idea = ideaById.get(line.id);
    if (idea) allEntries.push({ opening, line, idea });
  }
}

const levelRank: Record<string, number> = { common: 0, basic: 1, advanced: 2 };

function studyRank(left: Entry, right: Entry): number {
  const level =
    (levelRank[left.line.level ?? "basic"] ?? 1) -
    (levelRank[right.line.level ?? "basic"] ?? 1);
  if (level !== 0) return level;
  const length = right.line.moves.length - left.line.moves.length;
  if (length !== 0) return length;
  return left.line.id.localeCompare(right.line.id);
}

function eligible(entry: Entry): boolean {
  return !entry.line.partial && !flagged.has(entry.line.id);
}

function movesText(line: OpeningLine): string {
  return line.moves
    .map((move, index) =>
      index % 2 === 0 ? `${index / 2 + 1}.${move.san}` : move.san,
    )
    .join(" ");
}

function entryBlock(entry: Entry, index: number): string {
  const { opening, line, idea } = entry;
  const side = line.side === "white" ? "White" : "Black";
  const flags = flagged.has(line.id) ? " · audit-flagged" : "";
  return [
    `### ${index}. ${opening.name} — ${line.name} (${line.eco})`,
    "",
    `\`${movesText(line)}\` · ${side} · ${line.moves.length} plies${flags}`,
    "",
    `**EN** — ${idea.en}`,
    "",
    `**AR** — ${idea.ar}`,
    "",
  ].join("\n");
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildTop100(): string {
  const perCourse = new Map<string, Entry[]>();
  for (const opening of openings) perCourse.set(opening.slug, []);
  for (const entry of allEntries) {
    if (!eligible(entry)) continue;
    perCourse.get(entry.opening.slug)?.push(entry);
  }
  for (const list of perCourse.values()) list.sort(studyRank);

  const chosen: Entry[] = [];
  const cursors = new Map<string, number>();
  for (const opening of openings) cursors.set(opening.slug, 0);

  while (chosen.length < 100) {
    let added = false;
    for (const opening of openings) {
      if (chosen.length >= 100) break;
      const cursor = cursors.get(opening.slug) ?? 0;
      const list = perCourse.get(opening.slug) ?? [];
      if (cursor >= list.length || cursor >= 4) continue;
      chosen.push(list[cursor]);
      cursors.set(opening.slug, cursor + 1);
      added = true;
    }
    if (!added) break;
  }

  const header = [
    "# Top 100 study lines",
    "",
    `Generated ${ideas.generatedAt} from the CC0 Lichess opening data.`,
    "",
    "Selection: up to four lines per course, taken round-robin so every course",
    "appears. Within a course, `common` lines come first, then longer lines.",
    "Famous short entries marked `partial` and lines flagged by the Stockfish",
    "audit are excluded, so this list is safe to study first.",
    "",
    `Lines in this list: **${chosen.length}**.`,
    "",
  ].join("\n");

  return `${header}\n${chosen
    .map((entry, index) => entryBlock(entry, index + 1))
    .join("\n")}`;
}

function buildRandomSample(): string {
  const random = mulberry32(SEED);
  const pool = allEntries.slice();
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  const size = Math.max(1, Math.round(pool.length * SAMPLE_RATE));
  const sample = pool.slice(0, size);

  const header = [
    "# Random explanation sample",
    "",
    `Seed \`${SEED}\`, ${Math.round(SAMPLE_RATE * 100)}% of the ${pool.length} explained lines.`,
    "Re-run with `REVIEW_SEED=<n> npm run review:notes` for a different draw.",
    "",
    `Lines in this sample: **${sample.length}**.`,
    "",
  ].join("\n");

  return `${header}\n${sample
    .map((entry, index) => entryBlock(entry, index + 1))
    .join("\n")}`;
}

function buildReport(): string {
  const perCourseRows = openings.map((opening) => {
    const stats = report.perOpening[opening.slug] ?? {
      total: opening.lines.length,
      accepted: 0,
    };
    const partial = opening.lines.filter((line) => line.partial).length;
    const flaggedHere = opening.lines.filter((line) => flagged.has(line.id)).length;
    return `| ${opening.name} | ${stats.total} | ${stats.accepted} | ${
      stats.total - stats.accepted
    } | ${partial} | ${flaggedHere} |`;
  });

  const reasonRows = Object.entries(report.reasonCounts)
    .sort((left, right) => right[1] - left[1])
    .map(([reason, count]) => `| ${reason} | ${count} |`);

  const examples = report.rejected
    .filter((entry) => entry.reasons.some((reason) => reason.includes("near-duplicate")))
    .slice(0, 5)
    .map(
      (entry) =>
        `- **${entry.name}** (\`${entry.lineId}\`) — ${entry.reasons.join(", ")}\n  - EN: ${entry.en || "(no draft)"}`,
    );

  const partialLines = openings.flatMap((opening) =>
    opening.lines
      .filter((line) => line.partial)
      .map((line) => `- ${opening.name} — ${line.name} (${line.eco})`),
  );

  return [
    "# Explanation generation report",
    "",
    `Generated ${ideas.generatedAt} with ${ideas.engine}.`,
    "",
    "## Totals",
    "",
    `- Named lines in the catalogue: **${ideas.totalLines}**`,
    `- Lines with an accepted explanation: **${ideas.accepted}**`,
    `- Lines without an explanation: **${ideas.rejected}**`,
    `- Parent-course notes: **${openings.length}** (English + Arabic, \`source: "manual"\`)`,
    `- Explanations in \`review/top-100.md\`: see that file`,
    "",
    "Every line note is written by `scripts/generate-ideas.ts` from three facts:",
    "the branch move of the line, the length and last move of the line, and a",
    "Stockfish depth-12 evaluation of the final position, combined with one",
    "sentence from the parent-course note. `scripts/validate-ideas.ts` re-checks",
    "the committed text (two sentences at most, only moves and squares that",
    "occur in the line, no evaluation contradiction, no near-duplicate note",
    "inside the same parent) and fails the build if anything slips through.",
    "",
    "## Per course",
    "",
    "| Course | Lines | Explained | No note | Partial | Audit-flagged |",
    "| --- | --- | --- | --- | --- | --- |",
    ...perCourseRows,
    "",
    "## Why a line has no note",
    "",
    "| Reason | Lines |",
    "| --- | --- |",
    ...reasonRows,
    "",
    "A dropped note is never shipped: the line still appears in the trainer and",
    "simply shows no explanation. Nothing is deleted silently.",
    "",
    "### Examples of dropped near-duplicates",
    "",
    ...(examples.length ? examples : ["- (none this run)"]),
    "",
    "## Famous short lines kept on purpose",
    "",
    "These entries are real named short lines that also have a longer named",
    "continuation. They stay in the catalogue with `partial: true` and are left",
    "out of the top-100 study list.",
    "",
    ...partialLines,
    "",
    "## Audit flags",
    "",
    `The Stockfish audit reports **${audit.length}** lines with at least one flag`,
    "(gambits, traps and forced material lines). They are kept because they are",
    "real theory, and they are excluded from the top-100 list. Full details:",
    "`scripts/audit-report.json`.",
    "",
    "## Other review files",
    "",
    "- `review/duplicate-lines.md` — prefix duplicates removed during import",
    "- `review/unmapped.md` — dataset rows that could not be mapped",
    "- `review/idea-report.json` — machine-readable version of this report",
    "",
  ].join("\n");
}

writeFileSync("review/top-100.md", buildTop100());
writeFileSync("review/random-sample.md", buildRandomSample());
writeFileSync("review/report.md", buildReport());

console.log(
  `Wrote review/top-100.md, review/random-sample.md and review/report.md ` +
    `(${allEntries.length} explained lines available).`,
);
