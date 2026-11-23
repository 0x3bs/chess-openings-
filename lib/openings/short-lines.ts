/**
 * Famous short lines that are worth training even though they finish before
 * the usual six moves for the trainer's side.
 *
 * `validate-lines.ts` and the Lichess importer share this list so a line that
 * is imported is never rejected later for being "too short".
 */
const SHORT_LINE_PREFIXES = [
  "Danish Gambit",
  "Scotch Game",
  "Fried Liver",
  "Scotch Gambit",
  "Englund Gambit",
];

export function minSideMovesForLine(name: string): number {
  return SHORT_LINE_PREFIXES.some((prefix) => name.startsWith(prefix)) ? 3 : 6;
}
