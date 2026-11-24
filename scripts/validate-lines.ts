import { Chess } from "chess.js";
import { englishOpening } from "../lib/openings/english";
import { englishIdeas } from "../lib/openings/english-ideas";
import { openings } from "../lib/openings";
import { minSideMovesForLine } from "../lib/openings/short-lines";

const squareRe = /^[a-h][1-8]$/;
let errors = 0;

function fail(owner: string, message: string) {
  errors += 1;
  console.error(`  ✗ [${owner}] ${message}`);
}

/** Piece placement, side to move, castling rights and en passant: no clocks. */
function positionKey(chess: Chess): string {
  return chess.fen().split(" ").slice(0, 4).join(" ");
}

function checkShapes(
  owner: string,
  label: string,
  shapes: { kind: string; square?: string; from?: string; to?: string }[],
) {
  if (!shapes.length) {
    fail(owner, `${label} has no highlight`);
    return;
  }

  for (const shape of shapes) {
    if (shape.kind === "circle") {
      if (!shape.square || !squareRe.test(shape.square)) {
        fail(owner, `${label} bad square "${shape.square ?? ""}"`);
      }
    } else if (shape.kind === "arrow") {
      if (
        !shape.from ||
        !shape.to ||
        !squareRe.test(shape.from) ||
        !squareRe.test(shape.to)
      ) {
        fail(
          owner,
          `${label} bad arrow "${shape.from ?? ""}" -> "${shape.to ?? ""}"`,
        );
      }
    } else {
      fail(owner, `${label} unknown shape kind "${shape.kind}"`);
    }
  }
}

function checkHotspots(
  owner: string,
  label: string,
  text: string,
  hotspots: { id: string; phrases: string[]; label: string; shapes: unknown[] }[] | undefined,
) {
  if (!hotspots) return;
  const lower = text.toLowerCase();

  for (const hotspot of hotspots) {
    if (!hotspot.id.trim()) fail(owner, `${label} hotspot has no id`);
    if (!hotspot.label.trim()) fail(owner, `${label} hotspot has no label`);
    if (!hotspot.phrases.length) {
      fail(owner, `${label} hotspot "${hotspot.id}" has no phrases`);
    }
    for (const phrase of hotspot.phrases) {
      if (!phrase.trim()) {
        fail(owner, `${label} hotspot "${hotspot.id}" has an empty phrase`);
      } else if (!lower.includes(phrase.toLowerCase())) {
        fail(
          owner,
          `${label} hotspot phrase "${phrase}" does not appear in the text`,
        );
      }
    }
    checkShapes(
      owner,
      `${label} hotspot "${hotspot.id}"`,
      hotspot.shapes as {
        kind: string;
        square?: string;
        from?: string;
        to?: string;
      }[],
    );
  }
}

const seenLineIds = new Set<string>();
const seenSlugs = new Set<string>();
const seenHotspotIds = new Set<string>();

for (const opening of openings) {
  if (seenSlugs.has(opening.slug)) {
    fail(opening.slug, "duplicate opening slug");
  }
  seenSlugs.add(opening.slug);

  if (!opening.lines.length) {
    fail(opening.slug, "opening has no lines");
  }

  if (!["white", "black"].includes(opening.side)) {
    fail(opening.slug, `bad opening side "${opening.side}"`);
  }

  for (const line of opening.lines) {
    const owner = `${opening.slug}/${line.id}`;
    if (seenLineIds.has(line.id)) fail(owner, "duplicate line id");
    seenLineIds.add(line.id);

    if (line.side !== opening.side) {
      fail(owner, `line side "${line.side}" does not match opening side`);
    }

    const chess = new Chess();
    const positions = new Set<string>([positionKey(chess)]);
    let userMoves = 0;

    if (!line.sources?.length) {
      fail(owner, "line has no sources");
    } else {
      for (const source of line.sources) {
        if (!/^https?:\/\//.test(source.url)) {
          fail(owner, `source "${source.label}" has a bad URL`);
        }
      }
    }

    line.moves.forEach((move, i) => {
      const isWhite = i % 2 === 0;
      const isUserMove = line.side === (isWhite ? "white" : "black");
      if (isUserMove) userMoves += 1;

      try {
        chess.move(move.san);
      } catch (e) {
        fail(
          owner,
          `ply ${i + 1} (${isWhite ? "White" : "Black"}) illegal move "${move.san}" — ${(e as Error).message}\n    fen before: ${chess.fen()}`,
        );
        return;
      }

      const position = positionKey(chess);
      if (positions.has(position)) {
        fail(
          owner,
          `ply ${i + 1} (${move.san}) repeats an earlier position`,
        );
      }
      positions.add(position);

      if (!move.idea) {
        fail(owner, `ply ${i + 1} (${move.san}) has no idea`);
      } else {
        const text = move.idea.text.trim();
        if (text.length < 8) {
          fail(owner, `ply ${i + 1} (${move.san}) idea is too short`);
        }
        if (text.length > 170) {
          fail(
            owner,
            `ply ${i + 1} (${move.san}) idea is ${text.length} chars; keep it under 170`,
          );
        }
        checkShapes(owner, `idea for ${move.san}`, move.idea.shapes);
        checkHotspots(
          owner,
          `idea for ${move.san}`,
          text,
          move.idea.hotspots,
        );
      }

      for (const point of move.coach ?? []) {
        if (!["blue", "green", "orange"].includes(point.color)) {
          fail(owner, `coach "${point.id}" has bad colour "${point.color}"`);
        }
        if (!point.text.trim()) {
          fail(owner, `coach "${point.id}" has no text`);
        }
        if (seenHotspotIds.has(point.id)) {
          fail(owner, `duplicate coach id "${point.id}"`);
        }
        seenHotspotIds.add(point.id);
        checkShapes(owner, `coach "${point.id}"`, point.shapes);
        checkHotspots(
          owner,
          `coach "${point.id}"`,
          point.text,
          point.hotspots,
        );
      }
    });

    const minMoves = minSideMovesForLine(line.name);
    if (userMoves < minMoves) {
      fail(
        owner,
        `line is too short (${userMoves} moves for your side, need ${minMoves})`,
      );
    }
  }
}

for (const id of Object.keys(englishIdeas)) {
  const exists = englishOpening.lines.some((line) => line.id === id);
  if (!exists) fail(id, "English idea list has no matching line");
}

// Exact per-course counts are owned by `data/curation.json` and checked by
// `validate-curation.ts`. This file only guarantees that the catalogue is not
// empty and that every move is legal, explained and highlighted, so the
// master-game expansion can grow a course without editing a second list.

const plies = openings.reduce(
  (total, opening) =>
    total +
    opening.lines.reduce((sum, line) => sum + line.moves.length, 0),
  0,
);
const totalLines = openings.reduce(
  (total, opening) => total + opening.lines.length,
  0,
);
const notes = openings.reduce(
  (total, opening) =>
    total +
    opening.lines.reduce(
      (sum, line) =>
        sum + line.moves.reduce((n, move) => n + (move.coach?.length ?? 0), 0),
      0,
    ),
  0,
);

console.log(
  `\nChecked ${openings.length} openings, ${totalLines} lines, ${plies} plies, ${plies} ideas, ${notes} deep notes.`,
);
if (errors) {
  console.error(`\n${errors} error(s) found.`);
  process.exit(1);
}
console.log("✓ All openings, lines, ideas, sources, shapes and hotspots are valid.\n");
