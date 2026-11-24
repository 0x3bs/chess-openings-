import { Chess, type Move, type Square } from "chess.js";
import type { OpeningLine } from "./types";

export type StoredLineIdea = {
  lineId: string;
  en: string;
  ar: string;
  source: "auto-generated";
  evalCp: number;
  distinguishingMove: string | null;
};

export type LineFacts = {
  chess: Chess;
  moves: Move[];
  san: Set<string>;
  squares: Set<string>;
  finalFen: string;
};

const SAN_PATTERN =
  /\b(?:O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?|[a-h][1-8](?:=[QRBN])?[+#]?)\b/g;

const SQUARE_PATTERN = /\b[a-h][1-8]\b/g;

const EN_PIECE: Record<string, string> = {
  pawn: "p",
  knight: "n",
  bishop: "b",
  rook: "r",
  queen: "q",
  king: "k",
};

const AR_PIECE: Record<string, string> = {
  بيدق: "p",
  حصان: "n",
  فيل: "b",
  رخ: "r",
  ملكة: "q",
  ملك: "k",
};

export function buildLineFacts(line: OpeningLine): LineFacts {
  const chess = new Chess();
  const moves: Move[] = [];
  const san = new Set<string>();
  const squares = new Set<string>();

  for (const step of line.moves) {
    const played = chess.move(step.san);
    moves.push(played);
    san.add(played.san.replace(/[+#]/g, ""));
    squares.add(played.from);
    squares.add(played.to);
  }

  return { chess, moves, san, squares, finalFen: chess.fen() };
}

function sentenceCount(text: string): number {
  return text
    .split(/[.!?؟]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

function checkSanAndSquares(text: string, facts: LineFacts): string[] {
  const reasons: string[] = [];

  for (const match of text.matchAll(SAN_PATTERN)) {
    const raw = match[0];
    const token = raw.replace(/[+#]$/, "");

    if (/^[a-h][1-8]$/.test(token)) {
      if (!facts.squares.has(token)) {
        reasons.push(`square ${token} is not touched by this line`);
      }
      continue;
    }

    if (!facts.san.has(token)) {
      reasons.push(`move ${raw} is not in this line`);
    }
  }

  for (const match of text.matchAll(SQUARE_PATTERN)) {
    if (!facts.squares.has(match[0])) {
      reasons.push(`square ${match[0]} is not touched by this line`);
    }
  }

  return reasons;
}

function checkPiecePlacement(text: string, facts: LineFacts): string[] {
  const reasons: string[] = [];

  const en = /\b(pawn|knight|bishop|rook|queen|king)\s+(?:on|at)\s+([a-h][1-8])\b/gi;
  for (const match of text.matchAll(en)) {
    const expected = EN_PIECE[match[1].toLowerCase()];
    const square = match[2] as Square;
    const piece = facts.chess.get(square);
    if (!piece || piece.type !== expected) {
      reasons.push(`${match[1]} is not on ${match[2]} in the final position`);
    }
  }

  const ar = /(بيدق|حصان|فيل|رخ|ملكة|ملك)\s+(?:على|في)\s+([a-h][1-8])/g;
  for (const match of text.matchAll(ar)) {
    const expected = AR_PIECE[match[1]];
    const square = match[2] as Square;
    const piece = facts.chess.get(square);
    if (!piece || piece.type !== expected) {
      reasons.push(`${match[1]} ليس على ${match[2]} في الوضع النهائي`);
    }
  }

  return reasons;
}

function checkEvalLanguage(text: string, evalCp: number): string[] {
  const reasons: string[] = [];

  // Only explicit verdicts are checked, so a variation called "the trap" or
  // "the losing line" in a name cannot trip the rule.
  const decisive =
    /decisive advantage|winning position|تفوق حاسم|فوز حاسم|وضع فائز/i.test(
      text,
    );
  const losing = /\b(?:is|are|remains?)\s+losing\b|موقف خاسر|وضع خاسر/i.test(
    text,
  );

  if (decisive && Math.abs(evalCp) < 500) {
    reasons.push("decisive/winning language below 500cp");
  }
  if (losing && evalCp > -500) {
    reasons.push("losing language above -500cp");
  }

  return reasons;
}

/** Text-only checks shared by the generator and the committed-data validator. */
export function validateIdeaText(
  text: string,
  facts: LineFacts,
  evalCp: number,
): string[] {
  const reasons: string[] = [];
  if (!text.trim()) {
    reasons.push("empty explanation");
    return reasons;
  }
  if (sentenceCount(text) > 2) {
    reasons.push("more than two sentences");
  }
  reasons.push(...checkSanAndSquares(text, facts));
  reasons.push(...checkPiecePlacement(text, facts));
  reasons.push(...checkEvalLanguage(text, evalCp));
  return reasons;
}

/**
 * Words that carry meaning for the duplicate check. Squares are kept even
 * though they are only two characters: "the queen move to a5" and "the queen
 * move to d8" are different notes.
 */
export function ideaTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 3 || /^[a-h][1-8]$/.test(word)),
  );
}

export function jaccard(left: Set<string>, right: Set<string>): number {
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const token of left) {
    if (right.has(token)) shared += 1;
  }
  return shared / (left.size + right.size - shared);
}

export function isNearDuplicate(
  text: string,
  previous: readonly string[],
  threshold = 0.85,
): boolean {
  const tokens = ideaTokens(text);
  return previous.some((other) => jaccard(tokens, ideaTokens(other)) >= threshold);
}
