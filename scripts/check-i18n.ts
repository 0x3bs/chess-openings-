/**
 * Translation gate.
 *
 * Fails if the Arabic catalogue drifts from the English one structurally, or
 * if any user-facing prose is still English. Run with `npm run i18n:check`.
 */
import { getLocalizedOpenings } from "../lib/i18n/openings";
import { messages } from "../lib/i18n/messages";
import { isPlural, type PluralForms } from "../lib/i18n/plural";
import { openings } from "../lib/openings";

let errors = 0;

function fail(message: string) {
  errors += 1;
  console.error(`  ✗ ${message}`);
}

const hasArabic = (value: string) => /[\u0600-\u06FF]/.test(value);
const hasLatinProse = (value: string) => /[A-Za-z]{3,}/.test(value);

/** Short tokens such as `Bc4`, `...exd4`, `Nbd7`, `Qa5` are notation. */
function isNotationToken(value: string): boolean {
  return !/\s/.test(value) && value.length <= 8;
}

function stripSan(value: string): string {
  return value
    .replace(/O-O-O|O-O/g, "")
    .replace(
      /\b(?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|[a-h]x[a-h][1-8]|[a-h][1-8])\b/g,
      "",
    )
    .replace(/[+#!?]/g, "");
}

function checkProse(
  owner: string,
  english: string,
  arabic: string,
  options: { allowIdentical?: boolean } = {},
) {
  if (!arabic.trim()) {
    fail(`${owner}: empty Arabic text`);
    return;
  }
  if (english === arabic && hasLatinProse(english) && !options.allowIdentical) {
    fail(`${owner}: still English: ${english}`);
  }
}

function checkPlural(owner: string, en: PluralForms, ar: PluralForms) {
  checkProse(`${owner}.one`, en.one, ar.one);
  checkProse(`${owner}.other`, en.other, ar.other);
  for (const key of ["zero", "two", "few", "many"] as const) {
    const english = en[key];
    const arabic = ar[key];
    if (english !== undefined && arabic === undefined) {
      fail(`${owner}.${key}: missing Arabic form`);
    }
  }
}

function compareMessages(
  english: unknown,
  arabic: unknown,
  path: string,
) {
  if (typeof english === "string") {
    if (typeof arabic !== "string") {
      fail(`${path}: missing Arabic string`);
      return;
    }
    if (!arabic.trim()) fail(`${path}: empty Arabic string`);
    if (english === arabic && hasLatinProse(english)) {
      fail(`${path}: still English: ${english}`);
    }
    return;
  }

  if (isPlural(english)) {
    if (!isPlural(arabic)) {
      fail(`${path}: expected plural forms`);
      return;
    }
    checkPlural(path, english, arabic);
    return;
  }

  if (Array.isArray(english)) {
    if (!Array.isArray(arabic) || arabic.length !== english.length) {
      fail(`${path}: array length mismatch`);
      return;
    }
    english.forEach((value, index) =>
      compareMessages(value, arabic[index], `${path}[${index}]`),
    );
    return;
  }

  if (english && typeof english === "object") {
    if (!arabic || typeof arabic !== "object") {
      fail(`${path}: missing object`);
      return;
    }
    for (const key of Object.keys(english)) {
      compareMessages(
        (english as Record<string, unknown>)[key],
        (arabic as Record<string, unknown>)[key],
        path ? `${path}.${key}` : key,
      );
    }
    return;
  }
}

// 1. UI dictionaries ---------------------------------------------------------
compareMessages(messages.en, messages.ar, "messages");

// 2. Course structure and content -------------------------------------------
const arabic = getLocalizedOpenings("ar");

if (arabic.length !== openings.length) {
  fail(`course count: ${arabic.length} Arabic vs ${openings.length} English`);
}

for (let courseIndex = 0; courseIndex < openings.length; courseIndex += 1) {
  const englishCourse = openings[courseIndex];
  const arabicCourse = arabic[courseIndex];

  if (!arabicCourse || englishCourse.slug !== arabicCourse.slug) {
    fail(`course ${courseIndex}: slug mismatch`);
    continue;
  }

  const owner = arabicCourse.slug;
  checkProse(`${owner}.name`, englishCourse.name, arabicCourse.name);
  checkProse(`${owner}.intro`, englishCourse.intro, arabicCourse.intro);

  if (englishCourse.lines.length !== arabicCourse.lines.length) {
    fail(`${owner}: line count mismatch`);
    continue;
  }

  for (let lineIndex = 0; lineIndex < englishCourse.lines.length; lineIndex += 1) {
    const englishLine = englishCourse.lines[lineIndex];
    const arabicLine = arabicCourse.lines[lineIndex];

    if (englishLine.id !== arabicLine.id) {
      fail(`${owner}: line id mismatch at ${lineIndex}`);
      continue;
    }

    const lineOwner = `${owner}/${englishLine.id}`;
    checkProse(
      `${lineOwner}.summary`,
      englishLine.summary,
      arabicLine.summary,
    );

    const arabicProseName = stripSan(arabicLine.name).match(
      /[A-Za-z]{2,}/g,
    );
    if (arabicProseName?.length) {
      fail(
        `${lineOwner}.name: untranslated words ${arabicProseName.join(", ")}`,
      );
    }

    englishLine.tags.forEach((tag, index) => {
      const arabicTag = arabicLine.tags[index];
      if ((arabicTag ?? tag) === tag && !isNotationToken(tag)) {
        fail(`${lineOwner}.tag: still English: ${tag}`);
      }
    });

    if (englishLine.moves.length !== arabicLine.moves.length) {
      fail(`${lineOwner}: move count mismatch`);
      continue;
    }

    for (let moveIndex = 0; moveIndex < englishLine.moves.length; moveIndex += 1) {
      const englishMove = englishLine.moves[moveIndex];
      const arabicMove = arabicLine.moves[moveIndex];
      const moveOwner = `${lineOwner}#${moveIndex + 1}`;

      if (englishMove.san !== arabicMove.san) {
        fail(`${moveOwner}: SAN mismatch (${englishMove.san} vs ${arabicMove.san})`);
      }

      checkProse(
        `${moveOwner}.idea`,
        englishMove.idea?.text ?? "",
        arabicMove.idea?.text ?? "",
      );

      for (const hotspot of arabicMove.idea?.hotspots ?? []) {
        for (const phrase of hotspot.phrases) {
          if (
            !(arabicMove.idea?.text ?? "")
              .toLowerCase()
              .includes(phrase.toLowerCase())
          ) {
            fail(
              `${moveOwner}: hotspot "${phrase}" not found in the Arabic text`,
            );
          }
        }
      }

      const englishCoach = englishMove.coach ?? [];
      const arabicCoach = arabicMove.coach ?? [];
      if (englishCoach.length !== arabicCoach.length) {
        fail(`${moveOwner}: coach count mismatch`);
      } else {
        englishCoach.forEach((point, index) => {
          const translated = arabicCoach[index];
          checkProse(
            `${moveOwner}.coach[${index}].title`,
            point.title,
            translated.title,
          );
          checkProse(
            `${moveOwner}.coach[${index}].text`,
            point.text,
            translated.text,
          );
        });
      }
    }
  }

  englishCourse.themes.forEach((theme, index) => {
    const arabicTheme = arabicCourse.themes[index];
    if ((arabicTheme ?? theme) === theme && !isNotationToken(theme)) {
      fail(`${owner}.theme: still English: ${theme}`);
    }
  });
}

// 3. No stray English in Arabic prose --------------------------------------
function walkIdeas() {
  for (const course of arabic) {
    for (const line of course.lines) {
      for (const move of line.moves) {
        const text = move.idea?.text ?? "";
        if (!hasArabic(text)) {
          fail(`${course.slug}/${line.id}: idea has no Arabic text`);
        }
      }
    }
  }
}
walkIdeas();

if (errors > 0) {
  console.error(`\n✗ Translation check failed with ${errors} error(s).`);
  process.exit(1);
}

const totalLines = arabic.reduce((sum, course) => sum + course.lines.length, 0);
const totalMoves = arabic.reduce(
  (sum, course) =>
    sum + course.lines.reduce((lineSum, line) => lineSum + line.moves.length, 0),
  0,
);

console.log(
  `Checked ${arabic.length} courses, ${totalLines} lines, ${totalMoves} moves and both UI dictionaries.`,
);
console.log("✓ Arabic catalogue matches the English structure and prose is translated.");
