import type { OpeningSeed } from "../../openings/catalog";
import {
  lineTermsAr,
  openingIntrosAr,
  openingNamesAr,
  plansAr,
  tagsAr,
  themesAr,
} from "./openings-ar";
import { summariesAr } from "./summaries-ar";

const BRANCH = " This branch reaches ";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const sortedLineTerms = [...lineTermsAr].sort(
  (a, b) => b[0].length - a[0].length,
);

/** Translate a line name while leaving SAN notation and ECO codes untouched. */
export function translateLineName(name: string): string {
  let result = name;
  for (const [english, arabic] of sortedLineTerms) {
    const pattern = new RegExp(
      `(?<![A-Za-z])${escapeRegExp(english)}(?![A-Za-z])`,
      "gi",
    );
    result = result.replace(pattern, arabic);
  }
  return result;
}

/**
 * Translate a summary. Generated summaries append
 * " This branch reaches <move> and keeps the <plan> plan."; the base sentence
 * and the plan name are translated separately so one table covers all of them.
 */
export function translateSummary(summary: string): string {
  const direct = summariesAr[summary];
  if (direct) return direct;

  const index = summary.indexOf(BRANCH);
  if (index === -1) return summary;

  const base = summary.slice(0, index);
  const tail = summary.slice(index + BRANCH.length);
  const match = tail.match(/^(.+?)\s+and keeps the (.+?) plan\.$/);
  if (!match) return summary;

  const baseAr = summariesAr[base] ?? base;
  const planAr = plansAr[match[2].toLowerCase()] ?? match[2];
  return `${baseAr} يصل هذا الفرع إلى ${match[1]} ويحافظ على خطة ${planAr}.`;
}

/**
 * Arabic version of a catalogue seed. The move list, ids and ECO codes are
 * copied unchanged; only human-readable metadata is translated.
 */
export function translateSeed(seed: OpeningSeed): OpeningSeed {
  return {
    ...seed,
    name: openingNamesAr[seed.name] ?? seed.name,
    intro: openingIntrosAr[seed.intro] ?? seed.intro,
    themes: seed.themes.map((theme) => themesAr[theme] ?? theme),
    lines: seed.lines.map((line) => {
      const prepared = line.i18n?.ar;
      return {
        ...line,
        name: prepared?.name ?? translateLineName(line.name),
        summary: prepared?.summary ?? translateSummary(line.summary),
        tags: prepared?.tags ?? line.tags.map((tag) => tagsAr[tag] ?? tag),
      };
    }),
  };
}
