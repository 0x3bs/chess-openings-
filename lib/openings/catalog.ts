import { Chess, type Move } from "chess.js";
import type { Locale } from "../i18n/config";
import { translateSeed } from "../i18n/content/catalog-ar";
import { attachIdeas } from "./apply-ideas";
import generatedExtraRaw from "../../data/extra-lines.json";
import lichessLines from "./lichess-lines.json";
import { partialLineIds } from "./partial";
import type { LineLevel, Opening, OpeningLine } from "./types";

type ImportedLine = {
  id: string;
  name: string;
  eco: string;
  summary: string;
  tags: string[];
  moves: string[];
  parentName: string;
  family: string;
  level: LineLevel;
  pgn: string;
  partial?: boolean;
  i18n: { ar: { name: string; summary: string; tags: string[] } };
};

export type LineSeed = {
  id: string;
  name: string;
  eco: string;
  summary: string;
  tags: string[];
  moves: string[];
  parentName?: string;
  family?: string;
  level?: LineLevel;
  source?: "lichess" | "manual";
  partial?: boolean;
  i18n?: { ar: { name: string; summary: string; tags: string[] } };
};

const imported = lichessLines as unknown as Record<string, ImportedLine[]>;

export type OpeningSeed = {
  slug: string;
  name: string;
  eco: string;
  side: "white" | "black";
  intro: string;
  themes: string[];
  lines: LineSeed[];
};

const SOURCE_NOTE =
  "Move orders are checked with chess.js and every finished line is blunder-screened with Stockfish. Verify sharp positions on the board.";

const SOURCE_NOTE_AR =
  "تم التحقق من ترتيب النقلات بـchess.js وفحص كل خط مكتمل بـStockfish. تحقّق من الأوضاع الحادة على الرقعة.";

const PIECES: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

function sideName(color: "w" | "b"): string {
  return color === "w" ? "White" : "Black";
}

function checkSuffix(san: string): string {
  if (san.includes("#")) return ", delivering checkmate.";
  if (san.includes("+")) return ", giving check.";
  return ".";
}

function checkSuffixAr(san: string): string {
  if (san.includes("#")) return "، ويُعلن كش مات.";
  if (san.includes("+")) return "، ويعطي كشًا.";
  return ".";
}

function describeMoveAr(move: Move, index: number): string {
  const side = move.color === "w" ? "الأبيض" : "الأسود";

  if (index === 0) {
    if (move.san === "e4") {
      return "يفتتح الأبيض بـ1.e4، فيكسب مساحة مركزية ويحرّر الفيلين.";
    }
    if (move.san === "d4") {
      return "يفتتح الأبيض بـ1.d4، فيبني قاعدة مركزية ويهيّئ c4 أو e3.";
    }
    if (move.san === "c4") {
      return "يفتتح الأبيض بـ1.c4، فيضغط على d5 من الجناح ويُبقي المركز مرنًا.";
    }
    if (move.san === "Nf3") {
      return "يفتتح الأبيض بـ1.Nf3، فيسيطر على e5 وd4 ويُبقي نقلات البيادق مرنة.";
    }
    return `يبدأ الأبيض بـ${move.san}، فيكسب مساحة ويبدأ الترتيب.`;
  }

  if (move.san.startsWith("O-O-O")) {
    return `${side} يحصّن طويلًا، فينشّط الرخ ويُبعد الملك عن المركز.`;
  }
  if (move.san.startsWith("O-O")) {
    return `${side} يحصّن قصيرًا، فيربط الرخاخ ويضع الملك في أمان.`;
  }

  if (move.captured) {
    return `${side} يأخذ على ${move.to}، فيزيل مدافعًا ويغيّر البنية${checkSuffixAr(move.san)}`;
  }

  if (move.san.includes("#")) {
    return `${side} يُعلن كش مات على ${move.to}، فينهي المباراة.`;
  }
  if (move.san.includes("+")) {
    return `${side} يعطي كشًا على ${move.to}، فيجبر على رد ويكسب زمنًا.`;
  }

  if (move.piece === "n") {
    return `${side} يطوّر الحصان إلى ${move.to}، فيزيد السيطرة على المركز ويهيّئ كسر البيدق التالي.`;
  }
  if (move.piece === "b") {
    return `${side} يطوّر الفيل إلى ${move.to}، فيزيد الضغط على المربعات المركزية.`;
  }
  if (move.piece === "r") {
    return `${side} ينقل الرخ إلى ${move.to}، فيسيطر على عمود مفتوح ويدعم الهجوم.`;
  }
  if (move.piece === "q") {
    return `${side} ينقل الملكة إلى ${move.to}، فيربط الرخاخ ويراقب المربعات الرئيسية.`;
  }
  if (move.piece === "k") {
    return `${side} ينقل الملك إلى ${move.to}، فيحسّن أمانه قبل وسط المباراة.`;
  }

  if (["d4", "e4", "d5", "e5"].includes(move.to)) {
    return `${side} يدفع البيدق إلى ${move.to}، فيتحدى المركز ويفتح خطوطًا للقطع.`;
  }

  const file = move.to[0];
  return `${side} يقدّم بيدق العمود ${file} إلى ${move.to}، فيكسب مساحة ويهيّئ كسرًا لاحقًا.`;
}

function describeMove(
  move: Move,
  index: number,
  locale: Locale = "en",
): string {
  if (locale === "ar") return describeMoveAr(move, index);

  const side = sideName(move.color);
  const piece = PIECES[move.piece] ?? "piece";

  if (index === 0) {
    if (move.san === "e4") {
      return "White opens with 1.e4, taking central space and freeing both bishops.";
    }
    if (move.san === "d4") {
      return "White opens with 1.d4, building a central base and preparing c4 or e3.";
    }
    if (move.san === "c4") {
      return "White opens with 1.c4, pressing on d5 from the flank and keeping the centre flexible.";
    }
    if (move.san === "Nf3") {
      return "White opens with 1.Nf3, controlling e5 and d4 while keeping the pawn moves flexible.";
    }
    return `White begins with ${move.san}, claiming space and starting the setup.`;
  }

  if (move.san.startsWith("O-O-O")) {
    return `${side} castles long, activating the rook and moving the king away from the centre.`;
  }
  if (move.san.startsWith("O-O")) {
    return `${side} castles short, connecting the rooks and moving the king to safety.`;
  }

  if (move.captured) {
    return `${side} captures on ${move.to}, removing a defender and changing the structure${checkSuffix(move.san)}`;
  }

  if (move.san.includes("+") || move.san.includes("#")) {
    return `${side} checks the king on ${move.to}, forcing a reply and gaining time${checkSuffix(move.san).replace(/^,/, " while")}`;
  }

  if (move.piece === "n") {
    return `${side} develops the knight to ${move.to}, adding control of the centre and preparing the next pawn break.`;
  }
  if (move.piece === "b") {
    return `${side} develops the bishop to ${move.to}, adding pressure on the central squares.`;
  }
  if (move.piece === "r") {
    return `${side} moves the rook to ${move.to}, taking an open file and supporting the attack.`;
  }
  if (move.piece === "q") {
    return `${side} moves the queen to ${move.to}, connecting the rooks and watching the key squares.`;
  }
  if (move.piece === "k") {
    return `${side} steps the king to ${move.to}, improving safety before the middlegame.`;
  }

  if (["d4", "e4", "d5", "e5"].includes(move.to)) {
    return `${side} pushes the pawn to ${move.to}, challenging the centre and opening lines for the pieces.`;
  }

  const file = move.to[0];
  return `${side} advances the ${file}-pawn to ${move.to}, gaining space and preparing a later break.`;
}

export function buildOpening(
  seed: OpeningSeed,
  locale: Locale = "en",
): Opening {
  const localized = locale === "ar" ? translateSeed(seed) : seed;
  const partialIds = partialLineIds(seed.lines);

  const base: Opening = {
    slug: localized.slug,
    name: localized.name,
    eco: localized.eco,
    side: localized.side,
    intro: localized.intro,
    themes: localized.themes,
    sourceNote: locale === "ar" ? SOURCE_NOTE_AR : SOURCE_NOTE,
    lines: localized.lines.map<OpeningLine>((line) => ({
      id: line.id,
      name: line.name,
      eco: line.eco,
      side: localized.side,
      summary: line.summary,
      tags: line.tags,
      moves: line.moves.map((san) => ({ san })),
      parentName: line.parentName,
      family: line.family,
      level: line.level,
      source: line.source ?? (line.parentName ? "lichess" : "manual"),
      // A stale `partial` flag on a full line is cleared here.
      partial: partialIds.has(line.id) || undefined,
    })),
  };

  const ideas: Record<string, string[]> = {};
  for (const line of localized.lines) {
    const chess = new Chess();
    ideas[line.id] = line.moves.map((san, index) => {
      try {
        const move = chess.move(san);
        return describeMove(move, index, locale);
      } catch (error) {
        throw new Error(
          `${line.id} ply ${index + 1} "${san}": ${(error as Error).message}`,
        );
      }
    });
  }

  return attachIdeas(base, ideas, locale);
}

const seeds: OpeningSeed[] = [
  {
    slug: "italian",
    name: "Italian Game",
    eco: "C50–C54",
    side: "white",
    intro:
      "A classical 1.e4 repertoire: develop the bishop to c4, castle quickly and build the c3-d4 centre before Black equalises.",
    themes: ["Open centre", "Bc4 pressure", "c3-d4 break", "Two Knights"],
    lines: [
      {
        id: "italian-giuoco-piano",
        name: "Giuoco Piano",
        eco: "C53",
        summary:
          "The quiet main line. White builds a broad centre with c3 and d3, then improves the pieces before striking.",
        tags: ["Main line", "Positional", "Classical"],
        moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3".split(
          " ",
        ),
      },
      {
        id: "italian-two-knights",
        name: "Two Knights: 4.Ng5",
        eco: "C57",
        summary:
          "The direct knight jump to g5 asks Black to defend f7 and gives White useful central pressure.",
        tags: ["Two Knights", "Tactical", "Main line"],
        moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3".split(
          " ",
        ),
      },
    ],
  },
  {
    slug: "ruy-lopez",
    name: "Ruy Lopez",
    eco: "C60–C99",
    side: "white",
    intro:
      "The Spanish game: pin the c6-knight with Bb5, build a flexible centre and keep long-term pressure on Black's structure.",
    themes: ["Bishop pin", "Morphy structure", "Berlin defence", "Long pressure"],
    lines: [
      {
        id: "ruy-morphy",
        name: "Morphy Defence",
        eco: "C78",
        summary:
          "White builds the classical Spanish setup with Re1, c3 and h3, keeping the bishop on the a2-g8 diagonal.",
        tags: ["Main line", "Classical", "Positional"],
        moves: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3".split(
          " ",
        ),
      },
      {
        id: "ruy-berlin",
        name: "Berlin Defence",
        eco: "C67",
        summary:
          "Black trades into a queenless middlegame, while White uses the open position and bishop pair to press.",
        tags: ["Berlin", "Endgame", "Main line"],
        moves: "e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8".split(
          " ",
        ),
      },
    ],
  },
  {
    slug: "scotch",
    name: "Scotch Game",
    eco: "C44–C45",
    side: "white",
    intro:
      "Open the centre on move three with d4, recapture on d4 and use the active pieces to create an early initiative.",
    themes: ["Open centre", "d4 break", "Active pieces", "Classical"],
    lines: [
      {
        id: "scotch-classical",
        name: "Classical Scotch",
        eco: "C45",
        summary:
          "White develops the bishop to c4 and builds a compact centre while Black finds a safe square for the queen.",
        tags: ["Classical", "Open game", "Main line"],
        moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7 Bc4".split(" "),
      },
      {
        id: "scotch-mieses",
        name: "Mieses Variation",
        eco: "C45",
        summary:
          "After the knight trade White pushes e5 and gains space, asking Black to solve the queen and knight placement.",
        tags: ["Mieses", "Space", "Tactical"],
        moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4".split(
          " ",
        ),
      },
    ],
  },
  {
    slug: "vienna",
    name: "Vienna Game",
    eco: "C25–C29",
    side: "white",
    intro:
      "A flexible 1.e4 system with Nc3 first. White keeps the option of f4, Bc4 and a quick kingside attack.",
    themes: ["Nc3 first", "f4 attack", "Flexible centre", "Kingside play"],
    lines: [
      {
        id: "vienna-main",
        name: "Vienna Gambit",
        eco: "C29",
        summary:
          "White plays f4 and opens the f-file, accepting a pawn structure trade in return for rapid development.",
        tags: ["Gambit", "Kingside", "Main line"],
        moves: "e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4 O-O Bd3".split(" "),
      },
      {
        id: "vienna-copycat",
        name: "Copycat 2...Nc6",
        eco: "C25",
        summary:
          "When Black copies the knight move, White develops normally, castles and keeps a flexible central position.",
        tags: ["Copycat", "Classical", "Flexible"],
        moves: "e4 e5 Nc3 Nc6 Bc4 Nf6 d3 Bc5 Nf3 d6 O-O O-O".split(" "),
      },
    ],
  },
  {
    slug: "kings-gambit",
    name: "King's Gambit",
    eco: "C30–C39",
    side: "white",
    intro:
      "The oldest romantic attacking opening: offer the f-pawn, open the f-file and play for rapid piece activity against the king.",
    themes: ["f-pawn sacrifice", "Open f-file", "Attacking chess", "Romantic"],
    lines: [
      {
        id: "kings-gambit-kieseritzky",
        name: "Kieseritzky Gambit",
        eco: "C39",
        summary:
          "White gives up the f-pawn and builds a strong knight outpost on e5 while Black holds the extra pawn.",
        tags: ["Gambit", "Main line", "Attacking"],
        moves: "e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5 Nf6 d4 d6 Nd3".split(" "),
      },
      {
        id: "kings-gambit-bishop",
        name: "Bishop's Gambit",
        eco: "C33",
        summary:
          "White develops the bishop to c4 before recovering the pawn, accepting an awkward king position for active pieces.",
        tags: ["Bishop's gambit", "Tactical", "Open lines"],
        moves: "e4 e5 f4 exf4 Bc4 Qh4+ Kf1 d6 Nf3 Qe7 d3".split(" "),
      },
    ],
  },
  {
    slug: "london",
    name: "London System",
    eco: "D02",
    side: "white",
    intro:
      "A low-theory d4 setup: Bf4, e3, c3 and Nf3 give White a solid centre and a clear plan against most defences.",
    themes: ["Bf4 setup", "Solid centre", "e3-c3 wall", "Low theory"],
    lines: [
      {
        id: "london-main",
        name: "London main line",
        eco: "D02",
        summary:
          "White builds the standard London wall and develops the bishop to g3 where it stays active.",
        tags: ["Main line", "Solid", "Positional"],
        moves: "d4 d5 Bf4 Nf6 e3 c5 c3 Nc6 Nd2 e6 Ngf3 Bd6 Bg3".split(" "),
      },
      {
        id: "london-vs-kid",
        name: "London vs King's Indian",
        eco: "D02",
        summary:
          "Against a kingside fianchetto White keeps the bishop on f4 and prepares a safe e4 or c4 break.",
        tags: ["King's Indian", "Fianchetto", "Flexible"],
        moves: "d4 Nf6 Bf4 g6 e3 Bg7 h3 d6 Nf3 O-O Be2".split(" "),
      },
    ],
  },
  {
    slug: "jobava-london",
    name: "Jobava London",
    eco: "D00",
    side: "white",
    intro:
      "The aggressive London cousin: Nc3 and Bf4 come first, with quick e4 or Nb5 ideas and less concern for a quiet build-up.",
    themes: ["Nc3-Bf4", "Quick attack", "Nb5 ideas", "Active bishop"],
    lines: [
      {
        id: "jobava-main",
        name: "Jobava main line",
        eco: "D00",
        summary:
          "White develops the knight before the bishop and keeps both central pawn breaks available.",
        tags: ["Main line", "Aggressive", "Flexible"],
        moves: "d4 d5 Nc3 Nf6 Bf4 a6 e3 e6 Nf3 c5 Ne5".split(" "),
      },
      {
        id: "jobava-g6",
        name: "Jobava vs ...g6",
        eco: "D00",
        summary:
          "Black fianchettoes, so White grabs kingside space with h4 and keeps the bishop active on f4.",
        tags: ["Fianchetto", "Kingside space", "Aggressive"],
        moves: "d4 Nf6 Nc3 d5 Bf4 g6 e3 Bg7 h4 c5 Nf3".split(" "),
      },
    ],
  },
  {
    slug: "bishops-opening",
    name: "Bishop's Opening",
    eco: "C23–C24",
    side: "white",
    intro:
      "A direct 2.Bc4 system. White aims at f7, keeps the centre flexible and can switch to a gambit or a quiet d3 setup.",
    themes: ["Bc4 pressure", "f7 target", "d3 setup", "Urusov Gambit"],
    lines: [
      {
        id: "bishops-main",
        name: "Bishop's Opening main line",
        eco: "C23",
        summary:
          "White develops with d3 and Nf3, keeping the bishop on the a2-g8 diagonal and preparing a slow build.",
        tags: ["Main line", "Positional", "Flexible"],
        moves: "e4 e5 Bc4 Nf6 d3 Nc6 Nf3 Bc5 c3 d6 O-O".split(" "),
      },
      {
        id: "bishops-urusov",
        name: "Urusov Gambit",
        eco: "C24",
        summary:
          "White offers a pawn with d4 and gets rapid piece play against the exposed black king.",
        tags: ["Gambit", "Tactical", "Open game"],
        moves: "e4 e5 Bc4 Nf6 d4 exd4 Nf3 Nxe4 Qxd4 Nf6 Bg5 Be7 Nc3".split(
          " ",
        ),
      },
    ],
  },
  {
    slug: "ponziani",
    name: "Ponziani Opening",
    eco: "C44",
    side: "white",
    intro:
      "A compact 3.c3 system: White prepares d4, builds a big centre and keeps the pieces active without long theory.",
    themes: ["c3 setup", "d4 break", "Central space", "Tactical sidelines"],
    lines: [
      {
        id: "ponziani-main",
        name: "Ponziani main line",
        eco: "C44",
        summary:
          "White builds the d4 centre and uses the open lines to challenge Black's knight on e4.",
        tags: ["Main line", "Central play", "Tactical"],
        moves: "e4 e5 Nf3 Nc6 c3 Nf6 d4 Nxe4 d5 Ne7 Nxe5".split(" "),
      },
      {
        id: "ponziani-jaenisch",
        name: "Jaenisch Counterattack",
        eco: "C44",
        summary:
          "Black hits back with ...d5, so White develops the queen to a4 and keeps the initiative on the queenside.",
        tags: ["Counterattack", "Queen pressure", "Open lines"],
        moves: "e4 e5 Nf3 Nc6 c3 d5 Qa4 dxe4 Nxe5 Bd7 Nxd7 Qxd7".split(
          " ",
        ),
      },
    ],
  },
  {
    slug: "queens-gambit",
    name: "Queen's Gambit",
    eco: "D06–D69",
    side: "white",
    intro:
      "The classical d4 repertoire: offer the c-pawn, build the centre and use the bishop pair or e4 break to press.",
    themes: ["d4 centre", "c4 lever", "Orthodox", "Exchange structure"],
    lines: [
      {
        id: "qg-orthodox",
        name: "Orthodox Defence",
        eco: "D35",
        summary:
          "White develops the bishop to g5, supports the centre with e3 and keeps the c-file pressure available.",
        tags: ["Main line", "Orthodox", "Positional"],
        moves: "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4".split(" "),
      },
      {
        id: "qg-exchange",
        name: "Exchange Variation",
        eco: "D35",
        summary:
          "The central pawns come off early. White uses the open files and active bishop to play a simple structure.",
        tags: ["Exchange", "Simple", "Active pieces"],
        moves: "d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 c6".split(" "),
      },
    ],
  },
  {
    slug: "queens-gambit-accepted",
    name: "Queen's Gambit Accepted",
    eco: "D20–D29",
    side: "white",
    intro:
      "Black takes the c-pawn, and White uses the open centre to recover it with Bxc4, then aims for e4 or a queenside squeeze.",
    themes: ["Recover c4", "Open centre", "e4 break", "Active bishops"],
    lines: [
      {
        id: "qga-main",
        name: "QGA main line",
        eco: "D27",
        summary:
          "White recovers the pawn, castles and uses the d4-e4 space to keep the initiative.",
        tags: ["Main line", "Positional", "Central play"],
        moves: "d4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 dxc5".split(" "),
      },
      {
        id: "qga-e4",
        name: "QGA with e4",
        eco: "D20",
        summary:
          "White strikes in the centre at once, accepting a looser structure for fast piece activity.",
        tags: ["e4 break", "Aggressive", "Open game"],
        moves: "d4 d5 c4 dxc4 e4 e5 Nf3 exd4 Bxc4 Bb4+ Nbd2 Nc6".split(
          " ",
        ),
      },
    ],
  },
  {
    slug: "caro-kann",
    name: "Caro-Kann Defence",
    eco: "B10–B19",
    side: "black",
    intro:
      "A solid answer to 1.e4. Build the ...c6/...d5 wall, develop the light bishop and challenge the centre before White attacks.",
    themes: ["Solid centre", "Bf5 bishop", "Advance", "Classical"],
    lines: [
      {
        id: "caro-advance",
        name: "Advance Variation",
        eco: "B12",
        summary:
          "White grabs space with e5, so Black develops the bishop to f5 and hits the pawn chain with ...c5.",
        tags: ["Advance", "Pawn chain", "Main line"],
        moves: "e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 O-O Nc6".split(" "),
      },
      {
        id: "caro-classical",
        name: "Classical Variation",
        eco: "B18",
        summary:
          "The knight comes to e4 and Black develops the bishop outside the pawn chain before completing the kingside.",
        tags: ["Classical", "Bishop outside", "Main line"],
        moves: "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6".split(" "),
      },
    ],
  },
  {
    slug: "french",
    name: "French Defence",
    eco: "C00–C19",
    side: "black",
    intro:
      "A counterattacking answer to 1.e4: build the ...e6/...d5 wall and hit the centre with ...c5 before White attacks.",
    themes: ["e6-d5 wall", "...c5 break", "Winawer", "Counterattack"],
    lines: [
      {
        id: "french-winawer",
        name: "Winawer Variation",
        eco: "C18",
        summary:
          "Black pins the knight with Bb4, gives up the bishop pair and attacks the weakened White centre.",
        tags: ["Winawer", "Sharp", "Main line"],
        moves: "e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7".split(" "),
      },
      {
        id: "french-classical",
        name: "Classical French",
        eco: "C11",
        summary:
          "Black develops the knight to f6 and strikes with ...c5 while White builds a space advantage.",
        tags: ["Classical", "Solid", "Pawn chain"],
        moves: "e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6".split(" "),
      },
    ],
  },
  {
    slug: "sicilian",
    name: "Sicilian Defence",
    eco: "B20–B99",
    side: "black",
    intro:
      "The sharpest answer to 1.e4. Trade the c-pawn for White's d-pawn, build counterplay on the c-file and fight for the initiative.",
    themes: ["c-pawn trade", "Counterplay", "Najdorf", "Dragon"],
    lines: [
      {
        id: "sicilian-najdorf",
        name: "Najdorf Variation",
        eco: "B90",
        summary:
          "Black controls b5 and prepares ...e5 or ...b5 while White develops on the kingside.",
        tags: ["Najdorf", "Main line", "Sharp"],
        moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5".split(" "),
      },
      {
        id: "sicilian-dragon",
        name: "Dragon Variation",
        eco: "B70",
        summary:
          "Black fianchettoes the bishop to g7 and aims the long diagonal at White's queenside.",
        tags: ["Dragon", "Fianchetto", "Attacking"],
        moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O".split(
          " ",
        ),
      },
    ],
  },
  {
    slug: "scandinavian",
    name: "Scandinavian Defence",
    eco: "B01",
    side: "black",
    intro:
      "Challenge 1.e4 immediately with 1...d5. Trade the central pawn, find a safe queen square and develop with a clear plan.",
    themes: ["1...d5", "Queen placement", "Simple development", "Central trade"],
    lines: [
      {
        id: "scandi-qa5",
        name: "Queen to a5",
        eco: "B01",
        summary:
          "The queen stays active on a5, eyes e5 and supports a later ...c6 and ...Nf6 setup.",
        tags: ["Qa5", "Main line", "Active queen"],
        moves: "e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5".split(" "),
      },
      {
        id: "scandi-qd8",
        name: "Queen to d8",
        eco: "B01",
        summary:
          "Black retreats the queen and develops the bishop actively, accepting a slightly passive but solid position.",
        tags: ["Qd8", "Solid", "Bishop development"],
        moves: "e4 d5 exd5 Qxd5 Nc3 Qd8 d4 Nf6 Nf3 Bg4 Be2 e6".split(" "),
      },
    ],
  },
  {
    slug: "pirc",
    name: "Pirc Defence",
    eco: "B07–B09",
    side: "black",
    intro:
      "A hypermodern answer to 1.e4: let White build the centre, fianchetto the bishop and hit back with ...c5 or ...e5.",
    themes: ["Hypermodern", "Fianchetto", "...c5 break", "Counterplay"],
    lines: [
      {
        id: "pirc-classical",
        name: "Classical Pirc",
        eco: "B08",
        summary:
          "White builds a broad centre, while Black develops behind it and waits for the right moment to strike.",
        tags: ["Classical", "Main line", "Solid"],
        moves: "e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6".split(" "),
      },
      {
        id: "pirc-austrian",
        name: "Austrian Attack",
        eco: "B09",
        summary:
          "White pushes f4 for a direct attack. Black answers with ...c5 and targets the extended centre.",
        tags: ["Austrian", "Sharp", "Counterattack"],
        moves: "e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 c5 dxc5 Qa5".split(" "),
      },
    ],
  },
  {
    slug: "kings-indian",
    name: "King's Indian Defence",
    eco: "E60–E99",
    side: "black",
    intro:
      "A fighting answer to 1.d4: concede space, fianchetto the bishop and attack the centre with ...e5 or ...c5.",
    themes: ["Fianchetto", "Space concession", "...e5 break", "Kingside attack"],
    lines: [
      {
        id: "kid-classical",
        name: "Classical King's Indian",
        eco: "E92",
        summary:
          "Black completes the kingside setup and challenges the centre with ...e5 before White finishes developing.",
        tags: ["Classical", "Main line", "Central break"],
        moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O".split(" "),
      },
      {
        id: "kid-samisch",
        name: "Sämisch Variation",
        eco: "E80",
        summary:
          "White plays f3 for a big centre. Black develops quickly and aims at the dark squares around it.",
        tags: ["Sämisch", "Sharp", "Dark squares"],
        moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 e5".split(" "),
      },
    ],
  },
  {
    slug: "dutch",
    name: "Dutch Defence",
    eco: "A80–A99",
    side: "black",
    intro:
      "A fighting reply to 1.d4. Take kingside space with ...f5, fianchetto or build a stonewall and play for the initiative.",
    themes: ["...f5", "Kingside space", "Leningrad", "Staunton Gambit"],
    lines: [
      {
        id: "dutch-leningrad",
        name: "Leningrad Dutch",
        eco: "A87",
        summary:
          "Black combines ...f5 with a kingside fianchetto, aiming at e4 and the long diagonal.",
        tags: ["Leningrad", "Fianchetto", "Main line"],
        moves: "d4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6".split(" "),
      },
      {
        id: "dutch-classical",
        name: "Classical Dutch",
        eco: "A84",
        summary:
          "Black supports ...f5 with ...e6 and ...d5, building a solid central wall before choosing a plan.",
        tags: ["Classical", "Solid", "Stonewall"],
        moves: "d4 f5 c4 Nf6 Nc3 e6 Nf3 d5 Bg5 Be7 e3 O-O".split(" "),
      },
    ],
  },
  {
    slug: "slav",
    name: "Slav Defence",
    eco: "D10–D19",
    side: "black",
    intro:
      "A reliable answer to the Queen's Gambit: support ...d5 with ...c6, develop the light bishop and keep the centre solid.",
    themes: ["...c6 support", "Bf5 bishop", "Solid d5", "Meran ideas"],
    lines: [
      {
        id: "slav-main",
        name: "Slav main line",
        eco: "D17",
        summary:
          "Black develops the bishop before ...e6, then chooses between holding the centre and expanding on the queenside.",
        tags: ["Main line", "Bf5", "Solid"],
        moves: "d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6".split(" "),
      },
      {
        id: "slav-exchange",
        name: "Exchange Slav",
        eco: "D13",
        summary:
          "The central pawns trade early. Black develops the bishop to f5 and aims for a comfortable, balanced game.",
        tags: ["Exchange", "Balanced", "Simple"],
        moves: "d4 d5 c4 c6 cxd5 cxd5 Nc3 Nf6 Bf4 Nc6 e3 Bf5".split(" "),
      },
    ],
  },
  {
    slug: "anti-london",
    name: "Anti-London",
    eco: "D02",
    side: "black",
    intro:
      "Meet the London System with active play: hit the centre with ...c5 and ...Qb6, and hunt the f4-bishop when White is slow.",
    themes: ["...c5", "Qb6 pressure", "Nh5 hunt", "Active defence"],
    lines: [
      {
        id: "anti-london-c5",
        name: "Anti-London with ...c5",
        eco: "D02",
        summary:
          "Black strikes at d4 at once and uses the queen on b6 to pressure the queenside.",
        tags: ["Main line", "Active", "Queenside pressure"],
        moves: "d4 d5 Bf4 c5 e3 Nc6 c3 Qb6 Nf3 cxd4 cxd4 Nf6".split(" "),
      },
      {
        id: "anti-london-nh5",
        name: "Anti-London with ...Nh5",
        eco: "D02",
        summary:
          "Black develops the knight to h5 to challenge the f4-bishop and gains space on the kingside.",
        tags: ["Nh5", "Bishop hunt", "Kingside"],
        moves: "d4 d5 Bf4 Nf6 e3 c5 c3 Nc6 Nf3 Nh5 Bd3 cxd4 exd4".split(" "),
      },
    ],
  },
  {
    slug: "petrov",
    name: "Petrov Defence",
    eco: "C42–C43",
    side: "black",
    intro:
      "A symmetrical answer to 1.e4: counterattack the e5-pawn, trade actively and avoid a passive defence.",
    themes: ["Symmetric play", "Nxe5", "Active pieces", "Queen trade"],
    lines: [
      {
        id: "petrov-classical",
        name: "Classical Petrov",
        eco: "C42",
        summary:
          "Black restores material and develops with a compact setup, inviting White to commit the centre first.",
        tags: ["Classical", "Main line", "Symmetric"],
        moves: "e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Be7".split(" "),
      },
      {
        id: "petrov-nimzowitsch",
        name: "Nimzowitsch Attack",
        eco: "C42",
        summary:
          "White avoids the main lines with Nc3, so Black develops the bishop and centralises the knight.",
        tags: ["Nimzowitsch", "Sideline", "Active pieces"],
        moves: "e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 Nc3 Nxc3 dxc3 Be7".split(
          " ",
        ),
      },
    ],
  },
  {
    slug: "nimzo-indian",
    name: "Nimzo-Indian Defence",
    eco: "E20–E59",
    side: "black",
    intro:
      "A flexible answer to 1.d4: pin the c3-knight with Bb4, fight for e4 and choose between a central clamp and a queenside squeeze.",
    themes: ["Bb4 pin", "e4 control", "Rubinstein", "Flexible structure"],
    lines: [
      {
        id: "nimzo-classical",
        name: "Classical Nimzo-Indian",
        eco: "E32",
        summary:
          "Black develops the bishop to b4, castles and meets the central pawns with ...d5 and ...c5.",
        tags: ["Classical", "Main line", "Central play"],
        moves: "d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O".split(" "),
      },
      {
        id: "nimzo-qc2",
        name: "4.Qc2 Variation",
        eco: "E39",
        summary:
          "White avoids the doubled pawns with Qc2, so Black develops the bishop pair and targets the centre.",
        tags: ["Qc2", "Bishop pair", "Main line"],
        moves: "d4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 b6 Bg5 Bb7".split(
          " ",
        ),
      },
    ],
  },
  {
    slug: "catalan",
    name: "Catalan Opening",
    eco: "E00–E09",
    side: "white",
    intro:
      "A d4 repertoire with a kingside fianchetto: Bg2 controls the long diagonal while White recovers the c4-pawn and squeezes.",
    themes: ["Bg2", "Queenside pressure", "Open Catalan", "Closed Catalan"],
    lines: [
      {
        id: "catalan-open",
        name: "Open Catalan",
        eco: "E04",
        summary:
          "Black takes on c4, so White recovers with the queen and builds pressure on the queenside files.",
        tags: ["Open Catalan", "Main line", "Pressure"],
        moves: "d4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6 Qxc4 b5".split(
          " ",
        ),
      },
      {
        id: "catalan-closed",
        name: "Closed Catalan",
        eco: "E06",
        summary:
          "Black keeps the centre closed, so White develops the bishop to f4 and prepares a slow squeeze.",
        tags: ["Closed Catalan", "Positional", "Main line"],
        moves: "d4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7 Qc2 c6 Bf4 b6".split(
          " ",
        ),
      },
    ],
  },
  {
    slug: "fried-liver",
    name: "Fried Liver Attack",
    eco: "C57",
    side: "white",
    intro:
      "A direct Two Knights weapon: sacrifice on f7, drag the king into the open and use the queen and knights to attack.",
    themes: ["Nxf7 sacrifice", "Open king", "Two Knights", "Tactical"],
    lines: [
      {
        id: "fried-liver-main",
        name: "Fried Liver main line",
        eco: "C57",
        summary:
          "White gives up the knight on f7 and uses the queen check to keep the king exposed in the centre.",
        tags: ["Main line", "Sacrifice", "Attack"],
        moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3".split(
          " ",
        ),
      },
      {
        id: "fried-liver-lolli",
        name: "Lolli Attack",
        eco: "C57",
        summary:
          "A sounder alternative: White keeps the knight and builds a strong centre before choosing the attack.",
        tags: ["Lolli", "Positional", "Two Knights"],
        moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3".split(
          " ",
        ),
      },
    ],
  },
  {
    slug: "kings-indian-attack",
    name: "King's Indian Attack",
    eco: "A07–A08",
    side: "white",
    intro:
      "A universal setup with g3, Bg2, d3 and e4. White builds the same kingside attack against several black systems.",
    themes: ["Universal setup", "g3 fianchetto", "e5 break", "Kingside attack"],
    lines: [
      {
        id: "kia-french",
        name: "KIA vs French",
        eco: "A07",
        summary:
          "White avoids the French pawn chains and builds the standard KIA setup with Nd2, Ngf3 and Bg2.",
        tags: ["French", "Main line", "Universal"],
        moves: "e4 e6 d3 d5 Nd2 Nf6 Ngf3 c5 g3 Nc6 Bg2".split(" "),
      },
      {
        id: "kia-sicilian",
        name: "KIA vs Sicilian",
        eco: "A07",
        summary:
          "White keeps the centre closed, develops the bishop to g2 and prepares e5 or c4 depending on Black's setup.",
        tags: ["Sicilian", "Closed centre", "Flexible"],
        moves: "e4 c5 Nf3 e6 d3 Nc6 g3 g6 Bg2 Bg7 O-O".split(" "),
      },
    ],
  },
  {
    slug: "open-game",
    name: "Open Game",
    eco: "C20–C99",
    side: "black",
    intro:
      "A classical 1...e5 repertoire for Black: contest the centre from move one and meet the main White setups with active development.",
    themes: ["1...e5", "Classical", "Active pieces", "Central fight"],
    lines: [
      {
        id: "open-italian",
        name: "Open Game: Italian",
        eco: "C50",
        summary:
          "Black develops the bishop to c5, castles quickly and keeps the centre flexible with ...d6 or ...Nf6.",
        tags: ["Italian", "Classical", "Main line"],
        moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O".split(" "),
      },
      {
        id: "open-scotch",
        name: "Open Game: Scotch",
        eco: "C45",
        summary:
          "After the central trade Black develops the bishop actively and challenges the White knight on d4.",
        tags: ["Scotch", "Tactical", "Active bishop"],
        moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7".split(" "),
      },
    ],
  },
  {
    slug: "vienna-gambit",
    name: "Vienna Gambit",
    eco: "C29",
    side: "white",
    intro:
      "A sharp Vienna branch with an early f4. White opens the f-file and plays for a direct attack before Black finishes development.",
    themes: ["f4", "Open f-file", "Kingside attack", "Gambit"],
    lines: [
      {
        id: "vienna-gambit-main",
        name: "Vienna Gambit main line",
        eco: "C29",
        summary:
          "White offers the f-pawn, regains the e5-pawn and uses the open lines to attack the black king.",
        tags: ["Main line", "Gambit", "Attack"],
        moves: "e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4 O-O".split(" "),
      },
      {
        id: "vienna-gambit-qf3",
        name: "Vienna Gambit: Qf3",
        eco: "C29",
        summary:
          "White develops the queen to f3, adding pressure to f7 and keeping the black king in the centre.",
        tags: ["Queen attack", "Tactical", "Kingside"],
        moves: "e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nc6 Bb5".split(" "),
      },
    ],
  },
  {
    slug: "white-vs-caro-kann",
    name: "White vs Caro-Kann",
    eco: "B10–B19",
    side: "white",
    intro:
      "A White repertoire against the Caro-Kann: grab space with the Advance, use the h4 bayonet and keep the option of a simple Exchange structure.",
    themes: ["Advance", "h4 bayonet", "Exchange", "Space"],
    lines: [
      {
        id: "white-caro-advance",
        name: "Advance with h4",
        eco: "B12",
        summary:
          "White builds the e5 pawn chain and uses h4-h5 to gain kingside space against the Caro bishop.",
        tags: ["Advance", "Bayonet", "Aggressive"],
        moves: "e4 c6 d4 d5 e5 Bf5 h4 h5 c4 e6 Nc3".split(" "),
      },
      {
        id: "white-caro-exchange",
        name: "Exchange Variation",
        eco: "B13",
        summary:
          "White trades on d5, develops the bishop to f4 and plays a simple structure with a queenside majority.",
        tags: ["Exchange", "Simple", "Positional"],
        moves: "e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4".split(" "),
      },
    ],
  },
  {
    slug: "englund-gambit",
    name: "Englund Gambit",
    eco: "A40",
    side: "black",
    intro:
      "A provocative answer to 1.d4: give up the e5-pawn, develop quickly and aim for the queen checks and tactical tricks that punish careless development.",
    themes: ["1...e5", "Queen check", "Open lines", "Tactical"],
    lines: [],
  },
];

const manualExtraLines: Record<string, LineSeed[]> = {
  italian: [
    {
      id: "italian-evans",
      name: "Evans Gambit",
      eco: "C52",
      summary:
        "White offers the b-pawn to open the centre and build a rapid attack against the black king.",
      tags: ["Evans Gambit", "Attack", "Open centre"],
      moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O".split(" "),
    },
    {
      id: "italian-four-knights",
      name: "Four Knights Italian",
      eco: "C50",
      summary:
        "Both sides develop naturally. White keeps the centre flexible and castles before choosing a break.",
      tags: ["Four Knights", "Classical", "Flexible"],
      moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Bc5 c3 d6 O-O O-O".split(" "),
    },
    {
      id: "italian-centre",
      name: "Italian: early d4",
      eco: "C54",
      summary:
        "White strikes with d4 before Black is fully developed, accepting an isolated pawn for active pieces.",
      tags: ["d4 break", "Active pieces", "Tactical"],
      moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+".split(" "),
    },
  ],
  "ruy-lopez": [
    {
      id: "ruy-exchange",
      name: "Exchange Variation",
      eco: "C68",
      summary:
        "White trades on c6 and plays against the doubled pawns, using the open files and a healthy kingside majority.",
      tags: ["Exchange", "Structure", "Positional"],
      moves: "e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1 Rxd1".split(
        " ",
      ),
    },
    {
      id: "ruy-closed",
      name: "Closed Ruy Lopez",
      eco: "C84",
      summary:
        "White keeps the tension, retreats the bishop to b3 and builds the c3-d4 centre before opening the position.",
      tags: ["Closed", "Main line", "Long pressure"],
      moves: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5".split(
        " ",
      ),
    },
    {
      id: "ruy-schliemann",
      name: "Schliemann Defence",
      eco: "C63",
      summary:
        "Black counters with an early ...f5. White accepts the sharp pawn play and targets the weakened e5-square.",
      tags: ["Schliemann", "Sharp", "Counterattack"],
      moves: "e4 e5 Nf3 Nc6 Bb5 f5 Nc3 fxe4 Nxe4 d5 Nxe5 dxe4 Nxc6 Qd5".split(
        " ",
      ),
    },
  ],
  scotch: [
    {
      id: "scotch-schmidt",
      name: "Schmidt Variation",
      eco: "C45",
      summary:
        "Black trades knights and develops the queen, while White uses the bishop pair and central space.",
      tags: ["Schmidt", "Queen trade", "Positional"],
      moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nxd4 Qxd4 d6 Nc3 Nf6 Bg5 Be7 O-O-O".split(
        " ",
      ),
    },
    {
      id: "scotch-four-knights",
      name: "Four Knights Scotch",
      eco: "C47",
      summary:
        "Black checks on b4, so White develops the bishop and opens lines before the position settles.",
      tags: ["Four Knights", "Check", "Open game"],
      moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bb4+ c3 Be7 Nxc6 bxc6 Bd3".split(" "),
    },
    {
      id: "scotch-goering",
      name: "Göring Variation",
      eco: "C45",
      summary:
        "White pushes e5 to gain space and uses the queen on e2 to support the advanced pawn.",
      tags: ["Göring", "Space", "Active queen"],
      moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4 Ba6".split(
        " ",
      ),
    },
  ],
  vienna: [
    {
      id: "vienna-bc4",
      name: "Vienna: 3.Bc4",
      eco: "C26",
      summary:
        "White develops the bishop before committing the f-pawn and keeps the queen ready for a kingside attack.",
      tags: ["Bc4", "Flexible", "Kingside"],
      moves: "e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Be7 Nf3 Nc6".split(" "),
    },
    {
      id: "vienna-f4",
      name: "Vienna: 3.f4",
      eco: "C25",
      summary:
        "White opens the f-file at once and accepts a sharp pawn structure to attack the black king.",
      tags: ["f4", "Gambit", "Attack"],
      moves: "e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5 h4 g4 Ng5 h6".split(" "),
    },
    {
      id: "vienna-g3",
      name: "Vienna: 3.g3",
      eco: "C25",
      summary:
        "A quieter Vienna where White fianchettoes the bishop and keeps the central tension flexible.",
      tags: ["g3", "Positional", "Flexible"],
      moves: "e4 e5 Nc3 Nf6 g3 d5 exd5 Nxd5 Bg2 Nb6 Nf3 Nc6".split(" "),
    },
  ],
  "kings-gambit": [
    {
      id: "kings-gambit-muzio",
      name: "Muzio Gambit",
      eco: "C37",
      summary:
        "White sacrifices the knight on f3 for a rapid attack down the f-file and open lines against the king.",
      tags: ["Muzio", "Sacrifice", "Attack"],
      moves: "e4 e5 f4 exf4 Nf3 g5 Bc4 g4 O-O gxf3 Qxf3 Qf6 e5 Qxe5".split(
        " ",
      ),
    },
    {
      id: "kings-gambit-modern",
      name: "Modern Defence",
      eco: "C36",
      summary:
        "Black returns the pawn with ...d5, and White uses the open centre to develop quickly.",
      tags: ["Modern", "Open centre", "Development"],
      moves: "e4 e5 f4 exf4 Nf3 d5 exd5 Nf6 Bb5+ c6 dxc6 bxc6 Bc4".split(" "),
    },
    {
      id: "kings-gambit-fischer",
      name: "Fischer Defence",
      eco: "C34",
      summary:
        "Black plays ...d6 first, so White grabs space with d4 and h4 before the kingside locks.",
      tags: ["Fischer", "Space", "Kingside"],
      moves: "e4 e5 f4 exf4 Nf3 d6 d4 g5 h4 g4 Ng5 h6".split(" "),
    },
  ],
  london: [
    {
      id: "london-vs-c5",
      name: "London vs ...c5",
      eco: "D02",
      summary:
        "Black hits d4 immediately. White supports the centre with c3 and keeps the bishop active on f4.",
      tags: ["...c5", "Solid", "Main line"],
      moves: "d4 d5 Bf4 c5 e3 Nc6 Nf3 Qb6 c3 Nf6 Qc2 cxd4".split(" "),
    },
    {
      id: "london-vs-e6",
      name: "London vs ...e6",
      eco: "D02",
      summary:
        "White develops the bishop to g3 and prepares a safe kingside setup against the classical wall.",
      tags: ["...e6", "Classical", "Positional"],
      moves: "d4 d5 Bf4 e6 e3 Nf6 Nf3 Bd6 Bg3 O-O Bd3 Re8".split(" "),
    },
    {
      id: "london-vs-g6",
      name: "London vs ...g6",
      eco: "D02",
      summary:
        "Black fianchettoes the bishop, so White keeps the centre compact and develops before choosing a break.",
      tags: ["...g6", "Fianchetto", "Flexible"],
      moves: "d4 Nf6 Bf4 g6 e3 Bg7 Nf3 O-O Be2 d6 O-O Nbd7".split(" "),
    },
  ],
  "jobava-london": [
    {
      id: "jobava-vs-c5",
      name: "Jobava vs ...c5",
      eco: "D00",
      summary:
        "White takes on d4 with the queen and uses the active queen to keep Black from equalising comfortably.",
      tags: ["...c5", "Active queen", "Aggressive"],
      moves: "d4 c5 Nc3 cxd4 Qxd4 Nc6 Qh4 d6 e4 Nf6 Nf3 e5".split(" "),
    },
    {
      id: "jobava-vs-e6",
      name: "Jobava vs ...e6",
      eco: "D00",
      summary:
        "White develops the bishop to f4 and builds a compact centre before the position opens.",
      tags: ["...e6", "Compact centre", "Main line"],
      moves: "d4 d5 Nc3 e6 Bf4 Nf6 e3 Bd6 Bg3 O-O Bd3 c5".split(" "),
    },
    {
      id: "jobava-vs-nf6",
      name: "Jobava vs ...Nf6",
      eco: "D00",
      summary:
        "Black develops the knight first, so White keeps the bishop active and prepares a central break.",
      tags: ["...Nf6", "Flexible", "Central play"],
      moves: "d4 Nf6 Nc3 d5 Bf4 a6 e3 e6 Nf3 c5 Be2 Nc6".split(" "),
    },
  ],
  "bishops-opening": [
    {
      id: "bishops-vs-nc6",
      name: "Bishop's Opening vs ...Nc6",
      eco: "C23",
      summary:
        "White develops the knight and builds the d4 centre while the bishop controls the a2-g8 diagonal.",
      tags: ["...Nc6", "d4 break", "Classical"],
      moves: "e4 e5 Bc4 Nc6 Nf3 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+".split(" "),
    },
    {
      id: "bishops-vs-nc3",
      name: "Bishop's Opening: 3.Nc3",
      eco: "C23",
      summary:
        "White develops both minor pieces before choosing between a quiet d3 setup and an early f4.",
      tags: ["Nc3", "Flexible", "Development"],
      moves: "e4 e5 Bc4 Nf6 Nc3 Nc6 d3 Bc5 Nf3 d6 Be3 O-O".split(" "),
    },
    {
      id: "bishops-vs-bc5",
      name: "Bishop's Opening vs ...Bc5",
      eco: "C23",
      summary:
        "The bishops face each other on the diagonal. White builds a slow centre and castles before opening lines.",
      tags: ["...Bc5", "Positional", "Slow build"],
      moves: "e4 e5 Bc4 Bc5 Nf3 d6 d3 Nf6 c3 O-O O-O Nc6".split(" "),
    },
  ],
  ponziani: [
    {
      id: "ponziani-exd4",
      name: "Ponziani vs ...exd4",
      eco: "C44",
      summary:
        "White recaptures on d4 and accepts a check to keep the big centre and open lines.",
      tags: ["...exd4", "Open centre", "Tactical"],
      moves: "e4 e5 Nf3 Nc6 c3 Nf6 d4 exd4 e5 Nd5 cxd4 Bb4+".split(" "),
    },
    {
      id: "ponziani-bc5",
      name: "Ponziani vs ...Bc5",
      eco: "C44",
      summary:
        "Black develops the bishop actively, so White strikes with d4 and uses the central files.",
      tags: ["...Bc5", "d4 break", "Active pieces"],
      moves: "e4 e5 Nf3 Nc6 c3 Bc5 d4 exd4 cxd4 Bb4+ Nc3 Nf6".split(" "),
    },
    {
      id: "ponziani-ng6",
      name: "Ponziani: knight retreat",
      eco: "C44",
      summary:
        "After the knight tour, White keeps the e5-pawn and uses the space to develop calmly.",
      tags: ["Knight retreat", "Space", "Positional"],
      moves: "e4 e5 Nf3 Nc6 c3 Nf6 d4 Nxe4 d5 Ne7 Nxe5 Ng6".split(" "),
    },
  ],
  "queens-gambit": [
    {
      id: "qg-nbd7",
      name: "Orthodox with ...Nbd7",
      eco: "D37",
      summary:
        "White keeps the bishop on g5 and develops the knight before choosing whether to open the centre.",
      tags: ["Orthodox", "Nbd7", "Main line"],
      moves: "d4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 e3 Be7 Nf3 O-O".split(" "),
    },
    {
      id: "qg-tarrasch",
      name: "Tarrasch Defence",
      eco: "D32",
      summary:
        "Black accepts an isolated pawn for active pieces. White develops smoothly and targets the d5-square.",
      tags: ["Tarrasch", "Isolated pawn", "Positional"],
      moves: "d4 d5 c4 e6 Nc3 c5 cxd5 exd5 Nf3 Nc6 g3 Nf6".split(" "),
    },
    {
      id: "qg-chigorin",
      name: "Chigorin Defence",
      eco: "D07",
      summary:
        "Black develops the knight to c6 and the bishop to g4, while White takes on d5 and accepts doubled pawns.",
      tags: ["Chigorin", "Active pieces", "Structure"],
      moves: "d4 d5 c4 Nc6 Nf3 Bg4 cxd5 Bxf3 gxf3 Qxd5 e3 e5".split(" "),
    },
  ],
  "queens-gambit-accepted": [
    {
      id: "qga-a6",
      name: "QGA: 3...a6",
      eco: "D22",
      summary:
        "Black prepares ...b5 and ...e6. White recovers the pawn and castles before opening the centre.",
      tags: ["...a6", "Main line", "Positional"],
      moves: "d4 d5 c4 dxc4 Nf3 a6 e3 Nf6 Bxc4 e6 O-O c5".split(" "),
    },
    {
      id: "qga-nc6",
      name: "QGA: 3...Nc6",
      eco: "D20",
      summary:
        "Black develops the knight and keeps the c4-pawn under watch. White recovers it with the bishop.",
      tags: ["...Nc6", "Development", "Central play"],
      moves: "d4 d5 c4 dxc4 Nf3 Nc6 e3 e6 Bxc4 Nf6 O-O Be7".split(" "),
    },
    {
      id: "qga-nc3",
      name: "QGA: 3.Nc3",
      eco: "D20",
      summary:
        "White develops the knight first and keeps the option of an early e4 break against the extra pawn.",
      tags: ["3.Nc3", "e4 idea", "Flexible"],
      moves: "d4 d5 c4 dxc4 Nc3 Nf6 e3 e6 Bxc4 Be7 Nf3 O-O".split(" "),
    },
  ],
  "caro-kann": [
    {
      id: "caro-exchange",
      name: "Exchange Variation",
      eco: "B13",
      summary:
        "The central pawns trade early. Black develops the bishop actively and plays a simple structure.",
      tags: ["Exchange", "Simple", "Bishop development"],
      moves: "e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4".split(" "),
    },
    {
      id: "caro-panov",
      name: "Panov Attack",
      eco: "B13",
      summary:
        "White takes on d5 and builds a broad centre with c4, while Black develops and challenges it.",
      tags: ["Panov", "Central space", "Main line"],
      moves: "e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Be7".split(" "),
    },
    {
      id: "caro-two-knights",
      name: "Two Knights Variation",
      eco: "B10",
      summary:
        "White develops both knights and pushes e5, so Black finds a safe square for the f6-knight.",
      tags: ["Two Knights", "Space", "Flexible"],
      moves: "e4 c6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 e6 Nf3 c5".split(" "),
    },
  ],
  french: [
    {
      id: "french-advance",
      name: "Advance Variation",
      eco: "C02",
      summary:
        "White locks the centre with e5, so Black hits the pawn chain with ...c5 and ...Qb6.",
      tags: ["Advance", "Pawn chain", "Main line"],
      moves: "e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4".split(" "),
    },
    {
      id: "french-tarrasch",
      name: "Tarrasch Variation",
      eco: "C03",
      summary:
        "White supports e5 with the knight, while Black develops and attacks the head of the pawn chain.",
      tags: ["Tarrasch", "Pawn chain", "Active pieces"],
      moves: "e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6".split(" "),
    },
    {
      id: "french-exchange",
      name: "Exchange Variation",
      eco: "C01",
      summary:
        "The central pawns trade and the position becomes symmetrical. Black develops quickly and castles.",
      tags: ["Exchange", "Symmetrical", "Simple"],
      moves: "e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6 O-O O-O".split(" "),
    },
  ],
  sicilian: [
    {
      id: "sicilian-classical",
      name: "Classical Sicilian",
      eco: "B56",
      summary:
        "Black develops the knight to c6, plays ...d6 and fights for the d4-square before expanding.",
      tags: ["Classical", "Main line", "Flexible"],
      moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 d6 Be2 e5".split(" "),
    },
    {
      id: "sicilian-sveshnikov",
      name: "Sveshnikov Variation",
      eco: "B33",
      summary:
        "Black pushes e5 and accepts a hole on d5 in return for active piece play and the bishop pair.",
      tags: ["Sveshnikov", "Active pieces", "Sharp"],
      moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6".split(" "),
    },
    {
      id: "sicilian-accelerated",
      name: "Accelerated Dragon",
      eco: "B34",
      summary:
        "Black fianchettoes before ...d6, aiming the bishop at the centre and preparing ...d5.",
      tags: ["Accelerated Dragon", "Fianchetto", "Counterplay"],
      moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 Nc3 Bg7 Be3 Nf6".split(" "),
    },
  ],
  scandinavian: [
    {
      id: "scandi-nf6",
      name: "Scandinavian with ...Nf6",
      eco: "B01",
      summary:
        "Black avoids an early queen sortie and recaptures with the knight, aiming for a solid fianchetto setup.",
      tags: ["...Nf6", "Solid", "Fianchetto"],
      moves: "e4 d5 exd5 Nf6 d4 Nxd5 Nf3 g6 c4 Nb6 Nc3 Bg7".split(" "),
    },
    {
      id: "scandi-qd6",
      name: "Queen to d6",
      eco: "B01",
      summary:
        "The queen finds a safe central square and supports a later ...b5 or ...e5 expansion.",
      tags: ["Qd6", "Active queen", "Flexible"],
      moves: "e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6 g3 b5".split(" "),
    },
    {
      id: "scandi-bb5",
      name: "Scandinavian: 3.Bb5+",
      eco: "B01",
      summary:
        "White checks before developing, so Black blocks with the bishop and gains time on the queenside.",
      tags: ["Check", "Bishop development", "Queenside"],
      moves: "e4 d5 exd5 Nf6 Bb5+ Bd7 Bc4 b5 Bb3 a6 Nf3 Bg4".split(" "),
    },
  ],
  pirc: [
    {
      id: "pirc-150",
      name: "150 Attack",
      eco: "B07",
      summary:
        "White develops the bishop to e3 and the queen to d2, aiming for a direct kingside attack.",
      tags: ["150 Attack", "Kingside", "Sharp"],
      moves: "e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2 c6 f3 b5".split(" "),
    },
    {
      id: "pirc-e5",
      name: "Pirc with ...e5",
      eco: "B07",
      summary:
        "Black challenges the centre early. White develops calmly and castles before the position opens.",
      tags: ["...e5", "Central play", "Classical"],
      moves: "e4 d6 d4 Nf6 Nc3 e5 Nf3 Nbd7 Bc4 Be7 O-O O-O".split(" "),
    },
    {
      id: "pirc-byrne",
      name: "Byrne Variation",
      eco: "B07",
      summary:
        "White develops the bishop to e3 and the queen to d2, keeping the centre flexible against the fianchetto.",
      tags: ["Byrne", "Flexible", "Main line"],
      moves: "e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be3 O-O Qd2 Nc6".split(" "),
    },
  ],
  dutch: [
    {
      id: "dutch-staunton",
      name: "Staunton Gambit",
      eco: "A82",
      summary:
        "White pushes e4 against the Dutch and accepts a sharp position with open lines and active pieces.",
      tags: ["Staunton", "Gambit", "Sharp"],
      moves: "d4 f5 e4 fxe4 Nc3 Nf6 Bg5 e6 f3 Be7 Bxf6 Bxf6".split(" "),
    },
    {
      id: "dutch-stonewall",
      name: "Stonewall Dutch",
      eco: "A90",
      summary:
        "Black builds the stonewall with ...d5 and ...c6, aiming for a strong outpost on e4.",
      tags: ["Stonewall", "Solid", "Main line"],
      moves: "d4 f5 c4 Nf6 Nc3 e6 Nf3 d5 e3 c6 Bd3 Bd6".split(" "),
    },
    {
      id: "dutch-ilyin",
      name: "Ilyin-Zhenevsky System",
      eco: "A88",
      summary:
        "Black combines ...f5 with a kingside fianchetto and keeps the centre flexible before castling.",
      tags: ["Ilyin", "Fianchetto", "Flexible"],
      moves: "d4 f5 c4 Nf6 g3 e6 Bg2 Be7 Nf3 O-O O-O d6".split(" "),
    },
  ],
  slav: [
    {
      id: "slav-meran",
      name: "Meran Variation",
      eco: "D48",
      summary:
        "Black develops the queen's knight and expands on the queenside after taking on c4.",
      tags: ["Meran", "Queenside", "Main line"],
      moves: "d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4".split(" "),
    },
    {
      id: "slav-semi-slav",
      name: "Semi-Slav",
      eco: "D43",
      summary:
        "Black keeps the centre closed with ...e6 and ...c6, then develops the bishop and prepares ...dxc4.",
      tags: ["Semi-Slav", "Solid", "Flexible"],
      moves: "d4 d5 c4 c6 Nc3 Nf6 Nf3 e6 e3 Nbd7 Bd3 Bd6".split(" "),
    },
    {
      id: "slav-capture",
      name: "Slav: early ...dxc4",
      eco: "D15",
      summary:
        "Black takes on c4 and develops the bishop, while White recovers the pawn and builds the centre.",
      tags: ["Early capture", "Bishop development", "Positional"],
      moves: "d4 d5 c4 c6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4".split(" "),
    },
  ],
  "anti-london": [
    {
      id: "anti-london-qb6",
      name: "Anti-London: early ...Qb6",
      eco: "D02",
      summary:
        "Black develops the queen to b6 at once, pressuring d4 and the queenside before White castles.",
      tags: ["Qb6", "Queenside", "Active defence"],
      moves: "d4 d5 Bf4 Nf6 e3 c5 c3 Qb6 Nf3 Nc6 Bd3 c4".split(" "),
    },
    {
      id: "anti-london-nc6",
      name: "Anti-London: ...Nc6",
      eco: "D02",
      summary:
        "Black develops the knight and bishop actively, challenging the London centre with ...Bd6.",
      tags: ["...Nc6", "Active pieces", "Central play"],
      moves: "d4 d5 Bf4 Nc6 e3 Bf5 Nf3 e6 c4 Bd6 Bxd6 Qxd6".split(" "),
    },
    {
      id: "anti-london-e6",
      name: "Anti-London: ...e6",
      eco: "D02",
      summary:
        "Black builds a solid wall and delays committing the bishop until White shows the centre.",
      tags: ["...e6", "Solid", "Flexible"],
      moves: "d4 d5 Bf4 e6 e3 c5 Nf3 Nc6 c3 Nf6 Nbd2 Be7".split(" "),
    },
  ],
  petrov: [
    {
      id: "petrov-exchange",
      name: "Petrov Exchange",
      eco: "C42",
      summary:
        "Black restores material and develops the bishop, meeting White's central play with a solid wall.",
      tags: ["Exchange", "Solid", "Main line"],
      moves: "e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Bd6 O-O O-O".split(
        " ",
      ),
    },
    {
      id: "petrov-cochrane",
      name: "Cochrane Gambit",
      eco: "C42",
      summary:
        "Black grabs e4 and develops the bishop, accepting a sharp position with queens still on the board.",
      tags: ["Cochrane", "Sharp", "Active pieces"],
      moves: "e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 Bc4 Be7 Nc3 Nxc3".split(" "),
    },
    {
      id: "petrov-marshall",
      name: "Marshall Variation",
      eco: "C42",
      summary:
        "White avoids the main lines with an early queen move, so Black develops and challenges the centre.",
      tags: ["Marshall", "Sideline", "Solid"],
      moves: "e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 Qe2 Qe7 Nc3 Nxc3".split(" "),
    },
  ],
  "kings-indian": [
    {
      id: "kid-four-pawns",
      name: "Four Pawns Attack",
      eco: "E76",
      summary:
        "White builds the biggest possible centre. Black must strike before it becomes overwhelming.",
      tags: ["Four Pawns", "Space", "Sharp"],
      moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 c5".split(" "),
    },
    {
      id: "kid-averbakh",
      name: "Averbakh System",
      eco: "E73",
      summary:
        "White develops the bishop to e2 and g5, while Black prepares a central strike with ...c5 or ...e5.",
      tags: ["Averbakh", "Bishop pair", "Main line"],
      moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Be2 O-O Bg5 c5".split(" "),
    },
    {
      id: "kid-fianchetto",
      name: "Fianchetto Variation",
      eco: "E60",
      summary:
        "White mirrors the kingside fianchetto and fights for the long diagonal before Black can close the centre.",
      tags: ["Fianchetto", "Long diagonal", "Positional"],
      moves: "d4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7".split(" "),
    },
  ],
  "nimzo-indian": [
    {
      id: "nimzo-samisch",
      name: "Sämisch Variation",
      eco: "E24",
      summary:
        "White builds a big centre with f3 and e4, so Black trades the bishop and attacks the dark squares.",
      tags: ["Sämisch", "Dark squares", "Sharp"],
      moves: "d4 Nf6 c4 e6 Nc3 Bb4 e3 c5 a3 Bxc3+ bxc3 Ne4".split(" "),
    },
    {
      id: "nimzo-leningrad",
      name: "Leningrad Variation",
      eco: "E30",
      summary:
        "White develops the bishop to g5, while Black uses the pin and a quick ...c5 to challenge the centre.",
      tags: ["Leningrad", "Pin", "Counterplay"],
      moves: "d4 Nf6 c4 e6 Nc3 Bb4 Bg5 h6 Bh4 c5 d5 Bxc3+".split(" "),
    },
    {
      id: "nimzo-b6",
      name: "Nimzo-Indian with ...b6",
      eco: "E32",
      summary:
        "Black develops the bishop to b7, preparing to contest the long diagonal and the e4-square.",
      tags: ["...b6", "Long diagonal", "Flexible"],
      moves: "d4 Nf6 c4 e6 Nc3 Bb4 e3 b6 Bd3 Bb7 Nf3 O-O".split(" "),
    },
  ],
  catalan: [
    {
      id: "catalan-c6",
      name: "Closed Catalan with ...c6",
      eco: "E06",
      summary:
        "Black keeps the centre closed, so White develops the queen and prepares a slow queenside squeeze.",
      tags: ["Closed", "...c6", "Positional"],
      moves: "d4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O c6".split(" "),
    },
    {
      id: "catalan-bb4",
      name: "Catalan vs ...Bb4+",
      eco: "E06",
      summary:
        "Black checks before developing, so White blocks with the bishop and keeps the long diagonal open.",
      tags: ["Check", "Bishop pair", "Flexible"],
      moves: "d4 Nf6 c4 e6 g3 d5 Bg2 Bb4+ Bd2 Be7 Nf3 O-O".split(" "),
    },
    {
      id: "catalan-nbd7",
      name: "Closed Catalan: ...Nbd7",
      eco: "E06",
      summary:
        "Black develops the knight to d7, supporting ...c6 and ...e5 while White builds the queenside pressure.",
      tags: ["Closed", "Nbd7", "Main line"],
      moves: "d4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7".split(" "),
    },
  ],
  "fried-liver": [
    {
      id: "fried-liver-traxler",
      name: "Traxler Counterattack",
      eco: "C57",
      summary:
        "Black ignores f7 and counterattacks on f2. White must navigate a sharp tactical position.",
      tags: ["Traxler", "Counterattack", "Sharp"],
      moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5 Nxf7 Bxf2+ Kxf2 Nxe4+".split(
        " ",
      ),
    },
    {
      id: "fried-liver-na5",
      name: "Na5 Defence",
      eco: "C57",
      summary:
        "Black saves the knight on a5, so White builds the centre and keeps the initiative without forcing matters.",
      tags: ["Na5", "Positional", "Two Knights"],
      moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2".split(
        " ",
      ),
    },
    {
      id: "fried-liver-quiet",
      name: "Two Knights: quiet 4.d3",
      eco: "C55",
      summary:
        "White avoids the sacrifice and builds a safe centre, keeping the bishop aimed at f7.",
      tags: ["Quiet", "Positional", "Main line"],
      moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6".split(" "),
    },
  ],
  "kings-indian-attack": [
    {
      id: "kia-caro",
      name: "KIA vs Caro-Kann",
      eco: "A07",
      summary:
        "White uses the universal KIA setup against the Caro, keeping the centre closed and preparing e5.",
      tags: ["Caro-Kann", "Universal", "Closed centre"],
      moves: "e4 c6 d3 d5 Nd2 Nf6 Ngf3 Bg4 g3 e6 Bg2 Be7".split(" "),
    },
    {
      id: "kia-pirc",
      name: "KIA vs Pirc",
      eco: "A07",
      summary:
        "White builds the same kingside wall and waits for Black to commit the centre before choosing the break.",
      tags: ["Pirc", "Universal", "Kingside"],
      moves: "e4 d6 d3 Nf6 Nd2 g6 Ngf3 Bg7 g3 O-O Bg2 c5".split(" "),
    },
    {
      id: "kia-open",
      name: "KIA vs 1...e5",
      eco: "A07",
      summary:
        "White keeps the centre closed with d3 and develops the knights before expanding on the kingside.",
      tags: ["Open game", "Closed centre", "Flexible"],
      moves: "e4 e5 Nf3 Nc6 d3 Nf6 g3 d5 Nbd2 Be7 Bg2 O-O".split(" "),
    },
  ],
  "open-game": [
    {
      id: "open-two-knights",
      name: "Open Game: Two Knights",
      eco: "C55",
      summary:
        "Black develops the knight to f6 and meets White's aggression with a solid central response.",
      tags: ["Two Knights", "Classical", "Main line"],
      moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6".split(" "),
    },
    {
      id: "open-four-knights",
      name: "Open Game: Four Knights",
      eco: "C47",
      summary:
        "Both sides develop all four knights before choosing a plan. Black keeps the centre balanced.",
      tags: ["Four Knights", "Balanced", "Classical"],
      moves: "e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6".split(" "),
    },
    {
      id: "open-vienna",
      name: "Open Game: Vienna",
      eco: "C26",
      summary:
        "White develops the bishop to c4 and attacks e5, so Black must decide how to defend the centre.",
      tags: ["Vienna", "Active pieces", "Counterplay"],
      moves: "e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Be7 Nf3 Nc6".split(" "),
    },
  ],
  "vienna-gambit": [
    {
      id: "vienna-gambit-nc6",
      name: "Vienna Gambit vs ...Nc6",
      eco: "C25",
      summary:
        "White opens the f-file against the knight move and uses h4 to keep the kingside under pressure.",
      tags: ["...Nc6", "Kingside", "Gambit"],
      moves: "e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5 h4 g4 Ng5 h6".split(" "),
    },
    {
      id: "vienna-gambit-exf4",
      name: "Vienna Gambit: ...exf4",
      eco: "C29",
      summary:
        "Black accepts the pawn, so White develops quickly and targets the weakened e5 and f7 squares.",
      tags: ["...exf4", "Open lines", "Attack"],
      moves: "e4 e5 Nc3 Nf6 f4 exf4 Nf3 d5 exd5 Nxd5 Bc4 Be7".split(" "),
    },
    {
      id: "vienna-gambit-d5",
      name: "Vienna Gambit: ...d5",
      eco: "C29",
      summary:
        "Black counters in the centre. White exchanges on d5 and keeps the kingside attacking chances.",
      tags: ["...d5", "Central play", "Kingside"],
      moves: "e4 e5 Nc3 Nf6 f4 d5 exd5 Nxd5 Nf3 Be7 d4 O-O".split(" "),
    },
  ],
  "white-vs-caro-kann": [
    {
      id: "white-caro-classical",
      name: "Classical Variation",
      eco: "B18",
      summary:
        "White develops the knight to e4 and uses h4 to gain space against the bishop on g6.",
      tags: ["Classical", "Space", "Main line"],
      moves: "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6".split(" "),
    },
    {
      id: "white-caro-panov",
      name: "Panov Attack",
      eco: "B13",
      summary:
        "White takes on d5 and builds a broad c4-d4 centre, accepting an isolated pawn for active pieces.",
      tags: ["Panov", "Central space", "Active pieces"],
      moves: "e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Be7".split(" "),
    },
    {
      id: "white-caro-two-knights",
      name: "Two Knights Variation",
      eco: "B10",
      summary:
        "White develops both knights and pushes e5, taking space before Black can free the position.",
      tags: ["Two Knights", "Space", "Flexible"],
      moves: "e4 c6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 e6 Nf3 c5".split(" "),
    },
  ],
};

/** Lines mined from real Lichess master games for courses the TSV files miss. */
const generatedExtraLines = (
  generatedExtraRaw as unknown as {
    courses?: Record<string, LineSeed[]>;
  }
).courses ?? {};

function extraLinesFor(slug: string): LineSeed[] {
  return [
    ...(manualExtraLines[slug] ?? []),
    ...(generatedExtraLines[slug] ?? []),
  ];
}

const baseSeeds: OpeningSeed[] = seeds.map((seed) => ({
  ...seed,
  lines: [...seed.lines, ...extraLinesFor(seed.slug)],
}));

/** Course data before the named Lichess lines are merged in. */
export const catalogueBaseOpenings: Opening[] = baseSeeds.map((seed) =>
  buildOpening(seed),
);

function mergedSeeds(): OpeningSeed[] {
  return baseSeeds.map((seed) => ({
    ...seed,
    lines: [
      ...seed.lines,
      ...(imported[seed.slug] ?? []).map((line) => ({
        id: line.id,
        name: line.name,
        eco: line.eco,
        summary: line.summary,
        tags: line.tags,
        moves: line.moves,
        parentName: line.parentName,
        family: line.family,
        level: line.level,
        source: "lichess" as const,
        partial: line.partial,
        i18n: line.i18n,
      })),
    ],
  }));
}

/** Build the full catalogue in any supported language. */
export function buildCatalogueOpenings(
  locale: Locale = "en",
): Opening[] {
  return mergedSeeds().map((seed) => buildOpening(seed, locale));
}

export const catalogueOpenings: Opening[] = buildCatalogueOpenings("en");
