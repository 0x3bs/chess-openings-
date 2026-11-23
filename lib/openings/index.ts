import { buildOpening, catalogueOpenings, type LineSeed } from "./catalog";
import { englishOpening } from "./english";
import lichessLines from "./lichess-lines.json";
import type { Opening } from "./types";

const imported = lichessLines as unknown as Record<string, LineSeed[]>;
const englishImported = imported.english ?? [];

const englishWithImported: Opening = englishImported.length
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

/** Every course the trainer knows about. Add a new Opening here. */
export const openings: Opening[] = [englishWithImported, ...catalogueOpenings];
