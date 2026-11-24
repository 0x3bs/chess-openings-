/**
 * Generate one short study note per named line from the parent-course notes,
 * the distinguishing move and a Stockfish evaluation of the final position.
 *
 * The generator is deterministic and never copies external prose. Every note
 * is checked before it is written; rejected notes are reported, not shipped.
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import type { Move } from "chess.js";
import { openings } from "../lib/openings";
import {
  buildLineFacts,
  isNearDuplicate,
  validateIdeaText,
  type StoredLineIdea,
} from "../lib/openings/idea-validation";
import type { Opening, OpeningLine } from "../lib/openings/types";

const require = createRequire(import.meta.url);
const stockfish = require("stockfish");

type Bilingual = { en: string; ar: string };

type ParentIdea = {
  name: string;
  overview: Bilingual;
  whitePlan: Bilingual;
  blackPlan: Bilingual;
  pawnStructure: Bilingual;
  commonMistake: Bilingual;
  source: "manual";
};

type FieldKey = "pawnStructure" | "whitePlan" | "blackPlan" | "commonMistake";

type Rejection = {
  lineId: string;
  name: string;
  opening: string;
  reasons: string[];
  /** The dropped draft, kept so reviewers can see what failed and why. */
  en: string;
  ar: string;
};

const DEPTH = Number(process.env.SF_DEPTH ?? 12);
const EVAL_CACHE_PATH = "data/line-evals.json";
const parents = JSON.parse(
  readFileSync("data/parent-ideas.json", "utf8"),
) as Record<string, ParentIdea>;

function loadEvalCache(): Record<string, number> {
  try {
    const parsed = JSON.parse(readFileSync(EVAL_CACHE_PATH, "utf8")) as {
      depth?: number;
      evals?: Record<string, number>;
    };
    // Never reuse numbers produced at a different search depth.
    if (parsed.depth === DEPTH && parsed.evals) return parsed.evals;
  } catch {
    // Missing or unreadable cache: evaluate everything again.
  }
  return {};
}

const diskEvalCache = loadEvalCache();

let lineHandler: ((line: string) => void) | null = null;
const engine = stockfish("lite-single", (line: string) => lineHandler?.(line));
const evalCache = new Map<string, Promise<number>>();

function evaluateCp(fen: string): Promise<number> {
  const cached = evalCache.get(fen);
  if (cached) return cached;
  const saved = diskEvalCache[fen];
  if (saved !== undefined) return Promise.resolve(saved);

  const pending = new Promise<number>((resolve) => {
    let cp = 0;

    lineHandler = (line: string) => {
      if (line.startsWith("info ") && line.includes(" score ")) {
        const mate = line.match(/score mate (-?\d+)/);
        const score = line.match(/score cp (-?\d+)/);
        if (mate) {
          cp = Number(mate[1]) > 0 ? 20000 : -20000;
        } else if (score) {
          cp = Number(score[1]);
        }
      }

      if (line.startsWith("bestmove ")) {
        lineHandler = null;
        const turn = fen.split(" ")[1];
        const whitePov = turn === "w" ? cp : -cp;
        diskEvalCache[fen] = whitePov;
        resolve(whitePov);
      }
    };

    engine.processCommand(`position fen ${fen}`);
    engine.processCommand(`go depth ${DEPTH}`);
  });

  evalCache.set(fen, pending);
  return pending;
}

function stripPeriod(text: string): string {
  return text.trim().replace(/[.]+$/, "");
}

function lowerFirst(text: string): string {
  return text ? text[0].toLowerCase() + text.slice(1) : text;
}

function upperFirst(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

function infinitive(verb: string): string {
  const lower = verb.toLowerCase();
  if (lower === "fianchettoes") return "fianchetto";
  if (lower === "is") return "be";
  if (lower === "has") return "have";
  if (lower === "does") return "do";
  if (lower.endsWith("ies")) return `${verb.slice(0, -3)}y`;
  if (lower.endsWith("sses")) return verb.slice(0, -2);
  if (lower.endsWith("s")) return verb.slice(0, -1);
  return verb;
}

/** Third-person verbs used in the parent notes, converted to infinitives. */
const PLAN_VERBS = new Set([
  "accepts", "advances", "aims", "allows", "answers", "applies", "arrives",
  "attacks", "avoids", "becomes", "breaks", "builds", "castles", "challenges",
  "chooses", "combines", "completes", "concedes", "consolidates", "contests",
  "controls", "counterattacks", "creates", "declines", "develops", "equalises",
  "exploits", "fianchettoes", "fights", "frees", "gains", "grows", "has",
  "holds", "improves", "is", "keeps", "lands", "looks", "meets", "mirrors",
  "offers", "opens", "pins", "plans", "plays", "prepares", "presses",
  "pressures", "recaptures", "returns", "sacrifices", "seeks", "strikes",
  "supports", "targets", "trades", "tries", "uses",
]);

function toInfinitiveClause(text: string): string {
  return text.replace(/\b([a-z]+)\b/g, (word) =>
    PLAN_VERBS.has(word) ? infinitive(word) : word,
  );
}

function planClause(text: string, subject: "White" | "Black"): string {
  const cleaned = stripPeriod(text).replace(
    new RegExp(`^${subject}\\s+`, "i"),
    "",
  );
  return toInfinitiveClause(cleaned);
}

function planClauseAr(text: string, subject: "الأبيض" | "الأسود"): string {
  // Every Arabic parent plan starts with verb + subject, so dropping the first
  // subject occurrence turns "يطوّر الأبيض …" into "يطوّر …" for "أن يطوّر …".
  return stripPeriod(text)
    .replace(subject, "")
    .replace(/\s+/g, " ")
    .trim();
}

function describeMove(
  move: Move | undefined,
  moveNumber: number,
  locale: "en" | "ar",
): string {
  if (!move) {
    return locale === "en" ? "the main move order" : "ترتيب النقلات الرئيسي";
  }
  if (move.san === "O-O") {
    return locale === "en"
      ? `short castling on move ${moveNumber}`
      : `التحصيل القصير في النقلة ${moveNumber}`;
  }
  if (move.san === "O-O-O") {
    return locale === "en"
      ? `long castling on move ${moveNumber}`
      : `التحصيل الطويل في النقلة ${moveNumber}`;
  }

  const square = move.to;
  if (move.captured) {
    return locale === "en"
      ? `the capture on ${square} on move ${moveNumber}`
      : `التبادل على ${square} في النقلة ${moveNumber}`;
  }
  if (move.piece === "p") {
    return locale === "en"
      ? `the pawn move to ${square} on move ${moveNumber}`
      : `نقلة البيدق إلى ${square} في النقلة ${moveNumber}`;
  }

  const names: Record<string, [string, string]> = {
    n: ["knight", "الحصان"],
    b: ["bishop", "الفيل"],
    r: ["rook", "الرخ"],
    q: ["queen", "الملكة"],
    k: ["king", "الملك"],
  };
  const [en, ar] = names[move.piece] ?? ["piece", "القطعة"];
  return locale === "en"
    ? `the ${en} move to ${square} on move ${moveNumber}`
    : `نقلة ${ar} إلى ${square} في النقلة ${moveNumber}`;
}

function evalPhrase(cp: number, locale: "en" | "ar"): string {
  const abs = Math.abs(cp);
  const white = cp >= 0;
  if (abs <= 50) {
    return locale === "en" ? "balanced" : "متوازن";
  }
  if (abs <= 150) {
    if (locale === "en") {
      return white ? "slightly better for White" : "slightly better for Black";
    }
    return white ? "يميل قليلًا لصالح الأبيض" : "يميل قليلًا لصالح الأسود";
  }
  if (abs <= 300) {
    if (locale === "en") {
      return white ? "clearly better for White" : "clearly better for Black";
    }
    return white ? "أفضل بوضوح للأبيض" : "أفضل بوضوح للأسود";
  }
  if (abs <= 500) {
    if (locale === "en") {
      return white ? "with a large advantage for White" : "with a large advantage for Black";
    }
    return white ? "بتفوق كبير للأبيض" : "بتفوق كبير للأسود";
  }
  if (locale === "en") {
    return white ? "with a decisive advantage for White" : "with a decisive advantage for Black";
  }
  return white ? "بتفوق حاسم للأبيض" : "بتفوق حاسم للأسود";
}

const SAN_TOKEN =
  /\b(?:O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)\b/g;

const TRAILING_FILLER = /(?:^|\s)(?:with|vs|and|of|in|the|a|an|on|at|for)$/i;

function tidyLabel(text: string): string {
  const cleaned = text
    .replace(SAN_TOKEN, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/[.]{2,}/g, " ")
    .replace(/[.&()[\]{},;:]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s-]+|[\s-]+$/g, "")
    .trim();
  let result = cleaned;
  while (TRAILING_FILLER.test(result)) {
    result = result.replace(TRAILING_FILLER, "").trim();
  }
  result = result.replace(/^(?:the|a|an)\s+/i, "").trim();
  return result;
}

function variationLabel(line: OpeningLine): string {
  const head = line.name.includes(":")
    ? line.name.split(":").slice(1).join(":")
    : line.name;
  const firstSegment = head.split(",")[0] ?? head;
  const cleaned = tidyLabel(firstSegment);
  if (cleaned.length >= 3) return cleaned;

  const fallback = tidyLabel(line.name.split(",")[0] ?? line.name);
  return fallback.length >= 3 ? fallback : "main line";
}

function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

type Parts = {
  variation: string;
  eco: string;
  branch: string;
  final: string;
  plies: number;
  field: string;
  eval: string;
};

/** Attach the Arabic preposition "ب" without the decorative tatweel. */
function ba(text: string): string {
  return text.startsWith("ال") ? `بال${text.slice(2)}` : `ب${text}`;
}

/** Sentence one when the branch move is also the last move of the line. */
const EN_FRAMES_SAME: Array<(parts: Parts) => string> = [
  (p) =>
    `The ${p.variation} (ECO ${p.eco}) turns on ${p.branch}, the last move of the ${p.plies}-ply line.`,
  (p) =>
    `${upperFirst(p.variation)} (ECO ${p.eco}) is a ${p.plies}-ply line that ends on ${p.branch}.`,
  (p) =>
    `In the ${p.variation} (ECO ${p.eco}), the ${p.plies}-ply line closes with ${p.branch}.`,
  (p) =>
    `${upperFirst(p.variation)} (ECO ${p.eco}) reaches ${p.branch} and stops after ${p.plies} plies.`,
];

const AR_FRAMES_SAME: Array<(parts: Parts) => string> = [
  (p) =>
    `يقوم خط ${p.variation} (ECO ${p.eco}) على ${p.branch}، وهي النقلة الأخيرة في خط من ${p.plies} نصف نقلة.`,
  (p) =>
    `خط ${p.variation} (ECO ${p.eco}) من ${p.plies} نصف نقلة ينتهي ${ba(p.final)}.`,
  (p) =>
    `في خط ${p.variation} (ECO ${p.eco}) ينتهي الخط المكوّن من ${p.plies} نصف نقلة ${ba(p.final)}.`,
  (p) =>
    `يصل خط ${p.variation} (ECO ${p.eco}) إلى ${p.branch} ويتوقف بعد ${p.plies} نصف نقلة.`,
];

/** Sentence one when the line continues past its branch move. */
const EN_FRAMES: Array<(parts: Parts) => string> = [
  (p) =>
    `The ${p.variation} (ECO ${p.eco}) turns on ${p.branch}; the line runs ${p.plies} plies and closes with ${p.final}.`,
  (p) =>
    `${upperFirst(p.variation)} (ECO ${p.eco}) branches with ${p.branch} and runs ${p.plies} plies to ${p.final}.`,
  (p) =>
    `In the ${p.variation} (ECO ${p.eco}), ${p.branch} is the branch point; play runs ${p.plies} plies and ends with ${p.final}.`,
  (p) =>
    `${upperFirst(p.variation)} (ECO ${p.eco}) diverges with ${p.branch} and closes with ${p.final} after ${p.plies} plies.`,
];

const AR_FRAMES: Array<(parts: Parts) => string> = [
  (p) =>
    `يقوم خط ${p.variation} (ECO ${p.eco}) على ${p.branch}؛ ويمتد ${p.plies} نصف نقلة وينتهي ${ba(p.final)}.`,
  (p) =>
    `يتفرّع خط ${p.variation} (ECO ${p.eco}) ${ba(p.branch)} ويمتد ${p.plies} نصف نقلة إلى ${p.final}.`,
  (p) =>
    `في خط ${p.variation} (ECO ${p.eco}) يكون ${p.branch} نقطة التفرّع؛ ويمتد اللعب ${p.plies} نصف نقلة وينتهي ${ba(p.final)}.`,
  (p) =>
    `يختلف خط ${p.variation} (ECO ${p.eco}) ${ba(p.branch)} وينتهي ${ba(p.final)} بعد ${p.plies} نصف نقلة.`,
];

const FIELD_ORDER: FieldKey[] = [
  "pawnStructure",
  "whitePlan",
  "blackPlan",
  "commonMistake",
];

/**
 * Keep the first clause of a long parent sentence. The note stays short and
 * readable, and lines in the same course stop sharing an identical tail.
 */
function firstClause(text: string): string {
  const cleaned = stripPeriod(text);
  const parts = cleaned.split(/\s*[,;،]\s*/).filter(Boolean);
  if (parts.length < 2) return cleaned;

  let clause = parts[0];
  let index = 1;
  while (clause.split(/\s+/).length < 4 && index < parts.length) {
    clause = `${clause}, ${parts[index]}`;
    index += 1;
  }
  return clause;
}

function fieldClauseEn(parent: ParentIdea, key: FieldKey): string {
  switch (key) {
    case "pawnStructure":
      return `the line leads to ${lowerFirst(
        firstClause(parent.pawnStructure.en),
      )}`;
    case "whitePlan":
      return `White should ${planClause(
        firstClause(parent.whitePlan.en),
        "White",
      )}`;
    case "blackPlan":
      return `Black should ${planClause(
        firstClause(parent.blackPlan.en),
        "Black",
      )}`;
    case "commonMistake":
      return `the typical mistake is ${lowerFirst(
        firstClause(parent.commonMistake.en),
      )}`;
  }
}

function fieldClauseAr(parent: ParentIdea, key: FieldKey): string {
  switch (key) {
    case "pawnStructure":
      return `ويؤدي الخط إلى ${firstClause(parent.pawnStructure.ar)}`;
    case "whitePlan":
      return `خطة الأبيض هي أن ${planClauseAr(
        firstClause(parent.whitePlan.ar),
        "الأبيض",
      )}`;
    case "blackPlan":
      return `خطة الأسود هي أن ${planClauseAr(
        firstClause(parent.blackPlan.ar),
        "الأسود",
      )}`;
    case "commonMistake":
      return `الخطأ الشائع هو ${firstClause(parent.commonMistake.ar)}`;
  }
}

function parentKey(opening: Opening, line: OpeningLine): string {
  return line.parentName ?? opening.name;
}

/**
 * The branch point: the first ply where this line stops matching every other
 * line in the course. That is the move that actually defines the line, unlike
 * a comparison with an arbitrary "shortest" line.
 */
function distinguishingIndex(opening: Opening, line: OpeningLine): number {
  let longestSharedPrefix = -1;

  for (const other of opening.lines) {
    if (other.id === line.id) continue;
    let index = 0;
    while (
      index < line.moves.length &&
      index < other.moves.length &&
      line.moves[index].san === other.moves[index].san
    ) {
      index += 1;
    }
    if (index > longestSharedPrefix) longestSharedPrefix = index;
  }

  if (longestSharedPrefix < 0 || longestSharedPrefix >= line.moves.length) {
    return line.moves.length - 1;
  }
  return longestSharedPrefix;
}

function buildTexts(
  opening: Opening,
  line: OpeningLine,
  parent: ParentIdea,
  evalCp: number,
): { en: string; ar: string; distinguishingMove: string | null } {
  const facts = buildLineFacts(line);
  const branchIndex = distinguishingIndex(opening, line);
  const finalIndex = Math.max(facts.moves.length - 1, 0);
  const sameMove = branchIndex === finalIndex;
  const branchNumber = Math.floor(branchIndex / 2) + 1;
  const finalNumber = Math.floor(finalIndex / 2) + 1;
  const branchMove = facts.moves[branchIndex];
  const finalMove = facts.moves[finalIndex];
  const distinguishingMove = branchMove?.san ?? null;
  const variation = variationLabel(line);
  const eco = line.eco?.trim() || opening.eco;
  const field = FIELD_ORDER[hash(`${line.id}:field`) % FIELD_ORDER.length];
  const enFrames = sameMove ? EN_FRAMES_SAME : EN_FRAMES;
  const arFrames = sameMove ? AR_FRAMES_SAME : AR_FRAMES;
  const frameIndex = hash(`${line.id}:frame`) % enFrames.length;

  const parts: Parts = {
    variation,
    eco,
    branch: describeMove(branchMove, branchNumber, "en"),
    final: describeMove(finalMove, finalNumber, "en"),
    plies: line.moves.length,
    field: fieldClauseEn(parent, field),
    eval: evalPhrase(evalCp, "en"),
  };

  const arParts: Parts = {
    ...parts,
    branch: describeMove(branchMove, branchNumber, "ar"),
    final: describeMove(finalMove, finalNumber, "ar"),
    field: fieldClauseAr(parent, field),
    eval: evalPhrase(evalCp, "ar"),
  };

  const en = `${enFrames[frameIndex](parts)} ${upperFirst(
    parts.field,
  )}, and the final position is ${parts.eval}.`;
  const ar = `${arFrames[frameIndex](arParts)} ${arParts.field}، والوضع النهائي ${arParts.eval}.`;

  return { en, ar, distinguishingMove };
}

function saveEvalCache(): void {
  writeFileSync(
    EVAL_CACHE_PATH,
    `${JSON.stringify({ depth: DEPTH, evals: diskEvalCache }, null, 2)}\n`,
  );
}

async function run(): Promise<void> {
  const accepted: StoredLineIdea[] = [];
  const rejected: Rejection[] = [];
  const seenByParent = new Map<string, { en: string[]; ar: string[] }>();
  const perOpening: Record<string, { total: number; accepted: number }> = {};
  let attempted = 0;

  for (const opening of openings) {
    const parent = parents[opening.slug];
    perOpening[opening.slug] = { total: opening.lines.length, accepted: 0 };

    if (!parent) {
      for (const line of opening.lines) {
        rejected.push({
          lineId: line.id,
          name: line.name,
          opening: opening.slug,
          reasons: ["missing parent explanation"],
          en: "",
          ar: "",
        });
      }
      continue;
    }

    for (const line of opening.lines) {
      attempted += 1;
      const facts = buildLineFacts(line);
      const evalCp = await evaluateCp(facts.finalFen);
      const { en, ar, distinguishingMove } = buildTexts(
        opening,
        line,
        parent,
        evalCp,
      );

      const reasons = [
        ...validateIdeaText(en, facts, evalCp),
        ...validateIdeaText(ar, facts, evalCp),
      ];

      const key = parentKey(opening, line);
      const seen = seenByParent.get(key) ?? { en: [], ar: [] };
      if (isNearDuplicate(en, seen.en)) {
        reasons.push("near-duplicate English explanation");
      }
      if (isNearDuplicate(ar, seen.ar)) {
        reasons.push("near-duplicate Arabic explanation");
      }

      if (reasons.length) {
        rejected.push({
          lineId: line.id,
          name: line.name,
          opening: opening.slug,
          reasons,
          en,
          ar,
        });
      } else {
        accepted.push({
          lineId: line.id,
          en,
          ar,
          source: "auto-generated",
          evalCp,
          distinguishingMove,
        });
        seen.en.push(en);
        seen.ar.push(ar);
        seenByParent.set(key, seen);
        perOpening[opening.slug].accepted += 1;
      }

      if (attempted % 100 === 0) {
        saveEvalCache();
        console.log(
          `  ${attempted} lines checked, ${accepted.length} accepted, ${rejected.length} rejected`,
        );
      }
    }
  }

  saveEvalCache();

  const reasonCounts: Record<string, number> = {};
  for (const entry of rejected) {
    for (const reason of entry.reasons) {
      reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
    }
  }

  writeFileSync(
    "data/line-ideas.json",
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        engine: `stockfish lite-single depth ${DEPTH}`,
        totalLines: attempted,
        accepted: accepted.length,
        rejected: rejected.length,
        lines: accepted,
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    "review/idea-report.json",
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalLines: attempted,
        accepted: accepted.length,
        rejectedCount: rejected.length,
        reasonCounts,
        perOpening,
        rejected,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `Generated ${accepted.length}/${attempted} explanations; ${rejected.length} rejected.`,
  );
  for (const [reason, count] of Object.entries(reasonCounts).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${count.toString().padStart(4)}  ${reason}`);
  }
  console.log("Wrote data/line-ideas.json and review/idea-report.json");
  engine.terminate();
}

void run();
