import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { Chess, type Square } from "chess.js";
import { catalogueBaseOpenings } from "../lib/openings/catalog";
import { englishOpening } from "../lib/openings/english";
import type { Opening } from "../lib/openings/types";

const require = createRequire(import.meta.url);
const stockfish = require("stockfish");

type GeneratedLine = {
  id: string;
  name: string;
  eco: string;
  summary: string;
  tags: string[];
  moves: string[];
};

type Root = {
  name: string;
  eco: string;
  summary: string;
  tags: string[];
  moves: string[];
};

type Candidate = {
  cp: number;
  uci: string;
};

const TARGETS: Record<string, number> = {
  english: 22,
  italian: 26,
  "ruy-lopez": 40,
  scotch: 28,
  vienna: 24,
  "kings-gambit": 24,
  london: 30,
  "jobava-london": 35,
  "bishops-opening": 34,
  ponziani: 30,
  "queens-gambit": 33,
  "queens-gambit-accepted": 28,
  "caro-kann": 35,
  french: 40,
  sicilian: 28,
  scandinavian: 26,
  pirc: 35,
  "kings-indian": 29,
  dutch: 34,
  slav: 33,
  "anti-london": 40,
  petrov: 43,
  "nimzo-indian": 24,
  catalan: 24,
  "fried-liver": 31,
  "kings-indian-attack": 31,
  "open-game": 40,
  "vienna-gambit": 55,
  "white-vs-caro-kann": 23,
  "englund-gambit": 29,
};

const ENGLUND_ROOTS: Root[] = [
  {
    name: "Englund main line",
    eco: "A40",
    summary:
      "Black gives up the e5-pawn and develops with a quick queen check, trying to catch White's loose pieces.",
    tags: ["Englund", "Queen check", "Tactical"],
    moves: "d4 e5 dxe5 Nc6 Nf3 Qe7".split(" "),
  },
  {
    name: "Englund: Qb4+",
    eco: "A40",
    summary:
      "The queen checks on b4 and eyes the b2-pawn, asking White to find a precise block before the tactics start.",
    tags: ["Englund", "Qb4+", "Trap"],
    moves: "d4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+".split(" "),
  },
  {
    name: "Englund: early ...d6",
    eco: "A40",
    summary:
      "Black skips the queen check and hits the e5-pawn, aiming for fast development and open lines.",
    tags: ["Englund", "...d6", "Active pieces"],
    moves: "d4 e5 dxe5 Nc6 Nf3 d6".split(" "),
  },
  {
    name: "Englund: 3.Bf4",
    eco: "A40",
    summary:
      "White develops the bishop before moving the knight, so Black uses the queen to create immediate pressure.",
    tags: ["Englund", "Bf4", "Counterplay"],
    moves: "d4 e5 dxe5 Nc6 Bf4 Qe7".split(" "),
  },
  {
    name: "Englund: 3...Bc5",
    eco: "A40",
    summary:
      "Black develops the bishop actively and keeps the queen free, so the e5-pawn is defended by tactics rather than by a passive retreat.",
    tags: ["Englund", "3...Bc5", "Active bishop"],
    moves: "d4 e5 dxe5 Nc6 Nf3 Bc5".split(" "),
  },
];

const DEPTH = Number(process.env.GEN_DEPTH ?? 10);
const DROP_THRESHOLD = Number(process.env.GEN_DROP ?? 150);
const LOSING_LIMIT = -250;
const ONLY = (process.env.GEN_ONLY ?? "")
  .split(",")
  .map((slug) => slug.trim())
  .filter(Boolean);
const OUTPUT = "lib/openings/generated-lines.json";
const REQUEST_BUFFER = 5;
const MAX_NODES = 700;

let lineHandler: ((line: string) => void) | null = null;
const engine = stockfish("lite-single", (line: string) => lineHandler?.(line));

const cache = new Map<string, Promise<Candidate[]>>();

function evaluateMulti(fen: string, width: number): Promise<Candidate[]> {
  const key = `${fen}|${width}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const promise = new Promise<Candidate[]>((resolve) => {
    const byMultipv = new Map<number, Candidate>();

    lineHandler = (line: string) => {
      if (line.startsWith("info ") && line.includes(" multipv ")) {
        const multipv = Number(line.match(/ multipv (\d+)/)?.[1] ?? 0);
        if (!multipv) return;

        const mate = line.match(/score mate (-?\d+)/);
        const cp = line.match(/score cp (-?\d+)/);
        const pv = line.match(/ pv (.+)$/)?.[1]?.split(" ")[0];
        if (!pv) return;

        const value = mate
          ? Number(mate[1]) > 0
            ? 20000
            : -20000
          : cp
            ? Number(cp[1])
            : null;
        if (value === null) return;

        byMultipv.set(multipv, { cp: value, uci: pv });
      }

      if (line.startsWith("bestmove ")) {
        lineHandler = null;
        resolve(
          [...byMultipv.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([, candidate]) => candidate),
        );
      }
    };

    engine.processCommand(`setoption name MultiPV value ${width}`);
    engine.processCommand(`position fen ${fen}`);
    engine.processCommand(`go depth ${DEPTH}`);
  });

  cache.set(key, promise);
  return promise;
}

function sidePov(cp: number, turn: "w" | "b", side: "white" | "black"): number {
  const sideToMove = turn === "w" ? "white" : "black";
  return sideToMove === side ? cp : -cp;
}

function applyUci(chess: Chess, uci: string) {
  return chess.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.slice(4, 5) || undefined,
  });
}

/** Piece placement, side to move, castling rights and en passant: no clocks. */
function positionKey(chess: Chess): string {
  return chess.fen().split(" ").slice(0, 4).join(" ");
}

function queenSquare(chess: Chess, color: "w" | "b"): Square | null {
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell?.type === "q" && cell.color === color) return cell.square;
    }
  }
  return null;
}

function queenHanging(chess: Chess, color: "w" | "b", captured?: string) {
  if (captured === "q") return false;
  const queen = queenSquare(chess, color);
  if (!queen) return false;

  const defenders = chess
    .attackers(queen, color)
    .filter((square) => square !== queen);
  const captures = chess
    .moves({ verbose: true })
    .filter((move) => move.to === queen && move.captured === "q");

  return captures.length > 0 && defenders.length === 0;
}

function plyLabel(ply: number): string {
  return `${Math.ceil(ply / 2)}${ply % 2 === 1 ? "." : "..."}`;
}

function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function shuffle<T>(items: T[], seed: number): T[] {
  const copy = [...items];
  let state = seed || 1;
  for (let i = copy.length - 1; i > 0; i -= 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const j = Math.abs(state) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function collectLeaves(
  root: Root,
  side: "white" | "black",
  targetPlies: number,
  quota: number,
  width: number,
): Promise<string[][]> {
  const start = new Chess();
  const seenPositions = new Set<string>([positionKey(start)]);
  for (const san of root.moves) {
    start.move(san);
    seenPositions.add(positionKey(start));
  }

  const remaining = Math.max(0, targetPlies - root.moves.length);
  if (remaining === 0) return [[...root.moves]];

  const leaves: string[][] = [];
  const localKeys = new Set<string>();
  const seed = hash(`${root.name}|${root.moves.join(" ")}|${width}`);
  let nodes = 0;

  async function walk(
    chess: Chess,
    path: string[],
    depth: number,
    seen: Set<string>,
  ): Promise<void> {
    if (leaves.length >= quota || nodes >= MAX_NODES) return;
    nodes += 1;

    if (depth === 0) {
      const key = path.join(" ");
      if (!localKeys.has(key)) {
        localKeys.add(key);
        leaves.push([...path]);
      }
      return;
    }

    if (chess.isGameOver()) return;

    const candidates = await evaluateMulti(chess.fen(), width);
    if (!candidates.length) return;

    const bestCp = candidates[0].cp;
    const turn = chess.turn();
    const ordered = shuffle(candidates, seed + depth * 31 + path.length);

    for (const candidate of ordered) {
      const next = new Chess(chess.fen());
      let move;
      try {
        move = applyUci(next, candidate.uci);
      } catch {
        continue;
      }

      const nextKey = positionKey(next);
      if (seen.has(nextKey)) continue;

      const isUserMove = move.color === (side === "white" ? "w" : "b");
      const userPov = sidePov(candidate.cp, turn, side);
      const bestPov = sidePov(bestCp, turn, side);

      if (isUserMove && bestPov - userPov > DROP_THRESHOLD) continue;
      if (userPov <= LOSING_LIMIT) continue;
      if (isUserMove && queenHanging(next, move.color, move.captured)) {
        continue;
      }

      await walk(next, [...path, move.san], depth - 1, new Set([...seen, nextKey]));
      if (leaves.length >= quota || nodes >= MAX_NODES) return;
    }
  }

  await walk(start, [...root.moves], remaining, seenPositions);
  return leaves;
}

async function generateForRoot(
  root: Root,
  side: "white" | "black",
  quota: number,
): Promise<string[][]> {
  const targetPlies = side === "white" ? 12 : 13;
  const attempts = [
    { extra: 0, width: 2 },
    { extra: 2, width: 2 },
    { extra: 0, width: 3 },
    { extra: 2, width: 3 },
  ];

  const pool: string[][] = [];
  const seen = new Set<string>();

  for (const attempt of attempts) {
    if (pool.length >= quota + REQUEST_BUFFER) break;
    const leaves = await collectLeaves(
      root,
      side,
      targetPlies + attempt.extra,
      quota + REQUEST_BUFFER,
      attempt.width,
    );

    for (const leaf of leaves) {
      const key = leaf.join(" ");
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push(leaf);
    }
  }

  return pool;
}

function moveLabel(ply: number, san: string): string {
  return `${Math.ceil(ply / 2)}${ply % 2 === 1 ? "." : "..."}${san}`;
}

/** Names a branch by the moves that actually end it, so picker entries differ. */
function lineName(root: Root, moves: string[]): string {
  const start = Math.max(0, moves.length - 3);
  const label = moves
    .slice(start)
    .map((san, offset) => moveLabel(start + 1 + offset, san))
    .join(" ");
  return `${root.name}: ${label}`;
}

function lineSummary(root: Root, moves: string[]): string {
  const branchPly = root.moves.length + 1;
  const branch = moves[root.moves.length] ?? moves[moves.length - 1];
  const theme = root.tags[0]?.toLowerCase() ?? "main";
  return `${root.summary} This branch reaches ${plyLabel(branchPly)} ${branch} and keeps the ${theme} plan.`;
}

function rootsFor(opening: Opening): Root[] {
  if (opening.slug === "englund-gambit") return ENGLUND_ROOTS;

  const rootPlies = opening.side === "white" ? 5 : 6;
  const seen = new Set<string>();
  const roots: Root[] = [];

  for (const line of opening.lines) {
    if (line.moves.length < rootPlies) continue;
    const moves = line.moves.slice(0, rootPlies).map((move) => move.san);
    const key = moves.join(" ");
    if (seen.has(key)) continue;
    seen.add(key);
    roots.push({
      name: line.name,
      eco: line.eco,
      summary: line.summary,
      tags: line.tags,
      moves,
    });
  }

  return roots;
}

async function main() {
  const baseOpenings = [englishOpening, ...catalogueBaseOpenings];
  const previous = ONLY.length
    ? (JSON.parse(readFileSync(OUTPUT, "utf8")) as Record<string, GeneratedLine[]>)
    : {};
  const result: Record<string, GeneratedLine[]> = { ...previous };

  for (const opening of baseOpenings) {
    if (ONLY.length && !ONLY.includes(opening.slug)) continue;
    const target = TARGETS[opening.slug];
    if (!target) {
      console.warn(`No target for ${opening.slug}; skipping`);
      continue;
    }

    const needed = Math.max(0, target - opening.lines.length);
    if (!needed) {
      result[opening.slug] = [];
      continue;
    }

    const roots = rootsFor(opening);
    if (!roots.length) {
      console.warn(`No roots for ${opening.slug}; skipping`);
      continue;
    }

    const quotas = roots.map(
      (_, index) =>
        Math.floor(needed / roots.length) +
        (index < needed % roots.length ? 1 : 0),
    );

    const pools: string[][][] = [];
    for (let i = 0; i < roots.length; i += 1) {
      const quota = quotas[i] ?? 0;
      if (!quota) {
        pools.push([]);
        continue;
      }
      const pool = await generateForRoot(roots[i], opening.side, quota);
      pools.push(pool);
      console.log(
        `${opening.slug}: ${roots[i].name} -> ${pool.length} leaves (need ${quota})`,
      );
    }

    const existingKeys = new Set(
      opening.lines.map((line) => line.moves.map((move) => move.san).join(" ")),
    );
    const selected: Array<{ root: Root; moves: string[] }> = [];
    const used = new Set(existingKeys);
    const poolIndex = pools.map(() => 0);

    while (selected.length < needed) {
      let progressed = false;

      for (let i = 0; i < roots.length && selected.length < needed; i += 1) {
        const pool = pools[i];
        let cursor = poolIndex[i];

        while (cursor < pool.length) {
          const moves = pool[cursor];
          cursor += 1;
          const key = moves.join(" ");
          if (used.has(key)) continue;
          used.add(key);
          selected.push({ root: roots[i], moves });
          progressed = true;
          break;
        }

        poolIndex[i] = cursor;
      }

      if (!progressed) break;
    }

    if (selected.length < needed) {
      console.warn(
        `${opening.slug}: only ${selected.length}/${needed} generated lines`,
      );
    }

    const nameCounts = new Map<string, number>();

    result[opening.slug] = selected.map(({ root, moves }, index) => {
      const base = lineName(root, moves);
      const seenCount = nameCounts.get(base) ?? 0;
      nameCounts.set(base, seenCount + 1);

      return {
        id: `${opening.slug}-g${String(index + 1).padStart(2, "0")}`,
        name: seenCount ? `${base} (${seenCount + 1})` : base,
        eco: root.eco,
        summary: lineSummary(root, moves),
        tags: root.tags.slice(0, 3),
        moves,
      };
    });
  }

  const total = Object.values(result).reduce((sum, lines) => sum + lines.length, 0);
  writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`\nWrote ${total} generated lines to ${OUTPUT}`);
  engine.terminate();
}

void main();
