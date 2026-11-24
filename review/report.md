# Explanation generation report

Generated 2026-11-24T00:18:43.717Z with stockfish lite-single depth 12.

## Totals

- Named lines in the catalogue: **1277**
- Lines with an accepted explanation: **1066**
- Lines without an explanation: **211**
- Parent-course notes: **30** (English + Arabic, `source: "manual"`)
- Explanations in `review/top-100.md`: see that file

Every line note is written by `scripts/generate-ideas.ts` from three facts:
the branch move of the line, the length and last move of the line, and a
Stockfish depth-12 evaluation of the final position, combined with one
sentence from the parent-course note. `scripts/validate-ideas.ts` re-checks
the committed text (two sentences at most, only moves and squares that
occur in the line, no evaluation contradiction, no near-duplicate note
inside the same parent) and fails the build if anything slips through.

## Per course

| Course | Lines | Explained | No note | Partial | Audit-flagged |
| --- | --- | --- | --- | --- | --- |
| English Opening | 62 | 55 | 7 | 0 | 1 |
| Italian Game | 128 | 82 | 46 | 0 | 2 |
| Ruy Lopez | 134 | 104 | 30 | 0 | 4 |
| Scotch Game | 53 | 44 | 9 | 18 | 0 |
| Vienna Game | 15 | 15 | 0 | 0 | 1 |
| King's Gambit | 66 | 61 | 5 | 0 | 7 |
| London System | 6 | 6 | 0 | 0 | 0 |
| Jobava London | 5 | 5 | 0 | 0 | 0 |
| Bishop's Opening | 9 | 9 | 0 | 0 | 0 |
| Ponziani Opening | 6 | 6 | 0 | 0 | 0 |
| Queen's Gambit | 150 | 124 | 26 | 0 | 0 |
| Queen's Gambit Accepted | 31 | 25 | 6 | 0 | 0 |
| Caro-Kann Defence | 27 | 25 | 2 | 0 | 0 |
| French Defence | 74 | 60 | 14 | 0 | 0 |
| Sicilian Defence | 158 | 134 | 24 | 0 | 0 |
| Scandinavian Defence | 8 | 8 | 0 | 0 | 0 |
| Pirc Defence | 8 | 8 | 0 | 0 | 0 |
| King's Indian Defence | 89 | 75 | 14 | 0 | 2 |
| Dutch Defence | 21 | 18 | 3 | 0 | 0 |
| Slav Defence | 68 | 60 | 8 | 0 | 0 |
| Anti-London | 5 | 5 | 0 | 0 | 0 |
| Petrov Defence | 21 | 15 | 6 | 0 | 0 |
| Nimzo-Indian Defence | 56 | 50 | 6 | 0 | 0 |
| Catalan Opening | 26 | 22 | 4 | 0 | 0 |
| Fried Liver Attack | 6 | 6 | 0 | 1 | 0 |
| King's Indian Attack | 10 | 9 | 1 | 0 | 0 |
| Open Game | 15 | 15 | 0 | 1 | 1 |
| Vienna Gambit | 9 | 9 | 0 | 0 | 0 |
| White vs Caro-Kann | 5 | 5 | 0 | 0 | 0 |
| Englund Gambit | 6 | 6 | 0 | 1 | 0 |

## Why a line has no note

| Reason | Lines |
| --- | --- |
| near-duplicate English explanation | 206 |
| near-duplicate Arabic explanation | 141 |

A dropped note is never shipped: the line still appears in the trainer and
simply shows no explanation. Nothing is deleted silently.

### Examples of dropped near-duplicates

- **Anglo-Scandinavian: ...Qa5** (`anglo-scandinavian-qa5`) — near-duplicate English explanation
  - EN: Anglo-Scandinavian (ECO A10) diverges with the queen move to a5 on move 3 and closes with short castling on move 9 after 18 plies. Black should contest the centre, and the final position is slightly better for White.
- **English Opening: King's English Variation, Four Knights Variation, Fianchetto Line** (`lichess-english-a29-english-opening-kings-english-variation-four-knights-variation-fianchetto-line-3`) — near-duplicate English explanation
  - EN: The King's English Variation (ECO A29) turns on the bishop move to e7 on move 6; the line runs 14 plies and closes with short castling on move 7. White should develop the minor pieces, and the final position is balanced.
- **English Opening: King's English Variation, Four Knights Variation, Fianchetto Line, with .. d6, Be7** (`lichess-english-a29-english-opening-kings-english-variation-four-knights-variation-fianchetto-line-with-d6-be7`) — near-duplicate English explanation
  - EN: King's English Variation (ECO A29) diverges with the knight move to c6 on move 3 and closes with short castling on move 6 after 12 plies. Black should contest the centre, and the final position is balanced.
- **English Opening: King's English Variation, Four Knights Variation, Fianchetto Line, with .. d6, h6** (`lichess-english-a29-english-opening-kings-english-variation-four-knights-variation-fianchetto-line-with-d6-h6`) — near-duplicate English explanation, near-duplicate Arabic explanation
  - EN: King's English Variation (ECO A29) reaches the pawn move to h6 on move 6 and stops after 12 plies. Black should contest the centre, and the final position is balanced.
- **English Opening: King's English Variation, Four Knights Variation, Fianchetto Line, with Nb6** (`lichess-english-a29-english-opening-kings-english-variation-four-knights-variation-fianchetto-line-with-nb6`) — near-duplicate English explanation, near-duplicate Arabic explanation
  - EN: In the King's English Variation (ECO A29), the 12-ply line closes with the knight move to b6 on move 6. The typical mistake is pushing the central pawn too early before the flank pawns and the fianchettoed bishop are properly supported, and the final position is balanced.

## Famous short lines kept on purpose

These entries are real named short lines that also have a longer named
continuation. They stay in the catalogue with `partial: true` and are left
out of the top-100 study list.

- Scotch Game — Scotch Game (C45)
- Scotch Game — Scotch Game: Benima Defense (C44)
- Scotch Game — Scotch Game: Classical Variation (C45)
- Scotch Game — Scotch Game: Classical Variation, Blackburne Attack (C45)
- Scotch Game — Scotch Game: Göring Gambit (C44)
- Scotch Game — Scotch Game: Göring Gambit, Double Pawn Sacrifice (C44)
- Scotch Game — Scotch Game: Haxo Gambit (C44)
- Scotch Game — Scotch Game: Horwitz Attack (C45)
- Scotch Game — Scotch Game: Malaniuk Variation (C45)
- Scotch Game — Scotch Game: Mieses Variation (C45)
- Scotch Game — Scotch Game: Paulsen Attack (C45)
- Scotch Game — Scotch Game: Potter Variation (C45)
- Scotch Game — Scotch Game: Schmidt Variation (C45)
- Scotch Game — Scotch Game: Scotch Gambit (C44)
- Scotch Game — Scotch Game: Scotch Gambit, Dubois Réti Defense (C44)
- Scotch Game — Scotch Game: Scotch Gambit, London Defense (C44)
- Scotch Game — Scotch Game: Scotch Gambit, Sarratt Variation (C44)
- Scotch Game — Scotch Game: Steinitz Variation (C45)
- Fried Liver Attack — Fried Liver main line (C57)
- Open Game — Danish Gambit Accepted (C21)
- Englund Gambit — Englund Gambit: Main Line (A40)

## Audit flags

The Stockfish audit reports **18** lines with at least one flag
(gambits, traps and forced material lines). They are kept because they are
real theory, and they are excluded from the top-100 list. Full details:
`scripts/audit-report.json`.

## Other review files

- `review/duplicate-lines.md` — prefix duplicates removed during import
- `review/unmapped.md` — dataset rows that could not be mapped
- `review/idea-report.json` — machine-readable version of this report
