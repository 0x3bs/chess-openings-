import { attachIdeas } from "./apply-ideas";
import { englishIdeas } from "./english-ideas";
import type { CoachShape, Opening } from "./types";

const c = (square: string): CoachShape => ({ kind: "circle", square });
const a = (from: string, to: string): CoachShape => ({
  kind: "arrow",
  from,
  to,
});

export const englishBaseOpening: Opening = {
  slug: "english",
  name: "English Opening",
  eco: "A10–A39",
  side: "white",
  intro:
    "One flexible 1.c4 repertoire: build the g3 fianchetto, squeeze with the g2-bishop, grab the centre with the Mikenas when Black allows it, and know the traps before they happen.",
  sourceNote:
    "Every move has one original one-sentence idea, written from standard English Opening theory. Move orders are validated with chess.js and screened with Stockfish. The Lichess link opens the exact final position so you can check it yourself.",
  themes: [
    "Flank pressure on d5",
    "g3 fianchetto",
    "d4 break",
    "Reversed Sicilian",
    "Mikenas centre grab",
  ],
  lines: [
    {
      id: "four-knights-qc2",
      name: "Four Knights: 4.e3 & 5.Qc2",
      eco: "A28",
      side: "white",
      summary:
        "The backbone of the King's English. White builds a flexible centre and keeps the c3-knight protected before the d4 break.",
      tags: ["King's English", "Positional", "Main line"],
      moves: [
        {
          san: "c4",
          coach: [
            {
              id: "l1-c4-blue",
              color: "blue",
              title: "The idea",
              text: "1.c4 pressures d5 from the flank instead of occupying the centre. White will build behind that pressure with Nc3, g3, Bg2 and a later d4.",
              shapes: [c("c4"), c("d5")],
            },
          ],
        },
        { san: "e5" },
        {
          san: "Nc3",
          coach: [
            {
              id: "l1-nc3-blue",
              color: "blue",
              title: "The idea",
              text: "The knight controls d5 and e4, the two squares that matter most in the English. It also prepares the d4 break.",
              shapes: [c("c3"), c("d5"), c("e4")],
            },
          ],
        },
        { san: "Nf6" },
        { san: "Nf3" },
        { san: "Nc6" },
        {
          san: "e3",
          coach: [
            {
              id: "l1-e3-green",
              color: "green",
              title: "Why now?",
              text: "e3 opens the f1-bishop and prepares d4. After ...exd4 the e3-pawn recaptures on d4 and White owns the centre.",
              shapes: [c("e3"), c("d4"), c("f1")],
            },
          ],
        },
        { san: "Bb4" },
        {
          san: "Qc2",
          coach: [
            {
              id: "l1-qc2-blue",
              color: "blue",
              title: "The idea",
              text: "Qc2 defends the c3-knight and covers e4, so Black cannot comfortably play ...e4.",
              shapes: [c("c2"), c("c3"), c("e4"), a("c2", "c3")],
            },
            {
              id: "l1-qc2-green",
              color: "green",
              title: "Why now?",
              text: "It also prepares d4: after ...exd4, the e3-pawn recaptures and White gets the centre.",
              shapes: [c("c2"), c("d4"), c("e3")],
            },
            {
              id: "l1-qc2-orange",
              color: "orange",
              title: "Watch out",
              text: "Don't chase the bishop with a3 too early: ...Bxc3 forces bxc3 and doubles your pawns. Play Qc2 first.",
              shapes: [c("a3"), c("c3"), c("b2")],
            },
          ],
        },
        { san: "O-O" },
        {
          san: "a3",
          coach: [
            {
              id: "l1-a3-green",
              color: "green",
              title: "Why now?",
              text: "Now a3 is safe: the queen on c2 recaptures on c3, so the pawn structure stays healthy.",
              shapes: [c("a3"), c("c3"), c("c2")],
            },
          ],
        },
        { san: "Bxc3" },
        { san: "Qxc3" },
        { san: "Re8" },
        { san: "d3" },
        { san: "d5" },
        { san: "cxd5" },
        { san: "Nxd5" },
        {
          san: "Qc2",
          coach: [
            {
              id: "l1-qc2b-blue",
              color: "blue",
              title: "The idea",
              text: "The queen returns to c2, defending c3 and keeping the c-file flexible.",
              shapes: [c("c2"), c("e4")],
            },
          ],
        },
      ],
    },
    {
      id: "nd5-trap",
      name: "The Nd5 trap",
      eco: "A28",
      side: "white",
      summary:
        "A concrete tactic in the Four Knights: the knight jumps to d5, and the follow-up wins the b4-bishop — but only with the right move order.",
      tags: ["King's English", "Trap", "Tactical"],
      moves: [
        { san: "c4" },
        { san: "e5" },
        { san: "Nc3" },
        { san: "Nf6" },
        { san: "Nf3" },
        { san: "Nc6" },
        {
          san: "e3",
          coach: [
            {
              id: "l2-e3-green",
              color: "green",
              title: "Why now?",
              text: "e3 opens the bishop and prepares d4, exactly as in the main Four Knights line.",
              shapes: [c("e3"), c("d4"), c("f1")],
            },
          ],
        },
        { san: "Bb4" },
        {
          san: "Qc2",
          coach: [
            {
              id: "l2-qc2-blue",
              color: "blue",
              title: "The idea",
              text: "Qc2 defends c3 and covers e4. The d2-pawn means the c3-knight is not really pinned, which makes the next move possible.",
              shapes: [c("c2"), c("c3"), c("e4"), c("d2")],
            },
          ],
        },
        { san: "d6" },
        {
          san: "Nd5",
          coach: [
            {
              id: "l2-nd5-blue",
              color: "blue",
              title: "The idea",
              text: "The knight jumps to d5, attacking the b4-bishop and the c7-pawn. The d2-pawn blocks the pin, so the knight is free to leave c3.",
              shapes: [c("d5"), c("b4"), c("c7"), c("d2")],
            },
            {
              id: "l2-nd5-green",
              color: "green",
              title: "Why now?",
              text: "Black must answer the attack on b4. Whatever happens, White has gained time and space.",
              shapes: [c("d5"), c("b4"), a("d5", "b4")],
            },
            {
              id: "l2-nd5-orange",
              color: "orange",
              title: "Watch out",
              text: "The follow-up only works if you trade on d4 first. 8.Qa4+? Bd7 9.Qxb4 Nc2+ forks your king and a1-rook.",
              shapes: [c("a4"), c("b4"), c("c2"), c("e1"), c("a1")],
            },
          ],
        },
        { san: "Nxd5" },
        { san: "cxd5" },
        { san: "Nd4" },
        {
          san: "Nxd4",
          coach: [
            {
              id: "l2-nxd4-green",
              color: "green",
              title: "Why now?",
              text: "Trade the knight before the check! 8.Nxd4 exd4 clears d4, so 9.Qa4+ wins the b4-bishop for free.",
              shapes: [c("d4"), c("e5"), c("a4"), c("b4"), a("d4", "b4")],
            },
          ],
        },
        { san: "exd4" },
        {
          san: "Qa4+",
          coach: [
            {
              id: "l2-qa4-blue",
              color: "blue",
              title: "The idea",
              text: "The queen checks on a4 and attacks b4 at the same time. Black cannot save the bishop.",
              shapes: [c("a4"), c("e8"), c("b4"), a("a4", "e8"), a("a4", "b4")],
            },
          ],
        },
        { san: "Bd7" },
        {
          san: "Qxb4",
          coach: [
            {
              id: "l2-qxb4-green",
              color: "green",
              title: "The reward",
              text: "Free bishop. White is a clean piece up.",
              shapes: [c("b4"), c("a4")],
            },
          ],
        },
      ],
    },
    {
      id: "reversed-dragon",
      name: "Reversed Dragon",
      eco: "A20",
      side: "white",
      summary:
        "After 3.g3 d5, the game becomes a Sicilian Dragon with colours reversed and White a move ahead. The g2-bishop is the star, and 9.Nb5 avoids the ...Nxd4/...Qxd4 trap.",
      tags: ["King's English", "Reversed Dragon", "Positional"],
      moves: [
        { san: "c4" },
        { san: "e5" },
        { san: "Nc3" },
        { san: "Nf6" },
        {
          san: "g3",
          coach: [
            {
              id: "l3-g3-blue",
              color: "blue",
              title: "The idea",
              text: "g3 prepares Bg2, the bishop that will rake the long diagonal and pressure d5.",
              shapes: [c("g3"), c("g2"), c("d5")],
            },
          ],
        },
        { san: "d5" },
        {
          san: "cxd5",
          coach: [
            {
              id: "l3-cxd5-green",
              color: "green",
              title: "Why now?",
              text: "Take on d5 while the centre is open. After ...Nxd5 the knight becomes a target for the g2-bishop.",
              shapes: [c("c4"), c("d5"), c("g2")],
            },
          ],
        },
        { san: "Nxd5" },
        { san: "Bg2" },
        { san: "Nb6" },
        { san: "Nf3" },
        { san: "Nc6" },
        { san: "O-O" },
        { san: "Be7" },
        {
          san: "d4",
          coach: [
            {
              id: "l3-d4-green",
              color: "green",
              title: "Why now?",
              text: "The d4 break opens the position while White is better developed. After ...exd4, the accurate move is Nb5, not Nxd4.",
              shapes: [c("d4"), c("e5"), c("b5")],
            },
          ],
        },
        { san: "exd4" },
        {
          san: "Nb5",
          coach: [
            {
              id: "l3-nb5-green",
              color: "green",
              title: "Why not Nxd4?",
              text: "9.Nxd4? Nxd4 10.Qxd4?? Qxd4 wins your queen. The knight goes to b5 instead, hitting c7 and d4 without stepping into the trade.",
              shapes: [c("b5"), c("c7"), c("d4"), c("d8")],
            },
          ],
        },
        { san: "O-O" },
        { san: "Nfxd4" },
        { san: "Nxd4" },
        {
          san: "Nxd4",
          coach: [
            {
              id: "l3-nxd4-blue",
              color: "blue",
              title: "The idea",
              text: "The b5-knight recaptures on d4, centralising and keeping the long diagonal open.",
              shapes: [c("d4"), c("g2"), c("c7")],
            },
          ],
        },
        { san: "c6" },
      ],
    },
    {
      id: "g3-bb4",
      name: "Fianchetto vs 3...Bb4",
      eco: "A29",
      side: "white",
      summary:
        "Black develops the bishop actively and castles quickly. White finishes the fianchetto, then handles the ...e4 pawn push.",
      tags: ["King's English", "Fianchetto", "Positional"],
      moves: [
        { san: "c4" },
        { san: "e5" },
        { san: "Nc3" },
        { san: "Nf6" },
        {
          san: "g3",
          coach: [
            {
              id: "l4-g3-blue",
              color: "blue",
              title: "The idea",
              text: "The fianchetto setup again: g3 and Bg2 control the long diagonal and make d5 a permanent target.",
              shapes: [c("g3"), c("g2"), c("d5")],
            },
          ],
        },
        { san: "Bb4" },
        { san: "Bg2" },
        { san: "O-O" },
        { san: "Nf3" },
        { san: "Re8" },
        { san: "O-O" },
        { san: "Bxc3" },
        {
          san: "bxc3",
          coach: [
            {
              id: "l4-bxc3-blue",
              color: "blue",
              title: "The idea",
              text: "Recapture toward the centre. The doubled pawns control d4 and b4, and the b-file may open for the rook.",
              shapes: [c("b2"), c("c3"), c("d4"), c("b4")],
            },
          ],
        },
        { san: "e4" },
        {
          san: "Ne1",
          coach: [
            {
              id: "l4-ne1-green",
              color: "green",
              title: "Why now?",
              text: "The knight retreats to e1 because ...e4 kicked it. From e1 it can go to c2 or d3 and help hold the centre.",
              shapes: [c("f3"), c("e4"), c("e1"), c("c2"), c("d3")],
            },
          ],
        },
      ],
    },
    {
      id: "symmetrical-main",
      name: "Symmetrical English: main line",
      eco: "A30",
      side: "white",
      summary:
        "Black mirrors with 1...c5. White breaks the symmetry with a timely d4 and gets the more comfortable game.",
      tags: ["Symmetrical", "Main line", "Positional"],
      moves: [
        { san: "c4" },
        { san: "c5" },
        { san: "Nc3" },
        { san: "Nc6" },
        { san: "g3" },
        { san: "g6" },
        { san: "Bg2" },
        { san: "Bg7" },
        { san: "Nf3" },
        { san: "Nf6" },
        {
          san: "d4",
          coach: [
            {
              id: "l5-d4-green",
              color: "green",
              title: "Why now?",
              text: "Break the symmetry! White strikes on d4 while Black is not fully developed.",
              shapes: [c("d4"), c("c5")],
            },
          ],
        },
        { san: "cxd4" },
        {
          san: "Nxd4",
          coach: [
            {
              id: "l5-nxd4-blue",
              color: "blue",
              title: "The idea",
              text: "Recapture with the knight, centralising it and eyeing c6, e6 and f5.",
              shapes: [c("d4"), c("c6"), c("e6"), c("f5")],
            },
          ],
        },
        { san: "O-O" },
        { san: "O-O" },
        { san: "Nxd4" },
        {
          san: "Qxd4",
          coach: [
            {
              id: "l5-qxd4-blue",
              color: "blue",
              title: "The idea",
              text: "The queen recaptures centrally. White has more space and a comfortable game.",
              shapes: [c("d4"), c("d6")],
            },
          ],
        },
        { san: "d6" },
      ],
    },
    {
      id: "hedgehog",
      name: "Symmetrical: Hedgehog",
      eco: "A30",
      side: "white",
      summary:
        "Black sets up the Hedgehog with ...b6, ...Bb7 and ...e6. White develops Nf3 first, so the bishops never trade, then strikes with d4.",
      tags: ["Symmetrical", "Hedgehog", "Positional"],
      moves: [
        { san: "c4" },
        { san: "c5" },
        { san: "Nc3" },
        { san: "Nf6" },
        { san: "Nf3" },
        { san: "b6" },
        { san: "g3" },
        { san: "Bb7" },
        { san: "Bg2" },
        { san: "e6" },
        { san: "O-O" },
        { san: "Be7" },
        {
          san: "d4",
          coach: [
            {
              id: "l6-d4-green",
              color: "green",
              title: "Why now?",
              text: "White breaks before Black finishes the Hedgehog setup. If ...cxd4, Qxd4 keeps the queen active.",
              shapes: [c("d4"), c("c5")],
            },
          ],
        },
        { san: "cxd4" },
        {
          san: "Qxd4",
          coach: [
            {
              id: "l6-qxd4-blue",
              color: "blue",
              title: "The idea",
              text: "The queen on d4 is centralised and supports the b3/Bb2 plan.",
              shapes: [c("d4"), c("b3"), c("b2")],
            },
          ],
        },
        { san: "d6" },
        {
          san: "b3",
          coach: [
            {
              id: "l6-b3-blue",
              color: "blue",
              title: "The idea",
              text: "b3 prepares Bb2. Once the c3-knight moves, the bishop will rake the long diagonal.",
              shapes: [c("b3"), c("b2"), c("c3"), c("g7")],
            },
          ],
        },
        { san: "Nbd7" },
      ],
    },
    {
      id: "symmetrical-e5",
      name: "Symmetrical with ...e5",
      eco: "A30",
      side: "white",
      summary:
        "A flexible, slow build. White keeps the centre fluid and expands on the queenside with a3 and b4.",
      tags: ["Symmetrical", "Positional", "Slow build"],
      moves: [
        { san: "c4" },
        { san: "c5" },
        { san: "Nc3" },
        { san: "Nc6" },
        { san: "g3" },
        { san: "g6" },
        { san: "Bg2" },
        { san: "Bg7" },
        { san: "Nf3" },
        { san: "e5" },
        { san: "O-O" },
        { san: "Nge7" },
        {
          san: "d3",
          coach: [
            {
              id: "l7-d3-blue",
              color: "blue",
              title: "The idea",
              text: "A quiet move that keeps the centre flexible. White will play Rb1 and b4 on the queenside.",
              shapes: [c("d3"), c("b4"), c("b1")],
            },
          ],
        },
        { san: "O-O" },
        {
          san: "a3",
          coach: [
            {
              id: "l7-a3-blue",
              color: "blue",
              title: "The idea",
              text: "a3 prepares b4, the queenside space grab that is typical of the English.",
              shapes: [c("a3"), c("b4")],
            },
          ],
        },
        { san: "d6" },
      ],
    },
    {
      id: "mikenas-trap",
      name: "Mikenas Attack: the Ng5 trap",
      eco: "A18",
      side: "white",
      summary:
        "Against 1...Nf6 and 2...e6, White grabs the centre with the Mikenas 3.e4. The main line traps the f6-knight outright.",
      tags: ["Mikenas", "Trap", "Aggressive"],
      moves: [
        { san: "c4" },
        { san: "Nf6" },
        { san: "Nc3" },
        { san: "e6" },
        {
          san: "e4",
          coach: [
            {
              id: "l8-e4-blue",
              color: "blue",
              title: "The idea",
              text: "The Mikenas! White grabs the centre at once instead of the slow fianchetto.",
              shapes: [c("e4"), c("d4"), c("c4")],
            },
          ],
        },
        { san: "Bb4" },
        {
          san: "e5",
          coach: [
            {
              id: "l8-e5-green",
              color: "green",
              title: "Why now?",
              text: "The pawn advances and kicks the f6-knight, which has no good square.",
              shapes: [c("e5"), c("f6"), a("e5", "f6")],
            },
          ],
        },
        { san: "Bxc3" },
        { san: "bxc3" },
        { san: "Ne4" },
        {
          san: "Qg4",
          coach: [
            {
              id: "l8-qg4-green",
              color: "green",
              title: "Why now?",
              text: "The queen attacks the e4-knight along the rank and also eyes g7 down the g-file.",
              shapes: [c("g4"), c("e4"), c("g7"), a("g4", "e4")],
            },
          ],
        },
        { san: "Ng5" },
        {
          san: "h4",
          coach: [
            {
              id: "l8-h4-orange",
              color: "orange",
              title: "The trap",
              text: "h4 attacks the knight, and the queen on g4 covers e4, f3 and h3. Its other squares are blocked by Black's own pawns — the knight is lost.",
              shapes: [c("h4"), c("g5"), c("e4"), c("f3"), c("h3")],
            },
          ],
        },
      ],
    },
    {
      id: "mikenas-c5",
      name: "Mikenas vs 3...c5",
      eco: "A18",
      side: "white",
      summary:
        "Black hits back at the Mikenas centre with ...c5. White pushes past with e5 and keeps the extra space.",
      tags: ["Mikenas", "Aggressive", "Space"],
      moves: [
        { san: "c4" },
        { san: "Nf6" },
        { san: "Nc3" },
        { san: "e6" },
        { san: "e4" },
        { san: "c5" },
        {
          san: "e5",
          coach: [
            {
              id: "l9-e5-green",
              color: "green",
              title: "Why now?",
              text: "Black hits the centre with ...c5, so White pushes past with e5 and gains space. The f6-knight is kicked again.",
              shapes: [c("e5"), c("c5"), c("f6")],
            },
          ],
        },
        { san: "Ng8" },
        {
          san: "d4",
          coach: [
            {
              id: "l9-d4-blue",
              color: "blue",
              title: "The idea",
              text: "White supports the e5-pawn and opens lines for the pieces.",
              shapes: [c("d4"), c("e5")],
            },
          ],
        },
        { san: "cxd4" },
        { san: "Qxd4" },
        { san: "Nc6" },
        {
          san: "Qe4",
          coach: [
            {
              id: "l9-qe4-blue",
              color: "blue",
              title: "The idea",
              text: "The queen stays central and supports e5. White has a big space advantage.",
              shapes: [c("e4"), c("e5")],
            },
          ],
        },
      ],
    },
    {
      id: "fianchetto-g6",
      name: "Fianchetto vs ...g6 / King's Indian",
      eco: "A15",
      side: "white",
      summary:
        "Against a King's Indian setup White builds the signature wall: Nc3, g3, Bg2, d4, Nf3, O-O. One plan covers several move orders.",
      tags: ["Fianchetto", "King's Indian", "Main line"],
      moves: [
        { san: "c4" },
        { san: "Nf6" },
        { san: "Nc3" },
        { san: "g6" },
        { san: "g3" },
        { san: "Bg7" },
        { san: "Bg2" },
        { san: "O-O" },
        {
          san: "d4",
          coach: [
            {
              id: "l10-d4-green",
              color: "green",
              title: "Why now?",
              text: "White takes the centre while Black fianchettoes. The c4 and d4 pawns clamp d5 and e5.",
              shapes: [c("d4"), c("c4"), c("d5"), c("e5")],
            },
          ],
        },
        { san: "d6" },
        { san: "Nf3" },
        { san: "Nbd7" },
        {
          san: "O-O",
          coach: [
            {
              id: "l10-oo-blue",
              color: "blue",
              title: "The idea",
              text: "King safety first. Then White can expand with b4 or e4 depending on Black's setup.",
              shapes: [c("g1"), c("f1"), c("b4"), c("e4")],
            },
          ],
        },
        { san: "e5" },
        {
          san: "d5",
          coach: [
            {
              id: "l10-d5-green",
              color: "green",
              title: "Why now?",
              text: "Close the centre and gain space. The game will shift to the wings, where White's bishop pair can work.",
              shapes: [c("d5"), c("c4"), c("e4")],
            },
          ],
        },
      ],
    },
    {
      id: "anglo-indian-e6",
      name: "Anglo-Indian: ...e6 and ...d5",
      eco: "A13",
      side: "white",
      summary:
        "When Black plays a quiet ...e6/...d5 setup, White switches to a classical centre and develops the bishop actively.",
      tags: ["Anglo-Indian", "Classical", "Positional"],
      moves: [
        { san: "c4" },
        { san: "Nf6" },
        { san: "Nc3" },
        { san: "e6" },
        { san: "Nf3" },
        { san: "d5" },
        {
          san: "d4",
          coach: [
            {
              id: "l11-d4-green",
              color: "green",
              title: "Why now?",
              text: "White builds a classical centre; Black's ...d5 is met by d4.",
              shapes: [c("d4"), c("d5"), c("c4")],
            },
          ],
        },
        { san: "Be7" },
        {
          san: "Bf4",
          coach: [
            {
              id: "l11-bf4-blue",
              color: "blue",
              title: "The idea",
              text: "The bishop develops outside the pawn chain and eyes c7 and e5.",
              shapes: [c("f4"), c("c7"), c("e5")],
            },
          ],
        },
        { san: "O-O" },
        { san: "e3" },
        { san: "c5" },
        {
          san: "dxc5",
          coach: [
            {
              id: "l11-dxc5-green",
              color: "green",
              title: "Why now?",
              text: "Take on c5 to open the position before Black completes development.",
              shapes: [c("d4"), c("c5")],
            },
          ],
        },
        { san: "Bxc5" },
      ],
    },
    {
      id: "anglo-scandinavian",
      name: "Anglo-Scandinavian: ...Qd8",
      eco: "A10",
      side: "white",
      summary:
        "Black strikes with 1...d5. White takes on d5 and gains time chasing the queen with Nc3, then builds a big centre.",
      tags: ["Anglo-Scandinavian", "Classical", "Main line"],
      moves: [
        { san: "c4" },
        { san: "d5" },
        {
          san: "cxd5",
          coach: [
            {
              id: "l12-cxd5-green",
              color: "green",
              title: "Why now?",
              text: "Take on d5 and pull the queen out early. Black's queen will become a target.",
              shapes: [c("c4"), c("d5")],
            },
          ],
        },
        { san: "Qxd5" },
        {
          san: "Nc3",
          coach: [
            {
              id: "l12-nc3-blue",
              color: "blue",
              title: "The idea",
              text: "The knight attacks the queen and gains a tempo for development.",
              shapes: [c("c3"), c("d5"), a("c3", "d5")],
            },
          ],
        },
        { san: "Qd8" },
        { san: "Nf3" },
        { san: "Nf6" },
        { san: "d4" },
        { san: "e6" },
        {
          san: "e4",
          coach: [
            {
              id: "l12-e4-green",
              color: "green",
              title: "Why now?",
              text: "White builds a big classical centre with pawns on d4 and e4.",
              shapes: [c("d4"), c("e4")],
            },
          ],
        },
        { san: "Be7" },
        {
          san: "Bd3",
          coach: [
            {
              id: "l12-bd3-blue",
              color: "blue",
              title: "The idea",
              text: "The bishop points at h7 and supports the e4-pawn.",
              shapes: [c("d3"), c("h7"), c("e4")],
            },
          ],
        },
        { san: "O-O" },
      ],
    },
    {
      id: "anglo-scandinavian-qa5",
      name: "Anglo-Scandinavian: ...Qa5",
      eco: "A10",
      side: "white",
      summary:
        "Black sidesteps the queen to a5. White develops, meets ...c5 with Ne4, and wins a pawn on c5 after the bishop trade.",
      tags: ["Anglo-Scandinavian", "Classical", "Sideline"],
      moves: [
        { san: "c4" },
        { san: "d5" },
        { san: "cxd5" },
        { san: "Qxd5" },
        { san: "Nc3" },
        { san: "Qa5" },
        {
          san: "Nf3",
          coach: [
            {
              id: "l13-nf3-blue",
              color: "blue",
              title: "The idea",
              text: "Ignore the queen's sidestep and develop. The queen on a5 looks active but is short of good squares.",
              shapes: [c("f3"), c("a5"), c("d4")],
            },
          ],
        },
        { san: "Nf6" },
        { san: "d4" },
        { san: "e6" },
        { san: "Bd2" },
        { san: "c5" },
        {
          san: "Ne4",
          coach: [
            {
              id: "l13-ne4-blue",
              color: "blue",
              title: "The idea",
              text: "The knight hops to e4, hitting c5 and d6. The queen on a5 is suddenly short of good squares.",
              shapes: [c("e4"), c("c5"), c("d6"), c("a5")],
            },
          ],
        },
        { san: "Qd8" },
        {
          san: "Nxc5",
          coach: [
            {
              id: "l13-nxc5-green",
              color: "green",
              title: "The tactic",
              text: "The knight takes c5. After ...Bxc5, dxc5 leaves White a pawn up with Black's bishop pair broken.",
              shapes: [c("c5"), c("d4"), c("c4"), c("b5")],
            },
          ],
        },
        { san: "Bxc5" },
        { san: "dxc5" },
        { san: "O-O" },
      ],
    },
    {
      id: "english-vs-e6",
      name: "English vs 1...e6",
      eco: "A13",
      side: "white",
      summary:
        "A Queen's Gambit-style structure with the c4-pawn already committed. White develops the bishop actively and opens the centre.",
      tags: ["Classical", "Queen's Gambit structure", "Positional"],
      moves: [
        { san: "c4" },
        { san: "e6" },
        { san: "Nc3" },
        { san: "d5" },
        {
          san: "d4",
          coach: [
            {
              id: "l14-d4-green",
              color: "green",
              title: "Why now?",
              text: "White meets ...d5 with d4, reaching a Queen's Gambit-like structure with the c4-pawn already committed.",
              shapes: [c("d4"), c("d5"), c("c4")],
            },
          ],
        },
        { san: "Nf6" },
        { san: "Nf3" },
        { san: "Be7" },
        {
          san: "Bf4",
          coach: [
            {
              id: "l14-bf4-blue",
              color: "blue",
              title: "The idea",
              text: "Develop the bishop actively before e3 locks it in.",
              shapes: [c("f4"), c("e3")],
            },
          ],
        },
        { san: "O-O" },
        { san: "e3" },
        { san: "c5" },
        {
          san: "dxc5",
          coach: [
            {
              id: "l14-dxc5-green",
              color: "green",
              title: "Why now?",
              text: "Trade on c5 to open the centre. Black recaptures, but White has a comfortable game.",
              shapes: [c("d4"), c("c5")],
            },
          ],
        },
        { san: "Bxc5" },
      ],
    },
    {
      id: "english-vs-c6",
      name: "English vs 1...c6",
      eco: "A11",
      side: "white",
      summary:
        "Black prepares ...d5 with ...c6. White builds a solid pawn chain and fianchettoes the bishop to fight for the long diagonal.",
      tags: ["Slav structure", "Positional", "Slow build"],
      moves: [
        { san: "c4" },
        { san: "c6" },
        { san: "Nf3" },
        { san: "d5" },
        { san: "e3" },
        { san: "Nf6" },
        { san: "Nc3" },
        { san: "e6" },
        {
          san: "b3",
          coach: [
            {
              id: "l15-b3-blue",
              color: "blue",
              title: "The idea",
              text: "b3 prepares Bb2. The bishop will support the centre and, once the c3-knight moves, rake the long diagonal.",
              shapes: [c("b3"), c("b2"), c("c3"), c("g7")],
            },
          ],
        },
        { san: "Bd6" },
        {
          san: "Bb2",
          coach: [
            {
              id: "l15-bb2-green",
              color: "green",
              title: "Why now?",
              text: "The bishop takes the long diagonal. Black must keep an eye on g7.",
              shapes: [c("b2"), c("g7"), c("c3")],
            },
          ],
        },
        { san: "O-O" },
      ],
    },
    {
      id: "english-vs-g6",
      name: "English vs 1...g6",
      eco: "A10",
      side: "white",
      summary:
        "The same fianchetto wall as the King's Indian line, just one move earlier. A single plan covers both move orders.",
      tags: ["Fianchetto", "King's Indian", "Positional"],
      moves: [
        { san: "c4" },
        { san: "g6" },
        { san: "Nc3" },
        { san: "Bg7" },
        {
          san: "g3",
          coach: [
            {
              id: "l16-g3-blue",
              color: "blue",
              title: "The idea",
              text: "The fianchetto setup: the g2-bishop will pressure d5 and control the long diagonal.",
              shapes: [c("g3"), c("g2"), c("d5")],
            },
          ],
        },
        { san: "Nf6" },
        { san: "Bg2" },
        { san: "O-O" },
        {
          san: "d4",
          coach: [
            {
              id: "l16-d4-green",
              color: "green",
              title: "Why now?",
              text: "White takes the centre while Black fianchettoes. The c4 and d4 pawns clamp d5 and e5.",
              shapes: [c("d4"), c("c4"), c("d5"), c("e5")],
            },
          ],
        },
        { san: "d6" },
        { san: "Nf3" },
        { san: "Nbd7" },
        {
          san: "O-O",
          coach: [
            {
              id: "l16-oo-blue",
              color: "blue",
              title: "The idea",
              text: "King safety first. Then White can expand with b4 or e4.",
              shapes: [c("g1"), c("f1"), c("b4"), c("e4")],
            },
          ],
        },
        { san: "e5" },
        {
          san: "d5",
          coach: [
            {
              id: "l16-d5-green",
              color: "green",
              title: "Why now?",
              text: "Close the centre and gain space. The game shifts to the wings.",
              shapes: [c("d5"), c("c4"), c("e4")],
            },
          ],
        },
      ],
    },
    {
      id: "english-vs-f5",
      name: "English vs 1...f5",
      eco: "A10",
      side: "white",
      summary:
        "Against a Dutch-style setup White still builds the fianchetto, then strikes in the centre before Black can commit to ...e5 or ...f4.",
      tags: ["Dutch structure", "Fianchetto", "Positional"],
      moves: [
        { san: "c4" },
        { san: "f5" },
        { san: "Nc3" },
        { san: "Nf6" },
        {
          san: "g3",
          coach: [
            {
              id: "l17-g3-blue",
              color: "blue",
              title: "The idea",
              text: "Against the Dutch setup White still builds the fianchetto. The g2-bishop will control the long diagonal and support e4 and d5.",
              shapes: [c("g3"), c("g2"), c("e4"), c("d5")],
            },
          ],
        },
        { san: "e6" },
        { san: "Bg2" },
        { san: "Be7" },
        { san: "Nf3" },
        { san: "O-O" },
        { san: "O-O" },
        { san: "d6" },
        {
          san: "d4",
          coach: [
            {
              id: "l17-d4-green",
              color: "green",
              title: "Why now?",
              text: "White strikes in the centre before Black can play ...e5 or ...f4.",
              shapes: [c("d4"), c("e5"), c("f4")],
            },
          ],
        },
      ],
    },
    {
      id: "english-vs-nc6",
      name: "English vs 1...Nc6",
      eco: "A10",
      side: "white",
      summary:
        "A flexible reply. White takes the d5 and e4 squares, keeps the centre closed and chooses the right pawn break later.",
      tags: ["Sideline", "Flexible", "Positional"],
      moves: [
        { san: "c4" },
        { san: "Nc6" },
        {
          san: "Nc3",
          coach: [
            {
              id: "l18-nc3-blue",
              color: "blue",
              title: "The idea",
              text: "White takes the d5 and e4 squares and waits to see Black's setup.",
              shapes: [c("c3"), c("d5"), c("e4")],
            },
          ],
        },
        { san: "e5" },
        { san: "g3" },
        { san: "g6" },
        { san: "Bg2" },
        { san: "Bg7" },
        { san: "Nf3" },
        { san: "d6" },
        { san: "O-O" },
        { san: "f5" },
        {
          san: "d3",
          coach: [
            {
              id: "l18-d3-blue",
              color: "blue",
              title: "The idea",
              text: "A flexible move. White keeps the centre closed and prepares b4 or e4.",
              shapes: [c("d3"), c("b4"), c("e4")],
            },
          ],
        },
      ],
    },
    {
      id: "four-knights-g3",
      name: "Four Knights with 4.g3",
      eco: "A28",
      side: "white",
      summary:
        "A fianchetto version of the Four Knights. Black grabs space with ...e4, and White's knight finds a strong post on g5.",
      tags: ["King's English", "Fianchetto", "Main line"],
      moves: [
        { san: "c4" },
        { san: "e5" },
        { san: "Nc3" },
        { san: "Nf6" },
        { san: "Nf3" },
        { san: "Nc6" },
        {
          san: "g3",
          coach: [
            {
              id: "l19-g3-blue",
              color: "blue",
              title: "The idea",
              text: "The fianchetto setup. The g2-bishop will pressure d5 and the long diagonal.",
              shapes: [c("g3"), c("g2"), c("d5")],
            },
          ],
        },
        { san: "Bb4" },
        { san: "Bg2" },
        { san: "O-O" },
        { san: "O-O" },
        { san: "e4" },
        {
          san: "Ng5",
          coach: [
            {
              id: "l19-ng5-green",
              color: "green",
              title: "Why now?",
              text: "The knight jumps to g5, attacking e4 and eyeing f7 and h7.",
              shapes: [c("g5"), c("e4"), c("f7"), c("h7")],
            },
          ],
        },
        { san: "Bxc3" },
        {
          san: "bxc3",
          coach: [
            {
              id: "l19-bxc3-blue",
              color: "blue",
              title: "The idea",
              text: "Recapture and keep the centre. The b-file may open for the rook.",
              shapes: [c("b2"), c("c3"), c("b1")],
            },
          ],
        },
        { san: "Re8" },
      ],
    },
    {
      id: "botvinnik-system",
      name: "Botvinnik System",
      eco: "A36",
      side: "white",
      summary:
        "A different plan for the same first move: pawns on c4, e4 and d3 behind g3 and Bg2. White gets a big, safe centre.",
      tags: ["Botvinnik", "Space", "Main line"],
      moves: [
        { san: "c4" },
        { san: "e5" },
        { san: "Nc3" },
        { san: "Nf6" },
        { san: "g3" },
        { san: "Bb4" },
        { san: "Bg2" },
        { san: "O-O" },
        {
          san: "e4",
          coach: [
            {
              id: "l20-e4-blue",
              color: "blue",
              title: "The idea",
              text: "The Botvinnik System: White builds a big pawn centre with c4, e4 and a later d3.",
              shapes: [c("e4"), c("c4"), c("d3")],
            },
          ],
        },
        { san: "d6" },
        {
          san: "Nge2",
          coach: [
            {
              id: "l20-nge2-green",
              color: "green",
              title: "Why now?",
              text: "The knight goes to e2 so it can support d4 or f4 without blocking the f-pawn.",
              shapes: [c("g1"), c("e2"), c("d4"), c("f4")],
            },
          ],
        },
        { san: "c6" },
        {
          san: "O-O",
          coach: [
            {
              id: "l20-oo-blue",
              color: "blue",
              title: "The idea",
              text: "King safety first. Then White expands with f4 or d4.",
              shapes: [c("g1"), c("f1"), c("f4"), c("d4")],
            },
          ],
        },
      ],
    },
  ],
};

export const englishOpening = attachIdeas(englishBaseOpening, englishIdeas);
