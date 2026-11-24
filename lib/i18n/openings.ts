import { attachIdeas } from "@/lib/openings/apply-ideas";
import {
  buildCatalogueOpenings,
  buildOpening,
  type LineSeed,
} from "@/lib/openings/catalog";
import { englishBaseOpening, englishOpening } from "@/lib/openings/english";
import { englishIdeas } from "@/lib/openings/english-ideas";
import lichessLines from "@/lib/openings/lichess-lines.json";
import { openings } from "@/lib/openings";
import { lineIdeaFor } from "@/lib/openings/line-ideas";
import { markPartialLines, partialLineIds } from "@/lib/openings/partial";
import type { Opening } from "@/lib/openings/types";
import type { Locale } from "./config";
import { translateLineName, translateSummary } from "./content/catalog-ar";
import { coachTextAr, coachTitlesAr } from "./content/coach-ar";
import { englishIdeasAr } from "./content/english-ideas-ar";
import {
  openingIntrosAr,
  openingNamesAr,
  tagsAr,
  themesAr,
} from "./content/openings-ar";

const SOURCE_NOTE_AR =
  "كل نقلة لها فكرة أصلية من جملة واحدة، مكتوبة من نظرية الافتتاحية الإنجليزية المعتادة. يتم التحقق من ترتيب النقلات بـchess.js وفحصها بـStockfish. رابط Lichess يفتح الوضع النهائي بالضبط لتتحقق منه بنفسك.";

const imported = lichessLines as unknown as Record<string, LineSeed[]>;

function translateEnglishOpening(): Opening {
  const source = markPartialLines(englishBaseOpening);
  const base: Opening = {
    ...source,
    name: openingNamesAr[source.name] ?? source.name,
    intro: openingIntrosAr[source.intro] ?? source.intro,
    themes: source.themes.map((theme) => themesAr[theme] ?? theme),
    sourceNote: SOURCE_NOTE_AR,
    lines: source.lines.map((line) => ({
      ...line,
      name: translateLineName(line.name),
      summary: translateSummary(line.summary),
      tags: line.tags.map((tag) => tagsAr[tag] ?? tag),
      moves: line.moves.map((move) => ({
        ...move,
        coach: move.coach?.map((point) => ({
          ...point,
          title: coachTitlesAr[point.title] ?? point.title,
          text: coachTextAr[point.text] ?? point.text,
        })),
      })),
    })),
  };

  const ideas: Record<string, string[]> = {};
  for (const [lineId, sentences] of Object.entries(englishIdeas)) {
    ideas[lineId] = sentences.map(
      (sentence) => englishIdeasAr[sentence] ?? sentence,
    );
  }

  return attachIdeas(base, ideas, "ar");
}

function englishWithImported(locale: Locale): Opening {
  const english =
    locale === "ar" ? translateEnglishOpening() : englishOpening;
  const extra = imported.english ?? [];
  if (!extra.length) return english;

  return {
    ...english,
    lines: [
      ...english.lines,
      ...buildOpening(
        {
          slug: "english-imported",
          name: english.name,
          eco: english.eco,
          side: "white",
          intro: english.intro,
          themes: english.themes,
          lines: extra,
        },
        locale,
      ).lines,
    ],
  };
}

const cache: Partial<Record<Locale, Opening[]>> = {};

/**
 * Attach the generated whole-line note in the active language. Only the note
 * text is copied, so the rest of the course data stays shared and immutable.
 */
function withLineIdeas(list: Opening[], locale: Locale): Opening[] {
  return list.map((opening) => ({
    ...opening,
    lines: opening.lines.map((line) => {
      const idea = lineIdeaFor(line.id, locale);
      return idea ? { ...line, idea } : line;
    }),
  }));
}

/**
 * Every course in the requested language. The Arabic catalogue is expensive to
 * build, so memoize it once per process instead of rebuilding it for each of
 * the 30 static course pages.
 */
export function getLocalizedOpenings(locale: Locale): Opening[] {
  if (cache[locale]) return cache[locale] as Opening[];

  if (locale === "en") {
    cache[locale] = withLineIdeas(openings, locale);
    return cache[locale] as Opening[];
  }

  const partialIds = partialLineIds(
    openings.flatMap((opening) =>
      opening.lines.map((line) => ({
        id: line.id,
        name: line.name,
        moves: line.moves.map((move) => move.san),
      })),
    ),
  );
  cache[locale] = withLineIdeas(
    [
      englishWithImported(locale),
      ...buildCatalogueOpenings(locale),
    ].map((opening) => markPartialLines(opening, partialIds)),
    locale,
  );
  return cache[locale] as Opening[];
}

export function getLocalizedOpening(
  locale: Locale,
  slug: string,
): Opening | undefined {
  return getLocalizedOpenings(locale).find((opening) => opening.slug === slug);
}
