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
- **Optional accounts.** Progress is always saved locally. Add Supabase keys
  and sign in to sync it across devices.

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. No configuration is required. The first request
redirects to `/en` or `/ar` based on the saved language cookie, then the browser
language.

### Languages

- English routes: `/en`, `/en/openings`, `/en/openings/[slug]`, `/en/progress`,
  `/en/login`.
- Arabic routes: `/ar`, `/ar/openings`, `/ar/openings/[slug]`, `/ar/progress`,
  `/ar/login`.
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

## Optional: Supabase accounts and sync

The app works without Supabase. To enable accounts:

1. Create a free project at <https://supabase.com>.
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql). It
   creates the `line_progress` table with row-level security so each user can
   only read and write their own rows. The script is idempotent: re-run it
   after updating the app to add the newer mastery/streak columns.
3. Copy `.env.example` to `.env.local` and fill in:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. In Supabase, open **Authentication → URL Configuration** and add
   `http://localhost:3000/login` (plus your production `/login` URL) as a
   redirect URL.
5. Restart the dev server and open `/login`. Create an account with email and
   password.

Without the environment variables the login page explains the setup and the
app stays fully local. Progress lives in `localStorage` under
`chess-coach-progress-v1` and daily training stats under
`chess-coach-stats-v1`. When you sign in, the app pulls cloud rows, merges them
with the local copy per line (most recent wins), then uploads the merged
snapshot. That means progress made before creating an account is not lost. The
same email on another computer loads the same rows from Supabase. Daily streak
days and lifetime sessions are stored in `user_stats`, so the dashboard travels
with the account too. Local progress is tagged with the signed-in account ID;
signing into a different account on a shared browser does not upload the first
account's data.

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
  [locale]/login/page.tsx           optional Supabase auth
  [locale]/not-found.tsx   bilingual 404
  globals.css              all styling (dark theme, responsive, RTL)
  sitemap.ts               both locales and every course
  robots.ts                crawler rules and sitemap URL
proxy.ts                   locale redirect (/ -> /en or /ar)
components/
  LocaleLink.tsx           next/link that keeps the active locale
  LanguageSwitcher.tsx     English <-> العربية, saved in a cookie
  OpeningsCatalogue.tsx    course cards, filters, learned/last-played sorting
  Dashboard.tsx            progress dashboard and recent practice
  LoginForm.tsx            optional Supabase sign-in/sign-up UI
  MiniBoard.tsx            lightweight 8x8 FEN preview
  EnglishCourse.tsx        focused study view, learn/train/drill/exam state
  ChessBoard.tsx           chessground wrapper, shapes, input handling
  IdeaText.tsx             hover/tap/keyboard board-linked phrases
  CoachPanel.tsx           colour-coded deep notes
  ThemeSwitcher.tsx        teal / blue / violet / amber accent switch
lib/
  chess.ts                 positions, legal moves, SAN lookup
  progress.ts              localStorage + review ladder + mastery + streak
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
  supabase/client.ts       optional client (null when unconfigured)
  supabase/sync.ts         push/pull merge of progress
scripts/
  generate-lines.ts        Stockfish branch generator
  validate-lines.ts        line/idea/shape/source validator
  check-i18n.ts            Arabic structure + translation coverage gate
  audit-lines.ts           Stockfish blunder screen
supabase/
  schema.sql               table + RLS policies
```

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19
- [chess.js](https://github.com/jhlywa/chess.js) for rules and SAN
- [chessground](https://github.com/lichess-org/chessground) for the board and
  native coloured circles/arrows
- Optional [Supabase](https://supabase.com) for accounts and sync

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
