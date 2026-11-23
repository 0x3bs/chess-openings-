/**
 * Convert the CC0 lichess-org/chess-openings TSV files into named lines for
 * the trainer. Facts only: ECO, name, PGN and SAN moves. All explanations are
 * written separately by the idea generator.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Chess } from "chess.js";
import { isMovePrefix, partialLineIds } from "../lib/openings/partial";
import { minSideMovesForLine } from "../lib/openings/short-lines";

type Level = "basic" | "common" | "advanced";

type ImportedLine = {
  id: string;
  name: string;
  eco: string;
  summary: string;
  tags: string[];
  moves: string[];
  family: string;
  parentName: string;
  level: Level;
  pgn: string;
  /** Famous short entry line with a longer named continuation. */
  partial?: boolean;
  i18n: {
    ar: { name: string; summary: string; tags: string[] };
  };
};

type RemovedDuplicate = {
  slug: string;
  line: ImportedLine;
  kept: ImportedLine;
};

type Row = { eco: string; name: string; pgn: string };

const INPUT_DIR = "data/lichess-openings";
const OUTPUT = "lib/openings/lichess-lines.json";
const UNMAPPED = "review/unmapped.md";
const DUPLICATES = "review/duplicate-lines.md";

/** Same order as the course picker; English first. */
const COURSE_ORDER = [
  "english",
  "italian",
  "ruy-lopez",
  "scotch",
  "vienna",
  "kings-gambit",
  "london",
  "jobava-london",
  "bishops-opening",
  "ponziani",
  "queens-gambit",
  "queens-gambit-accepted",
  "caro-kann",
  "french",
  "sicilian",
  "scandinavian",
  "pirc",
  "kings-indian",
  "dutch",
  "slav",
  "anti-london",
  "petrov",
  "nimzo-indian",
  "catalan",
  "fried-liver",
  "kings-indian-attack",
  "open-game",
  "vienna-gambit",
  "white-vs-caro-kann",
  "englund-gambit",
] as const;

const COURSE_SIDE: Record<string, "white" | "black"> = {
  english: "white",
  italian: "white",
  "ruy-lopez": "white",
  scotch: "white",
  vienna: "white",
  "kings-gambit": "white",
  london: "white",
  "jobava-london": "white",
  "bishops-opening": "white",
  ponziani: "white",
  "queens-gambit": "white",
  "queens-gambit-accepted": "white",
  "caro-kann": "black",
  french: "black",
  sicilian: "black",
  scandinavian: "black",
  pirc: "black",
  "kings-indian": "black",
  dutch: "black",
  slav: "black",
  "anti-london": "black",
  petrov: "black",
  "nimzo-indian": "black",
  catalan: "white",
  "fried-liver": "white",
  "kings-indian-attack": "white",
  "open-game": "black",
  "vienna-gambit": "white",
  "white-vs-caro-kann": "white",
  "englund-gambit": "black",
};

/** Ordered: more specific families must win before broader ones. */
const FAMILY_RULES: Array<[string, RegExp]> = [
  ["english", /^English Opening/],
  ["kings-indian-attack", /^King's Indian Attack/],
  ["englund-gambit", /^Englund Gambit/],
  ["dutch", /^Dutch Defense/],
  ["caro-kann", /^Caro-Kann Defense/],
  ["sicilian", /^Sicilian Defense/],
  ["pirc", /^Pirc Defense/],
  ["scandinavian", /^Scandinavian Defense/],
  ["french", /^French Defense/],
  ["bishops-opening", /^Bishop's Opening/],
  ["vienna-gambit", /^Vienna Gambit/],
  ["vienna", /^Vienna Game/],
  ["kings-gambit", /^King's Gambit/],
  ["scotch", /^Scotch Game/],
  ["ponziani", /^Ponziani Opening/],
  ["petrov", /^Petrov's Defense/],
  ["fried-liver", /Fried Liver/],
  ["italian", /^Italian Game/],
  ["ruy-lopez", /^Ruy Lopez/],
  ["queens-gambit-accepted", /^Queen's Gambit Accepted/],
  ["slav", /^(Slav Defense|Semi-Slav Defense)/],
  ["jobava-london", /^Rapport-Jobava/],
  ["london", /^London System/],
  ["nimzo-indian", /^Nimzo-Indian Defense/],
  ["catalan", /^Catalan Opening/],
  ["kings-indian", /^King's Indian Defense/],
  ["queens-gambit", /^(Queen's Gambit Declined|Tarrasch Defense)/],
  ["open-game", /^(Danish Gambit|Center Game|King's Pawn Game|King's Pawn Opening)/],
];

const AR_PHRASES: Array<[string, string]> = [
  ["Queen's Gambit Declined", "غامبيت الملكة المرفوض"],
  ["Queen's Gambit Accepted", "غامبيت الملكة المقبول"],
  ["King's Gambit Accepted", "غامبيت الملك المقبول"],
  ["King's Gambit Declined", "غامبيت الملك المرفوض"],
  ["Semi-Slav Defense", "الدفاع السلافي نصف المكتمل"],
  ["Nimzo-Indian Defense", "الدفاع النيمز-هندي"],
  ["King's Indian Defense", "الدفاع الهندي الملكي"],
  ["King's Indian Attack", "الهجوم الهندي الملكي"],
  ["Scandinavian Defense", "الدفاع الإسكندنافي"],
  ["Sicilian Defense", "الدفاع الصقلي"],
  ["Caro-Kann Defense", "دفاع كارو-كان"],
  ["French Defense", "الدفاع الفرنسي"],
  ["Italian Game", "اللعبة الإيطالية"],
  ["Scotch Game", "اللعبة الإسكتلندية"],
  ["English Opening", "الافتتاحية الإنجليزية"],
  ["Vienna Gambit", "غامبيت فيينا"],
  ["Vienna Game", "لعبة فيينا"],
  ["Danish Gambit", "غامبيت دانماركي"],
  ["Ruy Lopez", "روي لوبيز"],
  ["Dutch Defense", "الدفاع الهولندي"],
  ["Slav Defense", "الدفاع السلافي"],
  ["Queen's Gambit", "غامبيت الملكة"],
  ["King's Gambit", "غامبيت الملك"],
  ["Tarrasch Defense", "دفاع تاراش"],
  ["Catalan Opening", "الافتتاحية الكتالونية"],
  ["Petrov's Defense", "دفاع بتروف"],
  ["Englund Gambit", "غامبيت إنغلوند"],
  ["Bishop's Opening", "افتتاحية الفيل"],
  ["Ponziani Opening", "افتتاحية بونزياتي"],
  ["Center Game", "لعبة المركز"],
  ["Fried Liver Attack", "هجوم الكبد المقلي"],
  ["London System", "نظام لندن"],
];

const AR_WORDS: Record<string, string> = {
  defense: "دفاع",
  defences: "دفاعات",
  attack: "هجوم",
  attacks: "هجمات",
  variation: "تفرع",
  variations: "تفرعات",
  gambit: "غامبيت",
  game: "لعبة",
  opening: "افتتاحية",
  accepted: "مقبول",
  declined: "مرفوض",
  classical: "كلاسيكي",
  classic: "كلاسيكي",
  advance: "متقدم",
  advanced: "متقدم",
  accelerated: "مسرع",
  exchange: "تبادل",
  modern: "حديث",
  main: "رئيسي",
  line: "خط",
  lines: "خطوط",
  system: "نظام",
  with: "مع",
  and: "و",
  the: "",
  reversed: "معكوس",
  double: "مزدوج",
  delayed: "مؤجل",
  closed: "مغلق",
  open: "مفتوح",
  rapid: "سريع",
  quiet: "هادئ",
  sharp: "حاد",
  mate: "كش مات",
  check: "كش",
  pawn: "بيدق",
  pawns: "بيادق",
  queen: "ملكة",
  king: "ملك",
  bishop: "فيل",
  bishops: "أفيلة",
  knight: "حصان",
  knights: "أحصنة",
  rook: "رخ",
  wing: "جناح",
  side: "جانب",
  dragon: "تنين",
  hedgehog: "قنفذ",
  london: "لندن",
  berlin: "برلين",
  najdorf: "ناجدورف",
  sicilian: "صقلي",
  italian: "إيطالي",
  french: "فرنسي",
  english: "إنجليزي",
  spanish: "إسباني",
  russian: "روسي",
  indian: "هندي",
  scandinavian: "إسكندنافي",
  hungarian: "مجري",
  polish: "بولندي",
  dutch: "هولندي",
  vienna: "فيينا",
  sicily: "صقلية",
  defense1: "دفاع",
};

const TRANSCRIPTION: Record<string, string> = {
  sh: "ش",
  ch: "تش",
  th: "ث",
  kh: "خ",
  gh: "غ",
  ph: "ف",
  sch: "ش",
  a: "ا",
  b: "ب",
  c: "ك",
  d: "د",
  e: "إ",
  f: "ف",
  g: "ج",
  h: "ه",
  i: "ي",
  j: "ج",
  k: "ك",
  l: "ل",
  m: "م",
  n: "ن",
  o: "و",
  p: "ب",
  q: "ك",
  r: "ر",
  s: "س",
  t: "ت",
  u: "و",
  v: "ف",
  w: "و",
  x: "كس",
  y: "ي",
  z: "ز",
};

function transliterate(word: string): string {
  let result = "";
  let i = 0;
  const lower = word.toLowerCase();
  while (i < lower.length) {
    const three = lower.slice(i, i + 3);
    const two = lower.slice(i, i + 2);
    if (TRANSCRIPTION[three]) {
      result += TRANSCRIPTION[three];
      i += 3;
    } else if (TRANSCRIPTION[two]) {
      result += TRANSCRIPTION[two];
      i += 2;
    } else {
      result += TRANSCRIPTION[lower[i]] ?? "";
      i += 1;
    }
  }
  return result;
}

/** Arabic name with SAN notation left untouched for on-board checking. */
function arabicName(name: string): string {
  let result = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  for (const [english, arabic] of AR_PHRASES) {
    result = result.replace(new RegExp(escapeRegExp(english), "gi"), arabic);
  }
  result = result.replace(/[A-Za-z]+/g, (word) => {
    if (AR_WORDS[word.toLowerCase()] !== undefined) {
      return AR_WORDS[word.toLowerCase()];
    }
    return transliterate(word);
  });
  return result.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

function readRows(): Row[] {
  const rows: Row[] = [];
  for (const letter of ["a", "b", "c", "d", "e"]) {
    const text = readFileSync(join(INPUT_DIR, `${letter}.tsv`), "utf8");
    for (const raw of text.split(/\r?\n/).slice(1)) {
      if (!raw) continue;
      const [eco, name, pgn] = raw.split("\t");
      if (eco && name && pgn) rows.push({ eco, name, pgn });
    }
  }
  return rows;
}

function manualPgns(): Set<string> {
  const sources = [
    readFileSync("lib/openings/catalog.ts", "utf8"),
    readFileSync("lib/openings/english.ts", "utf8"),
  ].join("\n");
  const result = new Set<string>();
  const re = /moves:\s*"([^"]+)"\.split\(" "\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(sources))) {
    const chess = new Chess();
    try {
      for (const san of match[1].split(" ")) chess.move(san);
      result.add(chess.history().join(" "));
    } catch {
      // Hand-written source with a non-SAN literal; ignore it here.
    }
  }
  return result;
}

function levelFor(name: string, plies: number): Level {
  const branches = (name.match(/,/g) ?? []).length;
  if (plies <= 15 && branches === 0) return "basic";
  if (plies <= 19 || branches === 1) return "common";
  return "advanced";
}

function assignCourse(row: Row): string | null {
  const family = row.name.split(":")[0];
  for (const [slug, pattern] of FAMILY_RULES) {
    if (pattern.test(family) || pattern.test(row.name)) return slug;
  }
  return null;
}

/**
 * Keep only the longest line when the same course has several lines with the
 * exact same name and a pure prefix move order. Different move orders with the
 * same name are transpositions and are all kept.
 */
function dedupeCourse(
  slug: string,
  lines: ImportedLine[],
  removed: RemovedDuplicate[],
): ImportedLine[] {
  const groups = new Map<string, ImportedLine[]>();
  for (const line of lines) {
    groups.set(line.name, [...(groups.get(line.name) ?? []), line]);
  }

  const keep = new Set<string>();
  for (const group of groups.values()) {
    if (group.length < 2) {
      for (const line of group) keep.add(line.id);
      continue;
    }

    const sorted = [...group].sort(
      (a, b) =>
        a.moves.length - b.moves.length || a.id.localeCompare(b.id),
    );
    const isChain = sorted.every((line, index) =>
      index === 0 ? true : isMovePrefix(sorted[index - 1].moves, line.moves),
    );
    if (!isChain) {
      for (const line of group) keep.add(line.id);
      continue;
    }

    const longest = sorted[sorted.length - 1];
    keep.add(longest.id);
    for (const line of sorted.slice(0, -1)) {
      removed.push({ slug, line, kept: longest });
    }
  }

  return lines.filter((line) => keep.has(line.id));
}

function markPartialEntries(lines: ImportedLine[]): void {
  const ids = partialLineIds(lines);
  for (const line of lines) {
    if (ids.has(line.id)) line.partial = true;
  }
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function main(): void {
  const rows = readRows();
  const manual = manualPgns();
  const byCourse: Record<string, ImportedLine[]> = {};
  const seenIds = new Set<string>();
  const seenPgns = new Set<string>();
  const unmapped: Array<{ row: Row; reason: string; detail: string }> = [];

  for (const row of rows) {
    const chess = new Chess();
    try {
      chess.loadPgn(row.pgn);
    } catch (error) {
      unmapped.push({
        row,
        reason: "invalid PGN",
        detail: (error as Error).message,
      });
      continue;
    }

    const moves = chess.history();
    const slug = assignCourse(row);
    if (!slug) {
      unmapped.push({ row, reason: "no matching course", detail: "" });
      continue;
    }

    const side = COURSE_SIDE[slug];
    const userMoves = moves.filter(
      (_, index) => (index % 2 === 0 ? "white" : "black") === side,
    ).length;
    const minimum = minSideMovesForLine(row.name);
    if (userMoves < minimum) {
      unmapped.push({
        row,
        reason: `fewer than ${minimum} ${side} moves`,
        detail: `${pliesLabel(moves.length)}, ${userMoves} trainer moves`,
      });
      continue;
    }

    const history = moves.join(" ");
    if (manual.has(history) || seenPgns.has(history)) {
      unmapped.push({ row, reason: "duplicate move order", detail: "" });
      continue;
    }
    seenPgns.add(history);

    const [parentName, variation] = row.name.split(":", 2);
    const family = variation ? variation.split(",")[0].trim() : parentName.trim();
    const level = levelFor(row.name, moves.length);
    const baseId = `lichess-${slug}-${row.eco.toLowerCase()}-${slugify(row.name)}`;
    let id = baseId;
    let suffix = 2;
    while (seenIds.has(id)) id = `${baseId}-${suffix++}`;
    seenIds.add(id);

    const familyAr = arabicName(family);
    const nameAr = arabicName(row.name);
    const summary = `A named variation of ${family.trim()} (ECO ${row.eco}).`;
    const summaryAr = `تفرع معروف من ${familyAr} (ECO ${row.eco}).`;
    const tags = ["Main line", level === "advanced" ? "Tactical" : "Classical"];
    const tagsAr = ["الخط الرئيسي", level === "advanced" ? "تكتيكي" : "كلاسيكي"];

    const line: ImportedLine = {
      id,
      name: row.name.trim(),
      eco: row.eco,
      summary,
      tags,
      moves,
      family,
      parentName: parentName.trim(),
      level,
      pgn: row.pgn,
      i18n: {
        ar: {
          name: nameAr,
          summary: summaryAr,
          tags: tagsAr,
        },
      },
    };

    byCourse[slug] ??= [];
    byCourse[slug].push(line);
  }

  const removedDuplicates: RemovedDuplicate[] = [];
  for (const slug of COURSE_ORDER) {
    if (!byCourse[slug]?.length) continue;
    byCourse[slug] = dedupeCourse(slug, byCourse[slug], removedDuplicates);
  }
  markPartialEntries(Object.values(byCourse).flat());

  const output: Record<string, ImportedLine[]> = {};
  for (const slug of COURSE_ORDER) {
    if (!byCourse[slug]?.length) continue;
    byCourse[slug].sort((a, b) =>
      a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
    );
    output[slug] = byCourse[slug];
  }

  const shortKept = Object.values(output)
    .flat()
    .filter((line) => line.partial)
    .map((line) => line.name);
  const partialCount = shortKept.length;

  mkdirSync("lib/openings", { recursive: true });
  mkdirSync("review", { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);

  const lines = [
    "# Unmapped Lichess lines",
    "",
    "These rows from `lichess-org/chess-openings` are not in the trainer.",
    "Nothing is dropped silently: the reason is recorded below.",
    "",
    "| ECO | Name | Reason | Detail | PGN |",
    "| --- | --- | --- | --- | --- |",
    ...unmapped.map(
      ({ row, reason, detail }) =>
        `| ${row.eco} | ${row.name.replace(/\|/g, "\\|")} | ${reason} | ${detail} | ${row.pgn.replace(/\|/g, "\\|")} |`,
    ),
    "",
    `Total: ${unmapped.length} rows (${rows.length} input rows).`,
    "",
  ];
  writeFileSync(UNMAPPED, lines.join("\n"));

  removedDuplicates.sort(
    (a, b) =>
      a.slug.localeCompare(b.slug) ||
      a.line.name.localeCompare(b.line.name, "en", { sensitivity: "base" }) ||
      a.line.moves.length - b.line.moves.length,
  );
  const duplicateLines = [
    "# Duplicate opening lines removed",
    "",
    "These imported lines had the same course, the exact same name and a pure",
    "prefix move order as a longer line. Only the longest version is kept.",
    "Different move orders with the same name are transpositions and stay.",
    "",
    "| Course | Name | ECO | Removed plies | Kept line | Kept plies | Removed PGN |",
    "| --- | --- | --- | ---: | --- | ---: | --- |",
    ...removedDuplicates.map(
      ({ slug, line, kept }) =>
        `| ${slug} | ${escapeCell(line.name)} | ${line.eco} | ${line.moves.length} | ${escapeCell(kept.id)} | ${kept.moves.length} | ${escapeCell(line.pgn)} |`,
    ),
    "",
    `Total: ${removedDuplicates.length} duplicate lines removed.`,
    "",
  ];
  writeFileSync(DUPLICATES, duplicateLines.join("\n"));

  const total = Object.values(output).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`Imported ${total} named lines into ${OUTPUT}`);
  for (const [slug, arr] of Object.entries(output)) {
    console.log(`  ${slug.padEnd(24)} ${String(arr.length).padStart(4)}`);
  }
  console.log(`Imported short entry lines marked partial: ${partialCount}`);
  for (const name of shortKept.slice(0, 20)) console.log(`  ${name}`);
  console.log(
    `Duplicate lines removed: ${removedDuplicates.length} (see ${DUPLICATES})`,
  );
  console.log(`Unmapped rows: ${unmapped.length} (see ${UNMAPPED})`);
}

function pliesLabel(plies: number): string {
  return `${plies} plies`;
}

main();
