import type { Opening, OpeningLine } from "./types";

/**
 * Famous short lines that are deliberately kept as entry points even though a
 * longer named continuation exists. They are useful to study on their own and
 * are never deleted by the duplicate cleanup.
 */
const PARTIAL_ENTRY_PREFIXES = [
  "Danish Gambit",
  "Scotch Game",
  "Fried Liver",
  "Scotch Gambit",
  "Englund Gambit",
];

type NamedMoves = {
  id: string;
  name: string;
  moves: string[];
};

export function isPartialEntryName(name: string): boolean {
  return PARTIAL_ENTRY_PREFIXES.some((prefix) => name.startsWith(prefix));
}

export function isMovePrefix(short: string[], long: string[]): boolean {
  return (
    short.length < long.length &&
    short.every((san, index) => san === long[index])
  );
}

/** IDs of short entry lines that have a longer continuation in the same course. */
export function partialLineIds(lines: readonly NamedMoves[]): Set<string> {
  const ids = new Set<string>();
  for (const line of lines) {
    if (!isPartialEntryName(line.name)) continue;
    if (
      lines.some(
        (other) =>
          other.id !== line.id && isMovePrefix(line.moves, other.moves),
      )
    ) {
      ids.add(line.id);
    }
  }
  return ids;
}

/** Metadata-only pass for openings that are assembled outside buildOpening. */
export function markPartialLines(
  opening: Opening,
  ids?: Set<string>,
): Opening {
  const partialIds =
    ids ??
    partialLineIds(
      opening.lines.map((line) => ({
        id: line.id,
        name: line.name,
        moves: line.moves.map((move) => move.san),
      })),
    );
  if (!partialIds.size) return opening;

  return {
    ...opening,
    lines: opening.lines.map<OpeningLine>((line) =>
      partialIds.has(line.id) ? { ...line, partial: true } : line,
    ),
  };
}
