import { Chess } from "chess.js";
import type { LineMove, OpeningLine } from "./openings/types";

export type Position = {
  fen: string;
  lastMove: [string, string] | null;
  move: LineMove | null;
  ply: number;
  turn: "white" | "black";
};

/** Build every position of a line, including the starting position. */
export function buildPositions(line: OpeningLine): Position[] {
  const chess = new Chess();
  const positions: Position[] = [
    {
      fen: chess.fen(),
      lastMove: null,
      move: null,
      ply: 0,
      turn: "white",
    },
  ];

  line.moves.forEach((move, index) => {
    const played = chess.move(move.san);
    positions.push({
      fen: chess.fen(),
      lastMove: [played.from, played.to],
      move,
      ply: index + 1,
      turn: chess.turn() === "w" ? "white" : "black",
    });
  });

  return positions;
}

/** All legal destinations, grouped by origin square, for chessground. */
export function legalDests(fen: string): Map<string, string[]> {
  const chess = new Chess(fen);
  const dests = new Map<string, string[]>();

  for (const move of chess.moves({ verbose: true })) {
    const existing = dests.get(move.from);
    if (existing) {
      if (!existing.includes(move.to)) existing.push(move.to);
    } else {
      dests.set(move.from, [move.to]);
    }
  }

  return dests;
}

/** SAN for a from/to pair, or null when the move is illegal. */
export function sanForMove(
  fen: string,
  from: string,
  to: string,
  promotion = "q",
): string | null {
  try {
    const chess = new Chess(fen);
    const move = chess.move({ from, to, promotion });
    return move?.san ?? null;
  } catch {
    return null;
  }
}
