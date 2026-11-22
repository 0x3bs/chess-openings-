# Contributing

Thanks for helping ChessCoach. The project is a static Next.js trainer with two
languages (English and Arabic) and a large, hand-checked opening catalogue.

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The first request redirects to `/en` (or `/ar`
when the browser language is Arabic).

Progress is stored in Postgres. For a full local setup, create a free Supabase
project, run [`supabase/schema.sql`](supabase/schema.sql), copy `.env.example`
to `.env.local` and fill the two public keys. Then open `/progress` and create
a sync code. See [INSTALL.md](INSTALL.md) for the cross-platform walkthrough.

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
- Generated branch lines live in `lib/openings/generated-lines.json`. Do not
  regenerate the whole file casually: generation depends on the bundled
  Stockfish build.
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
- Do not commit `.env.local`, a `service_role` key or generated build output.
  The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is public by design; the schema revokes
  direct table access and exposes only the sync-code RPCs.

## Reporting problems

Open an issue with the course, line id and move number (for example
`italian-giuoco-piano #7`). A screenshot of the board helps.
