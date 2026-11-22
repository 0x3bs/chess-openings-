# ChessCoach

A chess-opening trainer with **30 courses**, **954 lines** and **11,961
explained moves**. The English Opening is the 22-line deep course; every other
opening has a full branch set, from 23 to 55 lines.

This is a learning tool, not an engine: the value is in the explanations.

**بالعربية:** مدرّب افتتاحيات شطرنج يضم 30 دورة و954 خطًا و11,961 فكرة مشروحة.
الواجهة متاحة بالكامل بالعربية (RTL) والإنجليزية، وكل نقلة لها فكرة واحدة وإبراز
واحد على الرقعة.

Licensed under the [MIT License](LICENSE).

## What it does

- **A course catalogue.** `/openings` lists every course with a board preview,
  tags, due count, learned count and last-played sorting.
- **30 openings.** White and Black courses covering the English, Italian, Ruy
  Lopez, Scotch, Vienna, King's Gambit, London, Jobava, Bishop's Opening,
  Ponziani, Queen's Gambit, QGA, Catalan, Caro-Kann, French, Sicilian,
  Scandinavian, Pirc, King's Indian, Nimzo-Indian, Dutch, Slav, Anti-London,
  Petrov, Fried Liver, KIA, Open Game, Vienna Gambit, White vs the Caro-Kann
  and the Englund Gambit.
- **One idea per move.** Every one of the 11,961 plies has a single short
  explanation and one highlighted destination square. The English course also
  has 71 deeper, colour-coded notes.
- **Relevant board links.** Hover or tap a square or a whole move such as
  `Nf3` and only that square/arrow appears. A chess word with no exact board
  picture stays plain instead of lighting up something unrelated.
- **A focused study view.** Board, one idea card, step progress, Back/Next and
  a scrollable move strip. No long written guide below the trainer.
- **Train mode.** You play your side; the board replies. A wrong move snaps
  back and is counted. The line is marked **finished** after any completed
  attempt. A **clean run** — no mistakes, no hints — also marks it **clean**.
- **Drill and exam modes.** Drill mixes due and new lines. Exam replays finished
  lines with notes and hints hidden.
- **Spaced repetition.** A clean line enters a 1, 3, 7, 14, 30 and 60-day
  review ladder. Clean runs earn mastery stars; shaky runs return sooner.
- **Dashboard.** `/progress` shows course completion, lines learned/finished,
  due reviews, clean rate, attempts, recent practice and a weekly streak.
- **Theme switch.** The header cycles Teal → Blue → Violet → Amber and
  remembers your choice.
- **Server progress, no login.** Every finished line is saved in
  `data/progress.json` on the machine running the server. Any phone, tablet or
  computer that opens the same server sees the same progress.
- **Readable progress.** Finished lines are highlighted in the course list, and
  clean runs get a stronger green mark. The board has a size slider with −/+
  controls that grow or shrink width and height together.

## Download and run

No account, database or API key is needed. You only need **Node.js 22** or newer
(`node -v`). [INSTALL.md](INSTALL.md) explains how to install Node on Windows,
macOS and Linux.

### 1. Get the project

**Option A — download the ZIP (no Git needed)**

1. Open <https://github.com/0x3bs/chess-openings->.
2. Click the green **Code** button, then **Download ZIP**.
3. Extract the ZIP and open a terminal in the extracted folder. It contains
   `package.json`, `app/`, `lib/` and the other project files.

**Option B — clone with Git**

```bash
git clone https://github.com/0x3bs/chess-openings-.git
cd chess-openings-
```

If you forked the project, use your own repository URL instead.

### 2. Start the server

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The first request redirects to `/en` or `/ar`
based on the saved language cookie, then the browser language. Press `Ctrl+C`
in the terminal to stop the server.

For a production build:

```bash
npm run build
npm start
```

> **Progress file.** On the first finished line the server creates
> `data/progress.json`. It is git-ignored, needs no database or API key, and is
> shared by every device that opens this server. Back it up. See
> [INSTALL.md](INSTALL.md) for Windows, macOS and Linux steps, including how to
> open the site from your phone.

### Languages

- English routes: `/en`, `/en/openings`, `/en/openings/[slug]`, `/en/progress`.
- Arabic routes: `/ar`, `/ar/openings`, `/ar/openings/[slug]`, `/ar/progress`.
- The header button switches language, keeps the current page and query string,
  and remembers the choice in the `chess-coach-locale` cookie.
- Arabic sets `dir="rtl"` on the document. The chessboard and SAN notation stay
  left-to-right so the board never mirrors.
- UI strings live in [`lib/i18n/messages`](lib/i18n/messages); course content
  lives in [`lib/i18n/content`](lib/i18n/content). Arabic entries are keyed by
  the exact English source string.
- Chess notation (SAN, ECO codes, squares) stays in Latin script in both
  languages, as is standard in Arabic chess literature.

### Scripts

```bash
npm run dev        # dev server (Turbopack)
npm run build      # production build
npm run start      # serve the production build
npm run validate   # validate every course, line, idea, source, shape and hotspot
npm run i18n:check # Arabic structure + translation coverage
npm run typecheck  # TypeScript
npm run check      # validate + i18n:check + typecheck
npm run audit      # Stockfish blunder screen (depth 12, 150cp threshold)
npm run generate   # rebuild the generated branch lines with Stockfish
```

`npm run validate` replays all 954 lines, checks every SAN move is legal, checks
that every move has an idea and a highlight, checks every source URL and
hotspot, and checks for duplicate IDs. Run it after editing course data.

`npm run audit` evaluates every position with the bundled Stockfish 19 WASM
engine from the course side's perspective. It flags large eval drops, losing
positions and free queen captures. The current catalogue passes with zero flags
at depth 12. Intentional gambit pawns are allowed by the 150cp threshold.

Both scripts can be narrowed while iterating: `AUDIT_OPENING=englund-gambit
npm run audit` checks one course, and `GEN_ONLY=englund-gambit npm run generate`
rewrites one course without touching the rest of
`lib/openings/generated-lines.json`. `GEN_DEPTH` and `GEN_DROP` tune the search
depth and the allowed centipawn drop.

## Content and sources

The explanations are **original study notes** written from standard opening
theory. They are not a reproduction of Chessigma's text; if you believe a
sentence overlaps another source, open the line on Lichess and rewrite it.

- Move orders are validated for legality with `chess.js`.
- Every line is blunder-screened with Stockfish 19 from the course side's
  perspective. The English course and the named catalogue lines are
  hand-written; the additional branch lines in
  [`lib/openings/generated-lines.json`](lib/openings/generated-lines.json) are
  built from engine-checked move trees and described with the same original
  one-sentence templates as the rest of the catalogue.
- Each line links to a **Lichess analysis of its exact final position**, plus
  a general opening index and ECO reference.
- The validator only proves the moves are legal and the data is well formed.
  It does not prove every explanatory judgement is correct. If an explanation
  looks wrong, trust the board and fix the sentence.

## Shared progress file (no database, no login)

The server keeps one JSON file:

```text
data/progress.json
```

Every device that opens the same running server reads and writes that file, so
a phone, tablet and laptop all see the same lines, reviews, mastery and streak.
There is no account, password, sync code or external service.

- The first save creates `data/progress.json` automatically.
- Writes are atomic (temporary file + rename) and serialized, so two devices
  training at the same moment cannot leave a half-written file.
- `data/progress.json` is git-ignored. Copy it to back up, or to move progress
  to another machine.
- Set `CHESSCOACH_DATA_FILE` in `.env.local` to store it somewhere else, such as
  a Dropbox/iCloud folder. Relative names are resolved inside `data/`; absolute
  paths are used as-is.
- Everyone using the same server shares one profile. If you later need separate
  profiles, add a profile key to the API rather than a browser-only login.

### Opening the site from your phone

1. Put the laptop and phone on the same Wi‑Fi.
2. Find the laptop's local IP (`ipconfig` on Windows, `ipconfig getifaddr en0`
   on macOS, `hostname -I` on Linux).
3. Start the server with that address so Next.js allows it in development:

   ```bash
   npm run dev -- -H 192.168.1.50
   ```

   Replace the address with your own IP.
4. Allow Node.js or port 3000 through the firewall if the phone cannot connect.
5. On the phone open `http://192.168.1.50:3000`.

Both devices now use the same server and therefore the same progress file. If
the laptop is off or the phone is on another network, the site is unreachable;
deploy the server to a VPS or hosting provider if you need access from
anywhere.

### What is stored where

| Data | Where |
| --- | --- |
| Line progress, reviews, mastery, history | `data/progress.json` on the server |
| Daily streak days and session count | `data/progress.json` on the server |
| Language, theme and board size | Browser `localStorage` (UI only) |

## Adding or editing a course

A course is a plain TypeScript `Opening` object. The English moves live in
[`lib/openings/english.ts`](lib/openings/english.ts) and its hand-written ideas
live in
[`lib/openings/english-ideas.ts`](lib/openings/english-ideas.ts). The catalogue
courses are seeded in [`lib/openings/catalog.ts`](lib/openings/catalog.ts) and
get consistent move descriptions at load time. Everything is merged by
`attachIdeas`, which also adds Lichess/source links and board-linked
hotspots.

A move looks like this:

```ts
{
  san: "Qc2",
  idea: {
    text: "Qc2 defends c3 and covers e4, so Black cannot push ...e4.",
    shapes: [{ kind: "circle", square: "c2" }],
  },
  coach: [
    {
      id: "l1-qc2-orange",
      color: "orange",              // blue | green | orange
      title: "Watch out",
      text: "Don't chase the bishop with a3 too early…",
      shapes: [{ kind: "circle", square: "a3" }],
    },
  ],
}
```

Rules of thumb:

- `moves` alternate White, Black, White, … starting with White.
- `san` must be legal in context — `npm run validate` will catch mistakes.
- Every move needs exactly one `idea`; keep it to one sentence.
- Every idea needs at least one highlight.
- Add 0–3 `coach` points only where a move needs a deeper note.
- Use shapes to point at the squares the note is talking about. An arrow is
  usually clearer than two circles for "this piece goes there".
- Add the opening to [`lib/openings/index.ts`](lib/openings/index.ts). The
  catalogue and `/openings/[slug]` route pick it up automatically.

## Project layout

```
app/
  [locale]/layout.tsx      root layout: html lang/dir, header, footer
  [locale]/page.tsx        landing page
  [locale]/openings/page.tsx        course catalogue
  [locale]/openings/[slug]/page.tsx generic course route
  [locale]/progress/page.tsx        course dashboard and recent practice
  [locale]/not-found.tsx   bilingual 404
  api/progress/route.ts    GET/POST the shared progress file
  globals.css              all styling (dark theme, responsive, RTL)
  sitemap.ts               both locales and every course
  robots.ts                crawler rules and sitemap URL
proxy.ts                   locale redirect (/ -> /en or /ar)
components/
  LocaleLink.tsx           next/link that keeps the active locale
  LanguageSwitcher.tsx     English <-> العربية, saved in a cookie
  OpeningsCatalogue.tsx    course cards, filters, learned/last-played sorting
  Dashboard.tsx            progress dashboard and recent practice
  MiniBoard.tsx            lightweight 8x8 FEN preview
  EnglishCourse.tsx        focused study view, learn/train/drill/exam state
  ChessBoard.tsx           chessground wrapper, shapes, input handling
  IdeaText.tsx             hover/tap/keyboard board-linked phrases
  CoachPanel.tsx           colour-coded deep notes
  ThemeSwitcher.tsx        teal / blue / violet / amber accent switch
lib/
  chess.ts                 positions, legal moves, SAN lookup
  progress.ts              review ladder, mastery, streak and pure data helpers
  db/progress.ts           browser calls to /api/progress
  server/progress-store.ts atomic reads/writes of data/progress.json
  i18n/config.ts           locales, direction, locale-aware paths
  i18n/messages/           English and Arabic UI dictionaries
  i18n/content/            Arabic course, summary, idea and coach tables
  i18n/openings.ts         localized catalogue builder (memoized)
  i18n/LocaleProvider.tsx  client locale context and plural helper
  openings/types.ts        course data types
  openings/english.ts      the 22 English lines and all deep notes
  openings/english-ideas.ts one idea for every English move
  openings/catalog.ts      29 catalogue courses and their named lines
  openings/generated-lines.json  engine-checked branch lines
  openings/apply-ideas.ts  merge ideas, sources and locale-aware hotspots
  openings/index.ts        course registry
scripts/
  generate-lines.ts        Stockfish branch generator
  validate-lines.ts        line/idea/shape/source validator
  check-i18n.ts            Arabic structure + translation coverage gate
  audit-lines.ts           Stockfish blunder screen
data/
  progress.json            shared progress (git-ignored, created on first save)
INSTALL.md                 Windows / macOS / Linux setup guide
```

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19
- [chess.js](https://github.com/jhlywa/chess.js) for rules and SAN
- [chessground](https://github.com/lichess-org/chessground) for the board and
  native coloured circles/arrows
- A local JSON file (`data/progress.json`) served by a Next.js route handler

## Notes

- The board is always created interactive; read-only states are enforced with
  chessground's `selectable`/`draggable` options and empty destinations. This
  matters because chessground only binds input listeners at creation time.
- `turnColor` is derived from the FEN on every update. Chessground keeps the
  side to move separate from the FEN, so without this the board can get stuck
  after a rejected move.
- `learned` means a clean completion. An attempt with hints still marks the line
  finished and enters the review queue, but it stays "Finished" until you do it
  without help.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, the translation workflow and
the checks to run before a pull request.

## License

[MIT](LICENSE) © 2026 ChessCoach contributors.
