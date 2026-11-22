import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { Chess, type Square } from "chess.js";
import { openings } from "../lib/openings";

const require = createRequire(import.meta.url);
const stockfish = require("stockfish");

type EngineScore = { cp: number; mate: number | null; best: string | null };

type Flag = {
  kind: "eval-drop" | "queen-hanging" | "losing";
  ply: number;
  san: string;
  detail: string;
  evalUser: number;
  delta: number;
};

const DEPTH = Number(process.env.SF_DEPTH ?? 12);
// 150cp leaves room for intentional gambit pawns while still catching a
// genuinely dropped piece or a badly losing move.
const DROP_THRESHOLD = Number(process.env.DROP_THRESHOLD ?? 150);

let lineHandler: ((line: string) => void) | null = null;
const engine = stockfish("lite-single", (line: string) => lineHandler?.(line));
const evalCache = new Map<string, Promise<EngineScore>>();

function evaluateCached(fen: string): Promise<EngineScore> {
  const cached = evalCache.get(fen);
  if (cached) return cached;
  const pending = evaluate(fen);
  evalCache.set(fen, pending);
  return pending;
}

function evaluate(fen: string): Promise<EngineScore> {
  return new Promise((resolve) => {
    let score: EngineScore = { cp: 0, mate: null, best: null };

    lineHandler = (line: string) => {
      if (line.startsWith("info ") && line.includes(" score ")) {
        const mate = line.match(/score mate (-?\d+)/);
        const cp = line.match(/score cp (-?\d+)/);
        if (mate) {
          const value = Number(mate[1]);
          score = {
            cp: value > 0 ? 20000 : -20000,
            mate: value,
            best: score.best,
          };
        } else if (cp) {
          score = {
            cp: Number(cp[1]),
            mate: null,
            best: score.best,
          };
        }
      }

      if (line.startsWith("bestmove ")) {
        score.best = line.split(" ")[1] ?? null;
        lineHandler = null;
        resolve(score);
      }
    };

    engine.processCommand(`position fen ${fen}`);
    engine.processCommand(`go depth ${DEPTH}`);
  });
}

function queenSquare(chess: Chess, color: "w" | "b"): Square | null {
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell?.type === "q" && cell.color === color) return cell.square;
    }
  }
  return null;
}

function sidePov(
  chess: Chess,
  score: EngineScore,
  side: "white" | "black",
): number {
  const white = chess.turn() === "w" ? score.cp : -score.cp;
  return side === "white" ? white : -white;
}

function label(ply: number): string {
  const number = Math.ceil(ply / 2);
  return `${number}${ply % 2 === 1 ? "." : "..."}`;
}

async function run(): Promise<void> {
  const report: Array<{
    opening: string;
    lineId: string;
    name: string;
    side: "white" | "black";
    flags: Flag[];
  }> = [];
  let checked = 0;
  const only = process.env.AUDIT_OPENING;
  const selected = only
    ? openings.filter((opening) => opening.slug === only)
    : openings;

  if (only && selected.length === 0) {
    console.error(`No opening matches AUDIT_OPENING=${only}`);
    process.exit(1);
  }

  for (const opening of selected) {
    for (const line of opening.lines) {
      checked += 1;
      const userSide = line.side;
      const userColor = userSide === "white" ? "w" : "b";
      const chess = new Chess();
      const flags: Flag[] = [];
      let previousScore = await evaluateCached(chess.fen());
      let previousUser = sidePov(chess, previousScore, userSide);

      for (let i = 0; i < line.moves.length; i += 1) {
        const move = line.moves[i];
        const bestBefore = previousScore.best;
        const evalBefore = previousUser;
        const isUserMove = (i % 2 === 0 ? "white" : "black") === userSide;
        const played = chess.move(move.san);

        const score = await evaluateCached(chess.fen());
        const currentUser = sidePov(chess, score, userSide);
        const delta = previousUser - currentUser;
        const moveLabel = `${label(i + 1)} ${move.san}`;

        if (isUserMove && delta >= DROP_THRESHOLD) {
          flags.push({
            kind: "eval-drop",
            ply: i + 1,
            san: move.san,
            detail: `${userSide} eval dropped ${delta}cp (from ${evalBefore} to ${currentUser}); engine preferred ${bestBefore ?? "?"}`,
            evalUser: currentUser,
            delta,
          });
        }

        if (isUserMove && currentUser <= -250) {
          flags.push({
            kind: "losing",
            ply: i + 1,
            san: move.san,
            detail: `${userSide} is ${currentUser}cp after this move`,
            evalUser: currentUser,
            delta,
          });
        }

        if (isUserMove) {
          const enemyColor = userColor === "w" ? "b" : "w";
          const queen = queenSquare(chess, userColor);

          if (queen) {
            const defenders = chess
              .attackers(queen, userColor)
              .filter((square) => square !== queen);
            const captures = chess
              .moves({ verbose: true })
              .filter(
                (candidate) =>
                  candidate.to === queen && candidate.captured === "q",
              );

            // A queen trade where the move itself captured the queen is not a
            // hanging queen. Only flag a loose queen after a quiet move.
            if (
              captures.length > 0 &&
              defenders.length === 0 &&
              played.captured !== "q"
            ) {
              flags.push({
                kind: "queen-hanging",
                ply: i + 1,
                san: move.san,
                detail: `${queen} queen can be captured for free from ${captures.map((m) => m.from).join(", ")} (enemy attackers: ${chess.attackers(queen, enemyColor).join(", ")})`,
                evalUser: currentUser,
                delta,
              });
            }
          }
        }

        previousScore = score;
        previousUser = currentUser;
      }

      if (flags.length) {
        report.push({
          opening: opening.slug,
          lineId: line.id,
          name: line.name,
          side: userSide,
          flags,
        });
        console.log(`\n${opening.name} / ${line.name} [${line.id}]`);
        for (const flag of flags) {
          console.log(
            `  ${label(flag.ply).padEnd(6)} ${flag.san.padEnd(6)} ${flag.kind.padEnd(13)} ${flag.detail}`,
          );
        }
      } else {
        console.log(`✓ ${opening.name} / ${line.name}`);
      }
    }
  }

  const allFlags = report.flatMap((entry) => entry.flags);
  console.log(
    `\nAudited ${checked} lines from ${selected.length} openings at depth ${DEPTH}. ` +
      `${report.length} lines with flags, ${allFlags.length} flags.`,
  );

  writeFileSync(
    "scripts/audit-report.json",
    JSON.stringify(report, null, 2),
  );
  engine.terminate();
}

void run();
