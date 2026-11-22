import { Chess } from "chess.js";
import type { Locale } from "../i18n/config";
import { getMessages } from "../i18n/messages";
import { fill } from "../i18n/plural";
import type {
  CoachPoint,
  CoachShape,
  MoveIdea,
  Opening,
  OpeningLine,
  OpeningSource,
  TextHotspot,
} from "./types";

const OPENING_REFERENCE =
  "https://en.wikipedia.org/wiki/List_of_chess_openings";
const ECO_REFERENCE =
  "https://en.wikipedia.org/wiki/Encyclopaedia_of_Chess_Openings";

type MoveContext = {
  san: string;
  from: string;
  to: string;
  piece: string;
  isWhite: boolean;
};

type Candidate = {
  phrases: string[];
  label: string;
  shapes: CoachShape[];
};

const PIECE_NAMES: Record<
  Locale,
  Record<string, { one: string; many: string }>
> = {
  en: {
    p: { one: "pawn", many: "pawns" },
    n: { one: "knight", many: "knights" },
    b: { one: "bishop", many: "bishops" },
    r: { one: "rook", many: "rooks" },
    q: { one: "queen", many: "queens" },
    k: { one: "king", many: "kings" },
  },
  ar: {
    p: { one: "بيدق", many: "بيادق" },
    n: { one: "حصان", many: "أحصنة" },
    b: { one: "فيل", many: "أفيال" },
    r: { one: "رخ", many: "رخاخ" },
    q: { one: "ملكة", many: "ملكات" },
    k: { one: "ملك", many: "ملوك" },
  },
};

const CENTRE: CoachShape[] = [
  { kind: "circle", square: "d4" },
  { kind: "circle", square: "e4" },
  { kind: "circle", square: "d5" },
  { kind: "circle", square: "e5" },
];

/** Lichess accepts a FEN with underscores instead of spaces. */
export function analysisUrl(fen: string): string {
  return `https://lichess.org/analysis/standard/${fen.replace(/ /g, "_")}`;
}

/** Destination square of a SAN move, used for the default idea highlight. */
function destinationOf(san: string, isWhite: boolean): string | null {
  if (san.startsWith("O-O-O")) return isWhite ? "c1" : "c8";
  if (san.startsWith("O-O")) return isWhite ? "g1" : "g8";

  const cleaned = san.replace(/[+#!?]/g, "");
  const match = cleaned.match(/([a-h][1-8])$/);
  return match ? match[1] : null;
}

function finalFen(line: OpeningLine): string | null {
  try {
    const chess = new Chess();
    for (const move of line.moves) chess.move(move.san);
    return chess.fen();
  } catch {
    return null;
  }
}

function sourcesFor(
  line: OpeningLine,
  locale: Locale = "en",
): OpeningSource[] {
  const labels = getMessages(locale).idea.sources;
  const sources: OpeningSource[] = [];

  const fen = finalFen(line);
  if (fen) {
    sources.push({
      label: labels.lichess,
      url: analysisUrl(fen),
    });
  }

  sources.push(
    { label: labels.openingIndex, url: OPENING_REFERENCE },
    { label: labels.ecoCodes, url: ECO_REFERENCE },
  );

  return sources;
}

function uniqueShapes(shapes: CoachShape[]): CoachShape[] {
  const seen = new Set<string>();
  const result: CoachShape[] = [];

  for (const shape of shapes) {
    const key =
      shape.kind === "circle"
        ? `c:${shape.square}`
        : `a:${shape.from}:${shape.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(shape);
    if (result.length === 8) break;
  }

  return result;
}

function arrowOf(context: MoveContext): CoachShape {
  return { kind: "arrow", from: context.from, to: context.to };
}

/**
 * Build word-level board hints from the text itself. Chess terms, squares and
 * the move notation become hoverable; each one gets a small, concrete board
 * picture instead of dumping every highlight at once.
 */
const CONCEPT_PHRASES: Record<
  Locale,
  {
    centre: string[];
    fianchetto: string[];
    longDiagonal: string[];
    cFile: string[];
    eFile: string[];
    d4Break: string[];
    castle: string[];
  }
> = {
  en: {
    centre: ["centre", "center", "central"],
    fianchetto: ["fianchetto", "fianchettoed"],
    longDiagonal: ["long diagonal", "long light diagonal"],
    cFile: ["c-file"],
    eFile: ["e-file"],
    d4Break: ["d4 break", "break with d4", "breaks with d4"],
    castle: ["castle", "castles", "castled", "castling", "king safety"],
  },
  ar: {
    centre: ["المركز", "المركزي", "المركزية"],
    fianchetto: ["فيانكيتو", "الفيانكيتو"],
    longDiagonal: ["القطر الطويل", "القطر الفاتح الطويل"],
    cFile: ["العمود c", "عمود c"],
    eFile: ["العمود e", "عمود e"],
    d4Break: ["كسر d4", "يكسر بـd4", "الكسر بـd4"],
    castle: ["التحصين", "تحصين", "التبييت", "تبييت", "أمان الملك"],
  },
};

function buildHotspots(
  text: string,
  context: MoveContext,
  idPrefix: string,
  locale: Locale = "en",
): TextHotspot[] {
  const m = getMessages(locale);
  const lower = text.toLowerCase();
  const candidates: Candidate[] = [];
  const usedPhrases = new Set<string>();
  const moveArrow = arrowOf(context);

  function add(
    phrases: string[],
    label: string,
    shapes: CoachShape[],
  ): void {
    const clean = phrases
      .map((phrase) => phrase.trim())
      .filter((phrase) => phrase.length > 0)
      .filter((phrase) => {
        const key = phrase.toLowerCase();
        if (usedPhrases.has(key) || !lower.includes(key)) return false;
        usedPhrases.add(key);
        return true;
      });

    if (!clean.length) return;

    const next = uniqueShapes(shapes);
    if (!next.length) return;
    candidates.push({ phrases: clean, label, shapes: next });
  }

  // The move itself is the most useful place to start.
  const bareSan = context.san.replace(/[+#!?]/g, "");
  add(
    [context.san, bareSan],
    fill(m.idea.moveLabel, {
      san: context.san,
      from: context.from,
      to: context.to,
    }),
    [moveArrow],
  );

  // Whole move references such as Nxe4 or cxd5 should underline as one word,
  // not just the final square.
  const sanTokens = new Set(
    text.match(
      /\b(?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|[a-h]x[a-h][1-8])\b/g,
    ) ?? [],
  );
  for (const token of sanTokens) {
    const destination = token.match(/([a-h][1-8])/)?.[1];
    if (!destination) continue;
    add([token], fill(m.idea.moveName, { san: token }), [
      { kind: "circle", square: destination },
    ]);
  }

  // Every square named in the sentence becomes a circle.
  const squares = new Set(text.match(/[a-h][1-8]/g) ?? []);
  for (const square of squares) {
    add([square], fill(m.idea.square, { square }), [
      { kind: "circle", square },
    ]);
  }

  // Only the piece that actually moved gets a word link. Hovering "bishop"
  // after a knight move would be misleading, so other piece names stay plain.
  const piece = PIECE_NAMES[locale][context.piece];
  if (piece) {
    add([piece.one, piece.many], fill(m.idea.piece, { piece: piece.one }), [
      moveArrow,
    ]);
  }

  const white = context.isWhite;
  const longDiagonal: CoachShape[] = white
    ? [
        { kind: "circle", square: "g2" },
        { kind: "arrow", from: "g2", to: "a8" },
      ]
    : [
        { kind: "circle", square: "g7" },
        { kind: "arrow", from: "g7", to: "h1" },
      ];

  const phrases = CONCEPT_PHRASES[locale];
  const concepts: Candidate[] = [
    {
      phrases: phrases.centre,
      label: m.idea.centre,
      shapes: CENTRE,
    },
    {
      phrases: phrases.fianchetto,
      label: m.idea.fianchetto,
      shapes: longDiagonal,
    },
    {
      phrases: phrases.longDiagonal,
      label: m.idea.longDiagonal,
      shapes: longDiagonal,
    },
    {
      phrases: phrases.cFile,
      label: m.idea.cFile,
      shapes: [
        { kind: "circle", square: "c4" },
        { kind: "circle", square: "c7" },
      ],
    },
    {
      phrases: phrases.eFile,
      label: m.idea.eFile,
      shapes: [
        { kind: "circle", square: "e4" },
        { kind: "circle", square: "e5" },
      ],
    },
    {
      phrases: phrases.d4Break,
      label: m.idea.d4Break,
      shapes: [{ kind: "circle", square: "d4" }],
    },
    {
      phrases: phrases.castle,
      label: m.idea.kingSafety,
      shapes: white
        ? [
            { kind: "circle", square: "g1" },
            { kind: "circle", square: "f1" },
          ]
        : [
            { kind: "circle", square: "g8" },
            { kind: "circle", square: "f8" },
          ],
    },
  ];

  for (const concept of concepts) {
    add(concept.phrases, concept.label, concept.shapes);
  }

  return candidates.slice(0, 10).map((candidate, index) => ({
    id: `${idPrefix}-${index}`,
    phrases: candidate.phrases,
    label: candidate.label,
    shapes: candidate.shapes,
  }));
}

function hotspotPoint(
  point: CoachPoint,
  context: MoveContext,
  index: number,
  locale: Locale = "en",
): CoachPoint {
  return {
    ...point,
    hotspots: buildHotspots(
      point.text,
      context,
      `${point.id}-word-${index}`,
      locale,
    ),
  };
}

/**
 * Merge the one-sentence idea list into the opening data, attach source links
 * and add the hoverable word map. Kept separate from `english.ts` so the move
 * list stays readable.
 */
export function attachIdeas(
  opening: Opening,
  ideas: Record<string, string[]>,
  locale: Locale = "en",
): Opening {
  return {
    ...opening,
    lines: opening.lines.map((line) => {
      const sentences = ideas[line.id] ?? [];
      const chess = new Chess();

      return {
        ...line,
        sources: line.sources ?? sourcesFor(line, locale),
        moves: line.moves.map((move, index) => {
          const isWhite = index % 2 === 0;
          let context: MoveContext | null = null;

          try {
            const played = chess.move(move.san);
            context = {
              san: move.san,
              from: played.from,
              to: played.to,
              piece: played.piece,
              isWhite,
            };
          } catch {
            // The validation script catches illegal move orders. Keep the
            // course renderable rather than crashing the whole page.
          }

          const square = destinationOf(move.san, isWhite);
          const shapes: CoachShape[] = square
            ? [{ kind: "circle", square }]
            : [];

          const coach = move.coach?.map((point, noteIndex) =>
            context
              ? hotspotPoint(point, context, noteIndex, locale)
              : point,
          );

          const text = sentences[index];
          if (!text) {
            return coach ? { ...move, coach } : move;
          }

          const idea: MoveIdea = context
            ? {
                text,
                shapes,
                hotspots: buildHotspots(
                  text,
                  context,
                  `${line.id}-move-${index + 1}-idea`,
                  locale,
                ),
              }
            : { text, shapes };

          return { ...move, idea, ...(coach ? { coach } : {}) };
        }),
      };
    }),
  };
}
