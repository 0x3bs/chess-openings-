# Contributing

Thanks for helping ChessCoach. The project is a Next.js trainer with two
languages (English and Arabic), a large hand-checked opening catalogue, and a
small file-backed API for progress.

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The first request redirects to `/en` (or `/ar`
when the browser language is Arabic).

Progress is stored in `data/progress.json` by `app/api/progress/route.ts`.
No database or API key is needed. The server creates the file on the first
finished line; it is git-ignored. Set `CHESSCOACH_DATA_FILE` to move it. See
[INSTALL.md](INSTALL.md) for the cross-platform walkthrough and LAN/phone setup.

## Before opening a pull request

Run the same gates as CI:

```bash
npm run validate      # legal moves, ideas, highlights, duplicate ids
npm run i18n:check    # Arabic structure + translation coverage
npm run typecheck     # TypeScript
npm run build         # production build and all static routes
```

`npm run audit` runs the slower Stockfish blunder screen. It is not part of CI,
but run it for any change that touches move data:

```bash
AUDIT_OPENING=italian npm run audit
```

## Adding or editing a course

- Course seeds live in `lib/openings/catalog.ts`; the English course lives in
  `lib/openings/english.ts` with its ideas in `lib/openings/english-ideas.ts`.
- Named branch lines live in `lib/openings/lichess-lines.json`. Regenerate them
  with `npm run import:lines` after changing the CC0 TSV files in
  `data/lichess-openings/`; rows that cannot be mapped are recorded in
  `review/unmapped.md`.
- The importer keeps only the longest line when the same course has duplicate
  names with a pure prefix move order. Removed lines are listed in
  `review/duplicate-lines.md`. Famous short entry lines are kept and marked
  `partial: true` (metadata only).
- Whole-line study notes are generated, not hand-written per line: add or edit
  the course note in `data/parent-ideas.json`, then run `npm run ideas` and
  `npm run review:notes`. The generator drops any note that fails the text,
  move/square, evaluation or near-duplicate checks; `npm run validate` refuses
  to ship a bad one. Dropped notes are listed in `review/idea-report.json` and
  the line is shown without a note.
- Stockfish is a checker only (`npm run audit`). It never authors move orders.
- Every move needs exactly one `idea` and at least one highlight. The validator
  checks this for you.
- Add the new course to `lib/openings/index.ts`.

## Translation workflow

The Arabic site is not a machine translation layer. It is a checked dictionary:

- UI strings: `lib/i18n/messages/en.ts` and `lib/i18n/messages/ar.ts`.
- Course metadata: `lib/i18n/content/openings-ar.ts`.
- Line summaries: `lib/i18n/content/summaries-ar.ts`.
- English-course ideas: `lib/i18n/content/english-ideas-ar.ts`.
- Coach notes: `lib/i18n/content/coach-ar.ts`.

Arabic text is keyed by the exact English source string. When you add English
prose, `npm run i18n:check` fails until the Arabic entry exists. That is
intentional: it keeps both languages complete.

Chess notation (SAN, ECO codes, squares) stays in Latin script in both
languages. The board itself is always laid out left-to-right; the surrounding
interface flips with `dir="rtl"`.

## Style

- Keep components in the existing plain-CSS style; no CSS framework.
- Prefer small, focused changes over broad rewrites.
- Use the existing `LocaleLink` for internal links so the language prefix is
  preserved.
- Do not commit `.env.local`, `data/progress.json` or generated build output.
  Keep file writes atomic and serialized in `lib/server/progress-store.ts`.

## Reporting problems

Open an issue with the course, line id and move number (for example
`italian-giuoco-piano #7`). A screenshot of the board helps.

The "Report an issue" link under the board stores a report in this browser
(`localStorage`, key `chess-coach:line-reports`) with the line id, locale and
your message. Nothing is uploaded, so copy the report into the issue yourself.
