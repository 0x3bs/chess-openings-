/**
 * Verify the committed parent notes and line explanations. This script never
 * deletes data: the generator drops bad notes, while this gate fails loudly if
 * a bad note ever reaches the repository.
 */
import { readFileSync } from "node:fs";
import { openings } from "../lib/openings";
import {
  buildLineFacts,
  isNearDuplicate,
  validateIdeaText,
  type StoredLineIdea,
} from "../lib/openings/idea-validation";
import type { OpeningLine } from "../lib/openings/types";

type Bilingual = { en: string; ar: string };
type ParentIdea = {
  name: string;
  overview: Bilingual;
  whitePlan: Bilingual;
  blackPlan: Bilingual;
  pawnStructure: Bilingual;
  commonMistake: Bilingual;
  source: string;
};

const PARENT_FIELDS: Array<keyof ParentIdea> = [
  "overview",
  "whitePlan",
  "blackPlan",
  "pawnStructure",
  "commonMistake",
];

const errors: string[] = [];

function fail(message: string): void {
  errors.push(message);
}

function sentenceCount(text: string): number {
  return text
    .split(/[.!?؟]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

function checkParentIdeas(): void {
  const parents = JSON.parse(
    readFileSync("data/parent-ideas.json", "utf8"),
  ) as Record<string, ParentIdea>;

  for (const opening of openings) {
    const parent = parents[opening.slug];
    if (!parent) {
      fail(`${opening.slug}: missing parent explanation`);
      continue;
    }
    if (parent.source !== "manual") {
      fail(`${opening.slug}: parent source must be "manual"`);
    }
    for (const field of PARENT_FIELDS) {
      const value = parent[field];
      if (typeof value !== "object" || !value.en?.trim() || !value.ar?.trim()) {
        fail(`${opening.slug}: ${String(field)} must have English and Arabic text`);
        continue;
      }
      if (sentenceCount(value.en) > 1) {
        fail(`${opening.slug}: ${String(field)} English is longer than one sentence`);
      }
      if (sentenceCount(value.ar) > 1) {
        fail(`${opening.slug}: ${String(field)} Arabic is longer than one sentence`);
      }
    }
  }
}

function main(): void {
  checkParentIdeas();

  const data = JSON.parse(
    readFileSync("data/line-ideas.json", "utf8"),
  ) as {
    totalLines: number;
    accepted: number;
    rejected: number;
    lines: StoredLineIdea[];
  };

  const lineById = new Map<
    string,
    { line: OpeningLine; parentKey: string; opening: string }
  >();
  for (const opening of openings) {
    for (const line of opening.lines) {
      lineById.set(line.id, {
        line,
        parentKey: line.parentName ?? opening.name,
        opening: opening.slug,
      });
    }
  }

  const seenIds = new Set<string>();
  const seenByParent = new Map<string, { en: string[]; ar: string[] }>();
  let accepted = 0;

  for (const idea of data.lines) {
    const label = idea.lineId || "(missing id)";
    if (seenIds.has(idea.lineId)) {
      fail(`${label}: duplicate explanation entry`);
      continue;
    }
    seenIds.add(idea.lineId);

    const entry = lineById.get(idea.lineId);
    if (!entry) {
      fail(`${label}: no matching line`);
      continue;
    }
    if (idea.source !== "auto-generated") {
      fail(`${label}: source must be "auto-generated"`);
    }
    if (!Number.isFinite(idea.evalCp)) {
      fail(`${label}: evalCp must be a finite number`);
    }
    if (!/[\u0600-\u06FF]/.test(idea.ar)) {
      fail(`${label}: Arabic explanation has no Arabic text`);
    }

    const facts = buildLineFacts(entry.line);
    const reasons = [
      ...validateIdeaText(idea.en, facts, idea.evalCp),
      ...validateIdeaText(idea.ar, facts, idea.evalCp),
    ];

    if (
      idea.distinguishingMove !== null &&
      !facts.san.has(idea.distinguishingMove.replace(/[+#]$/, ""))
    ) {
      reasons.push(
        `distinguishing move ${idea.distinguishingMove} is not in the line`,
      );
    }

    const seen = seenByParent.get(entry.parentKey) ?? { en: [], ar: [] };
    if (isNearDuplicate(idea.en, seen.en)) {
      reasons.push("near-duplicate English explanation");
    }
    if (isNearDuplicate(idea.ar, seen.ar)) {
      reasons.push("near-duplicate Arabic explanation");
    }

    if (reasons.length) {
      fail(`${entry.opening} / ${entry.line.name} [${label}]: ${reasons.join("; ")}`);
      continue;
    }

    accepted += 1;
    seen.en.push(idea.en);
    seen.ar.push(idea.ar);
    seenByParent.set(entry.parentKey, seen);
  }

  if (data.lines.length !== accepted) {
    fail(
      `accepted count mismatch: ${data.lines.length} entries, ${accepted} valid`,
    );
  }
  if (data.accepted !== accepted) {
    fail(`metadata says ${data.accepted} accepted, found ${accepted}`);
  }
  if (data.totalLines !== accepted + data.rejected) {
    fail(
      `metadata total ${data.totalLines} != accepted ${accepted} + rejected ${data.rejected}`,
    );
  }

  if (errors.length) {
    console.error(`✗ ${errors.length} idea problem(s):`);
    for (const error of errors.slice(0, 40)) console.error(`  - ${error}`);
    if (errors.length > 40) {
      console.error(`  … and ${errors.length - 40} more`);
    }
    process.exit(1);
  }

  const totalLines = openings.reduce(
    (sum, opening) => sum + opening.lines.length,
    0,
  );
  console.log(
    `Checked ${accepted} line explanations and ${openings.length} parent explanations ` +
      `(${accepted}/${totalLines} lines explained).`,
  );
  console.log("✓ Every committed explanation passes the text and duplicate checks.");
}

main();
