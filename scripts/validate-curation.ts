/**
 * Curation gate.
 *
 * Fails if a course has no curated study set, if the beginner → intermediate →
 * advanced stages are not cumulative, if a curated line is too short, or if two
 * curated lines are still move-order twins / share their first twelve plies.
 *
 * Run with `npm run validate:curation` (also part of `npm run check`).
 */
import { Chess } from "chess.js";
import { CURATION_RULES } from "../lib/openings/curation";
import { openings } from "../lib/openings";
import type { LineTier, OpeningLine } from "../lib/openings/types";

let errors = 0;

function fail(message: string): void {
  errors += 1;
  console.error(`  ✗ ${message}`);
}

function finalFen(line: OpeningLine): string {
  const chess = new Chess();
  for (const move of line.moves) chess.move(move.san);
  return chess.fen().split(" ").slice(0, 4).join(" ");
}

function commonPrefix(a: string[], b: string[]): number {
  let index = 0;
  while (index < a.length && index < b.length && a[index] === b[index]) {
    index += 1;
  }
  return index;
}

const TIERS: LineTier[] = ["beginner", "intermediate", "advanced"];

let curatedTotal = 0;
let hiddenTotal = 0;

for (const opening of openings) {
  const curated = opening.lines.filter((line) => line.curated);
  const hidden = opening.lines.length - curated.length;
  curatedTotal += curated.length;
  hiddenTotal += hidden;

  if (!curated.length) {
    fail(`${opening.slug}: no curated lines`);
    continue;
  }
  if (curated.length > CURATION_RULES.maxPerCourse) {
    fail(
      `${opening.slug}: ${curated.length} curated lines exceed the ${CURATION_RULES.maxPerCourse} cap`,
    );
  }
  if (curated.length < CURATION_RULES.minPerCourse) {
    fail(
      `${opening.slug}: only ${curated.length} curated lines (target ${CURATION_RULES.minPerCourse})`,
    );
  }

  const tierCount: Record<LineTier, number> = {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
  };
  for (const line of curated) {
    const san = line.moves.map((move) => move.san);
    if (!line.tier) {
      fail(`${opening.slug}/${line.id}: missing tier`);
      continue;
    }
    tierCount[line.tier] += 1;
    if (san.length < CURATION_RULES.minPlies) {
      fail(
        `${opening.slug}/${line.id}: ${san.length} plies is shorter than ${CURATION_RULES.minPlies}`,
      );
    }
  }

  // Each line gets exactly one tier; the course view is cumulative, so check
  // the running totals rather than the disjoint per-tier counts.
  const running = {
    beginner: tierCount.beginner,
    intermediate: tierCount.beginner + tierCount.intermediate,
    advanced:
      tierCount.beginner + tierCount.intermediate + tierCount.advanced,
  };
  const cumulative =
    running.beginner > 0 &&
    running.intermediate > running.beginner &&
    running.advanced > running.intermediate;
  if (!cumulative) {
    fail(
      `${opening.slug}: tiers are not cumulative (${TIERS.map((tier) => `${tier}=${running[tier]}`).join(", ")})`,
    );
  }

  const fens = new Map<string, string>();
  for (const line of curated) {
    const fen = finalFen(line);
    const twin = fens.get(fen);
    if (twin) {
      fail(
        `${opening.slug}/${line.id}: same final position as ${twin}`,
      );
    } else {
      fens.set(fen, line.id);
    }
  }

  const sanLines = curated.map((line) => ({
    id: line.id,
    san: line.moves.map((move) => move.san),
  }));
  for (let i = 0; i < sanLines.length; i += 1) {
    for (let j = i + 1; j < sanLines.length; j += 1) {
      const shared = commonPrefix(sanLines[i].san, sanLines[j].san);
      if (shared >= CURATION_RULES.lcpPlies) {
        fail(
          `${opening.slug}/${sanLines[i].id} and ${sanLines[j].id} share ${shared} plies`,
        );
      }
    }
  }
}

const tierTotals: Record<LineTier, number> = {
  beginner: 0,
  intermediate: 0,
  advanced: 0,
};
for (const opening of openings) {
  for (const line of opening.lines) {
    if (line.curated && line.tier) tierTotals[line.tier] += 1;
  }
}

if (errors) {
  console.error(`\nCuration check failed with ${errors} error(s).`);
  process.exit(1);
}

console.log(
  `Checked ${openings.length} courses: ${curatedTotal} curated lines, ${hiddenTotal} extra lines kept behind "Show all lines".`,
);
console.log(
  `Tier split: beginner ${tierTotals.beginner}, intermediate ${tierTotals.intermediate}, advanced ${tierTotals.advanced}.`,
);
console.log("✓ Every course has a diverse, cumulative study set.");
