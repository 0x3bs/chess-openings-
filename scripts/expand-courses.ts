/**
 * Grow the small courses from real Lichess master games.
 *
 * The five CC0 opening-name TSV files do not cover systems such as the London
 * or the Anti-London, so those courses shipped with only the hand-written
 * lines. This script reads the Lichess masters opening explorer (CC0 game
 * data), walks a few canonical roots, exports the games that reached them and
 * turns the first moves of each game into a study line.
 *
 * It never invents a move: every ply comes from a published master game. Lines
 * are filtered with the same rules as `npm run curate` (no move-order twins, no
 * shared first twelve plies, at least twelve plies). Every line keeps the
 * Lichess game id in data/extra-lines.json for audit.
 *
 * Writes data/extra-lines.json and data/explorer-cache.json.
 */
import { Chess } from "chess.js";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import curation from "../data/curation.json";
import { englishOpening } from "../lib/openings/english";
import {
  buildOpening,
  catalogueOpenings,
  type LineSeed,
} from "../lib/openings/catalog";
import lichessLines from "../lib/openings/lichess-lines.json";
import { markPartialLines, partialLineIds } from "../lib/openings/partial";
import type { LineLevel, Opening } from "../lib/openings/types";

const TARGET_CURATED = 40;
const TARGET_PLIES = 18;
const MIN_PLIES = 12;
const LCP_PLIES = 12;
const MAX_GAMES_PER_ROOT = 45;
const CHILD_BRANCHES = 2;
const GRANDCHILD_BRANCHES = 1;
const POLITE_DELAY_MS = 110;

type ExplorerMove = {
  san: string;
  uci: string;
  white: number;
  draws: number;
  black: number;
  opening?: { eco: string; name: string } | null;
};

type ExplorerResponse = {
  moves: ExplorerMove[];
  topGames: { id: string; uci: string }[];
  opening?: { eco: string; name: string } | null;
};

type StoredExplorer = {
  moves: ExplorerMove[];
  topGames: { id: string; uci: string }[];
  opening: { eco: string; name: string } | null;
};

type Cache = {
  fens: Record<string, StoredExplorer>;
  games: Record<string, string[]>;
};

type CourseConfig = {
  nameEn: string;
  nameAr: string;
  eco: string;
  familyEn: string;
  familyAr: string;
  side: "white" | "black";
  roots: string[];
};

const COURSES: Record<string, CourseConfig> = {
  scotch: {
    nameEn: "Scotch Game",
    nameAr: "اللعبة الاسكتلندية",
    eco: "C44",
    familyEn: "Scotch Game",
    familyAr: "اللعبة الاسكتلندية",
    side: "white",
    roots: ["e4 e5 Nf3 Nc6 d4"],
  },
  vienna: {
    nameEn: "Vienna Game",
    nameAr: "لعبة فيينا",
    eco: "C25",
    familyEn: "Vienna Game",
    familyAr: "لعبة فيينا",
    side: "white",
    roots: ["e4 e5 Nc3"],
  },
  london: {
    nameEn: "London System",
    nameAr: "نظام لندن",
    eco: "D02",
    familyEn: "London System",
    familyAr: "نظام لندن",
    side: "white",
    roots: ["d4 d5 Bf4", "d4 Nf6 Bf4"],
  },
  "jobava-london": {
    nameEn: "Jobava London",
    nameAr: "لندن جوبافا",
    eco: "D00",
    familyEn: "Jobava London",
    familyAr: "لندن جوبافا",
    side: "white",
    roots: ["d4 d5 Nc3 Nf6 Bf4", "d4 Nf6 Nc3 d5 Bf4"],
  },
  "bishops-opening": {
    nameEn: "Bishop's Opening",
    nameAr: "افتتاحية الفيل",
    eco: "C23",
    familyEn: "Bishop's Opening",
    familyAr: "افتتاحية الفيل",
    side: "white",
    roots: ["e4 e5 Bc4"],
  },
  ponziani: {
    nameEn: "Ponziani Opening",
    nameAr: "افتتاحية بونزيني",
    eco: "C44",
    familyEn: "Ponziani Opening",
    familyAr: "افتتاحية بونزيني",
    side: "white",
    roots: ["e4 e5 Nf3 Nc6 c3"],
  },
  "queens-gambit-accepted": {
    nameEn: "Queen's Gambit Accepted",
    nameAr: "غامبيت الملكة المقبول",
    eco: "D20",
    familyEn: "Queen's Gambit Accepted",
    familyAr: "غامبيت الملكة المقبول",
    side: "white",
    roots: ["d4 d5 c4 dxc4"],
  },
  scandinavian: {
    nameEn: "Scandinavian Defense",
    nameAr: "الدفاع الإسكندنافي",
    eco: "B01",
    familyEn: "Scandinavian Defense",
    familyAr: "الدفاع الإسكندنافي",
    side: "black",
    roots: ["e4 d5"],
  },
  pirc: {
    nameEn: "Pirc Defense",
    nameAr: "الدفاع بيرك",
    eco: "B07",
    familyEn: "Pirc Defense",
    familyAr: "الدفاع بيرك",
    side: "black",
    roots: ["e4 d6 d4 Nf6 Nc3 g6"],
  },
  dutch: {
    nameEn: "Dutch Defense",
    nameAr: "الدفاع الهولندي",
    eco: "A80",
    familyEn: "Dutch Defense",
    familyAr: "الدفاع الهولندي",
    side: "black",
    roots: ["d4 f5"],
  },
  "anti-london": {
    nameEn: "Anti-London System",
    nameAr: "ضد نظام لندن",
    eco: "D00",
    familyEn: "Anti-London System",
    familyAr: "ضد نظام لندن",
    side: "black",
    roots: [
      "d4 d5 Bf4 c5",
      "d4 d5 Bf4 Nf6",
      "d4 Nf6 Bf4 g6",
      "d4 d5 Bf4 Nc6",
    ],
  },
  petrov: {
    nameEn: "Petrov Defense",
    nameAr: "الدفاع بتروف",
    eco: "C42",
    familyEn: "Petrov Defense",
    familyAr: "الدفاع بتروف",
    side: "black",
    roots: ["e4 e5 Nf3 Nf6"],
  },
  catalan: {
    nameEn: "Catalan Opening",
    nameAr: "افتتاحية كتالونيا",
    eco: "E00",
    familyEn: "Catalan Opening",
    familyAr: "افتتاحية كتالونيا",
    side: "white",
    roots: ["d4 Nf6 c4 e6 Nf3 d5 g3"],
  },
  "fried-liver": {
    nameEn: "Fried Liver Attack",
    nameAr: "هجوم الكبد المقلي",
    eco: "C57",
    familyEn: "Fried Liver Attack",
    familyAr: "هجوم الكبد المقلي",
    side: "white",
    roots: [
      "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5",
      "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5",
      "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5",
      "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5",
    ],
  },
  "kings-indian-attack": {
    nameEn: "King's Indian Attack",
    nameAr: "هجوم الملك الهندي",
    eco: "A07",
    familyEn: "King's Indian Attack",
    familyAr: "هجوم الملك الهندي",
    side: "white",
    roots: [
      "Nf3 d5 g3",
      "e4 e6 d3 Nf6 g3",
      "Nf3 Nf6 g3",
      "g3 d5 Nf3",
      "e4 d5 d3 Nf6 g3",
    ],
  },
  "open-game": {
    nameEn: "Open Game",
    nameAr: "اللعبة المفتوحة",
    eco: "C44",
    familyEn: "Open Game",
    familyAr: "اللعبة المفتوحة",
    side: "black",
    roots: ["e4 e5 Nf3 Nc6"],
  },
  "vienna-gambit": {
    nameEn: "Vienna Gambit",
    nameAr: "غامبيت فيينا",
    eco: "C29",
    familyEn: "Vienna Gambit",
    familyAr: "غامبيت فيينا",
    side: "white",
    roots: [
      "e4 e5 Nc3 Nf6 f4",
      "e4 e5 Nc3 Nf6 f4 exf4",
      "e4 e5 Nc3 Nf6 f4 d5",
      "e4 e5 Nc3 Nf6 f4 Nc6",
    ],
  },
  "white-vs-caro-kann": {
    nameEn: "White vs the Caro-Kann",
    nameAr: "الأبيض ضد كارو-كان",
    eco: "B10",
    familyEn: "Caro-Kann Defense",
    familyAr: "الدفاع كارو-كان",
    side: "white",
    roots: [
      "e4 c6 d4 d5",
      "e4 c6 d4 d5 e5",
      "e4 c6 d4 d5 exd5",
      "e4 c6 d4 d5 Nc3",
      "e4 c6 d4 d5 exd5 cxd5 c4",
    ],
  },
  "englund-gambit": {
    nameEn: "Englund Gambit",
    nameAr: "غامبيت إنجلوند",
    eco: "A40",
    familyEn: "Englund Gambit",
    familyAr: "غامبيت إنجلوند",
    side: "black",
    roots: [
      "d4 e5 dxe5",
      "d4 e5 dxe5 Nc6 Nf3 Qe7",
      "d4 e5 dxe5 Nc6 Nf3 Qe7 Bf4",
      "d4 e5 Nf3",
      "d4 e5 c4",
      "d4 e5 d5",
    ],
  },
};

const cachePath = "data/explorer-cache.json";
const cache: Cache = existsSync(cachePath)
  ? (JSON.parse(readFileSync(cachePath, "utf8")) as Cache)
  : { fens: {}, games: {} };

type ExtraFile = {
  courses?: Record<string, LineSeed[]>;
  provenance?: Record<
    string,
    { lineId: string; gameId: string; url: string; relaxed?: boolean }[]
  >;
};

const extraPath = "data/extra-lines.json";
const previousExtra: ExtraFile = existsSync(extraPath)
  ? (JSON.parse(readFileSync(extraPath, "utf8")) as ExtraFile)
  : {};

function sleep(ms: number): void {
  // Synchronous sleep; the script is sequential and polite to the API.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function curl(url: string): string {
  return execFileSync(
    "curl",
    ["-sL", "--max-time", "30", "--retry", "2", "-A", "ChessCoach/1.0", url],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
}

function fetchExplorer(fen: string): StoredExplorer {
  const cached = cache.fens[fen];
  if (cached) return cached;

  let lastError = "";
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      sleep(POLITE_DELAY_MS);
      const raw = curl(
        `https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(fen)}&topGames=15&recentGames=0`,
      );
      const parsed = JSON.parse(raw) as ExplorerResponse;
      const stored: StoredExplorer = {
        moves: parsed.moves ?? [],
        topGames: parsed.topGames ?? [],
        opening: parsed.opening ?? null,
      };
      cache.fens[fen] = stored;
      return stored;
    } catch (error) {
      lastError = (error as Error).message;
      sleep(900 * (attempt + 1));
    }
  }
  throw new Error(`explorer failed for ${fen}: ${lastError}`);
}

function fetchGame(id: string): string[] {
  const cached = cache.games[id];
  if (cached) return cached;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      sleep(POLITE_DELAY_MS);
      const pgn = curl(
        `https://lichess.org/game/export/${id}?moves=true&tags=false&clocks=false&evals=false&literate=false`,
      );
      if (!pgn.trim() || /not found/i.test(pgn)) return [];
      const chess = new Chess();
      chess.loadPgn(pgn);
      const history = chess.history();
      cache.games[id] = history;
      return history;
    } catch {
      sleep(700 * (attempt + 1));
    }
  }
  return [];
}

function fenAfter(san: string[]): string {
  const chess = new Chess();
  for (const move of san) chess.move(move);
  return chess.fen();
}

function commonPrefix(a: string[], b: string[]): number {
  let index = 0;
  while (index < a.length && index < b.length && a[index] === b[index]) {
    index += 1;
  }
  return index;
}

function finalFen(san: string[]): string {
  const chess = new Chess();
  for (const move of san) chess.move(move);
  return chess.fen().split(" ").slice(0, 4).join(" ");
}

/**
 * A study line should end before the game starts repeating itself. Cut at the
 * first move that recreates a position we have already seen; the move itself is
 * dropped, so every remaining ply is new.
 */
function trimBeforeRepetition(san: string[]): string[] {
  const chess = new Chess();
  const seen = new Set<string>([
    chess.fen().split(" ").slice(0, 4).join(" "),
  ]);
  for (let index = 0; index < san.length; index += 1) {
    chess.move(san[index]);
    const key = chess.fen().split(" ").slice(0, 4).join(" ");
    if (seen.has(key)) return san.slice(0, index);
    seen.add(key);
  }
  return san;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function levelFor(plies: number): LineLevel {
  if (plies <= 14) return "basic";
  if (plies <= 18) return "common";
  return "advanced";
}

function moveLabel(san: string[], index: number): string {
  const safe = Math.min(index, san.length - 1);
  const moveNumber = Math.floor(safe / 2) + 1;
  const isWhite = safe % 2 === 0;
  return isWhite
    ? `${moveNumber}.${san[safe]}`
    : `${moveNumber}...${san[safe]}`;
}

function gameIdsForRoot(root: string[]): string[] {
  const rootFen = fenAfter(root);
  const response = fetchExplorer(rootFen);
  const ids: string[] = response.topGames.map((game) => game.id);

  const children = [...response.moves]
    .sort(
      (a, b) => b.white + b.draws + b.black - (a.white + a.draws + a.black),
    )
    .slice(0, CHILD_BRANCHES);

  const grandchildQueue: string[] = [];
  for (const child of children) {
    const childSan = [...root, child.san];
    const childFen = fenAfter(childSan);
    const childResponse = fetchExplorer(childFen);
    ids.push(...childResponse.topGames.map((game) => game.id));
    const grandchild = [...childResponse.moves]
      .sort(
        (a, b) => b.white + b.draws + b.black - (a.white + a.draws + a.black),
      )
      .slice(0, GRANDCHILD_BRANCHES);
    for (const move of grandchild) {
      grandchildQueue.push(fenAfter([...childSan, move.san]));
    }
  }
  for (const fen of grandchildQueue) {
    ids.push(...fetchExplorer(fen).topGames.map((game) => game.id));
  }

  return [...new Set(ids)].slice(0, MAX_GAMES_PER_ROOT);
}

type NewLine = {
  seed: LineSeed;
  gameId: string;
  san: string[];
  relaxed?: boolean;
};

function buildLine(
  slug: string,
  config: CourseConfig,
  root: string[],
  history: string[],
  gameId: string,
  usedIds: Set<string>,
  existing: string[][],
  chosen: NewLine[],
  lcp: number,
): NewLine | null {
  const san = trimBeforeRepetition(history.slice(0, TARGET_PLIES));
  if (san.length < MIN_PLIES) return null;

  const fen = finalFen(san);
  const others = [...existing, ...chosen.map((item) => item.san)];
  if (others.some((other) => finalFen(other) === fen)) return null;
  if (others.some((other) => commonPrefix(other, san) >= lcp)) {
    return null;
  }

  let divergence = 0;
  for (const other of others) divergence = Math.max(divergence, commonPrefix(other, san));
  const label = moveLabel(san, divergence);

  const baseName = `${config.nameEn} — ${label}`;
  let name = baseName;
  let counter = 2;
  let id = `explorer-${slug}-${config.eco.toLowerCase()}-${slugify(name)}`;
  while (usedIds.has(id)) {
    name = `${baseName} (${counter})`;
    id = `explorer-${slug}-${config.eco.toLowerCase()}-${slugify(name)}`;
    counter += 1;
  }
  usedIds.add(id);

  const nameAr = `${config.nameAr} — ${label}`;
  const summary = `A real master-game continuation of ${config.nameEn}, branching with ${label}, from the Lichess masters database.`;
  const summaryAr = `استمرار حقيقي من مباريات الأساتذة في ${config.nameAr}، يتفرع بـ${label}، من قاعدة بيانات Lichess.`;
  const tags = ["Master game", "Explorer"];
  const tagsAr = ["مباراة أستاذ", "مستكشف الافتتاحيات"];

  const seed: LineSeed = {
    id,
    name,
    eco: config.eco,
    summary,
    tags,
    moves: san,
    parentName: config.nameEn,
    family: config.familyEn,
    level: levelFor(san.length),
    source: "lichess",
    i18n: { ar: { name: nameAr, summary: summaryAr, tags: tagsAr } },
  };

  return { seed, gameId, san };
}

/** The same course list the site builds, with partial flags applied. */
function allOpenings(): Opening[] {
  const imported = lichessLines as unknown as Record<string, LineSeed[]>;
  const englishImported = imported.english ?? [];
  const english: Opening = englishImported.length
    ? {
        ...englishOpening,
        lines: [
          ...englishOpening.lines,
          ...buildOpening({
            slug: "english-imported",
            name: englishOpening.name,
            eco: englishOpening.eco,
            side: "white",
            intro: englishOpening.intro,
            themes: englishOpening.themes,
            lines: englishImported,
          }).lines,
        ],
      }
    : englishOpening;

  const list = [english, ...catalogueOpenings];
  const partialIds = partialLineIds(
    list.flatMap((opening) =>
      opening.lines.map((line) => ({
        id: line.id,
        name: line.name,
        moves: line.moves.map((move) => move.san),
      })),
    ),
  );
  return list.map((opening) => markPartialLines(opening, partialIds));
}

function main() {
  const curated = curation.courses as Record<
    string,
    { curated: string[]; total: number }
  >;

  // Fail fast on an illegal root instead of deep inside a network loop.
  for (const [slug, config] of Object.entries(COURSES)) {
    for (const rootText of config.roots) {
      const chess = new Chess();
      try {
        for (const san of rootText.split(" ")) chess.move(san);
      } catch {
        throw new Error(`${slug}: illegal root "${rootText}"`);
      }
    }
  }

  const openings = allOpenings();
  const sanById = new Map<string, string[]>();
  const usedIds = new Set<string>();
  for (const opening of openings) {
    for (const line of opening.lines) {
      sanById.set(line.id, line.moves.map((move) => move.san));
      usedIds.add(line.id);
    }
  }

  const extra: Record<string, LineSeed[]> = {};
  const provenance: Record<
    string,
    { lineId: string; gameId: string; url: string; relaxed?: boolean }[]
  > = {};

  const previousIds = new Map<string, Set<string>>();
  for (const [slug, list] of Object.entries(previousExtra.courses ?? {})) {
    previousIds.set(slug, new Set(list.map((line) => line.id)));
  }

  /**
   * Save after every course so a crash or timeout never throws away the games
   * that were already fetched.
   */
  function persist(): void {
    const mergedCourses = { ...(previousExtra.courses ?? {}), ...extra };
    const mergedProvenance = {
      ...(previousExtra.provenance ?? {}),
      ...provenance,
    };

    writeFileSync(
      extraPath,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          source:
            "Lichess masters opening explorer + game export (CC0 game data). Every line is the opening of a real master game.",
          disclaimer:
            "Move orders are facts from the games; the names and notes are this project's own.",
          courses: mergedCourses,
          provenance: mergedProvenance,
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(cachePath, `${JSON.stringify(cache)}\n`);

    const reviewRows = Object.entries(mergedProvenance).flatMap(
      ([slug, list]) =>
        list.map(
          (item) =>
            `| ${slug} | \`${item.lineId}\` | ${item.relaxed ? "move 6" : "move 6 or earlier"} | ${item.url} |`,
        ),
    );
    writeFileSync(
      "review/expanded-lines.md",
      [
        "# Lines mined from Lichess master games",
        "",
        "Every line below is the opening of a real master game. The moves are",
        "facts from that game; the line name and study note are this project's",
        "own. Open the link to replay the source game on Lichess.",
        "",
        "| Course | Line id | Branches by | Source game |",
        "| --- | --- | --- | --- |",
        ...reviewRows,
        "",
      ].join("\n"),
    );
  }

  function processCourse(slug: string, config: CourseConfig): void {
    const currentIds = curated[slug]?.curated ?? [];
    const current = currentIds.length;

    const ownPrevious = previousIds.get(slug) ?? new Set<string>();
    for (const id of ownPrevious) usedIds.delete(id);

    const existing: string[][] = [];
    for (const id of currentIds) {
      if (ownPrevious.has(id)) continue;
      const san = sanById.get(id);
      if (san) existing.push(san);
    }

    // FORCE_EXPAND rebuilds a course that already reached the target; useful
    // after a generator fix. It still keeps the hand-written anchors.
    const force = Boolean(process.env.FORCE_EXPAND);
    const needed = Math.max(
      0,
      TARGET_CURATED - (force ? existing.length : current),
    );
    if (needed === 0) {
      console.log(`${slug}: already ${current}, skip`);
      return;
    }

    const chosen: NewLine[] = [];

    function fillLines(lcp: number, relaxed: boolean): void {
      for (const rootText of config.roots) {
        if (chosen.length >= needed) break;
        const root = rootText.split(" ");
        const ids = gameIdsForRoot(root);
        for (const gameId of ids) {
          if (chosen.length >= needed) break;
          const history = fetchGame(gameId);
          if (!history.length) continue;
          if (commonPrefix(history, root) !== root.length) continue;
          const line = buildLine(
            slug,
            config,
            root,
            history,
            gameId,
            usedIds,
            existing,
            chosen,
            lcp,
          );
          if (!line) continue;
          line.relaxed = relaxed;
          chosen.push(line);
        }
      }
    }

    // Prefer lines that branch within the first six moves. Only if the source
    // does not contain enough of them, allow branches from move six.
    fillLines(LCP_PLIES, false);
    if (chosen.length < needed) fillLines(10, true);

    if (chosen.length) {
      extra[slug] = chosen.map((item) => item.seed);
      provenance[slug] = chosen.map((item) => ({
        lineId: item.seed.id,
        gameId: item.gameId,
        url: `https://lichess.org/${item.gameId}`,
        ...(item.relaxed ? { relaxed: true } : {}),
      }));
      for (const item of chosen) existing.push(item.san);
    }

    console.log(
      `${slug}: ${current} -> ${current + chosen.length} studied (${chosen.length} new)`,
    );
    persist();
  }

  const only = process.env.EXPAND_ONLY?.trim();
  for (const [slug, config] of Object.entries(COURSES)) {
    if (only && slug !== only) continue;
    try {
      processCourse(slug, config);
    } catch (error) {
      console.error(`${slug}: skipped (${(error as Error).message})`);
      persist();
    }
  }

  persist();
  console.log(
    `Wrote data/extra-lines.json with ${Object.values(extra).reduce((sum, list) => sum + list.length, 0)} new lines in this run.`,
  );
  console.log("Wrote review/expanded-lines.md");
}

main();
