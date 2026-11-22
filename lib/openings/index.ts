import { buildOpening, catalogueOpenings, type LineSeed } from "./catalog";
import { englishOpening } from "./english";
import generatedLines from "./generated-lines.json";
import type { Opening } from "./types";

const generated = generatedLines as unknown as Record<string, LineSeed[]>;
const englishGenerated = generated.english ?? [];

const englishWithGenerated: Opening = englishGenerated.length
  ? {
      ...englishOpening,
      lines: [
        ...englishOpening.lines,
        ...buildOpening({
          slug: "english-generated",
          name: englishOpening.name,
          eco: englishOpening.eco,
          side: "white",
          intro: englishOpening.intro,
          themes: englishOpening.themes,
          lines: englishGenerated,
        }).lines,
      ],
    }
  : englishOpening;

/** Every course the trainer knows about. Add a new Opening here. */
export const openings: Opening[] = [englishWithGenerated, ...catalogueOpenings];
