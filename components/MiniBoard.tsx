const FILES = "abcdefgh";

const GLYPHS: Record<string, string> = {
  p: "♟",
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛",
  k: "♚",
  P: "♙",
  N: "♘",
  B: "♗",
  R: "♖",
  Q: "♕",
  K: "♔",
};

type Cell = {
  square: string;
  piece: string | null;
  dark: boolean;
};

function parseFen(fen: string): Cell[] {
  const placement = fen.split(" ")[0];
  const rows = placement.split("/");
  const cells: Cell[] = [];

  rows.forEach((row, rowIndex) => {
    let file = 0;
    for (const char of row) {
      if (/\d/.test(char)) {
        const empty = Number(char);
        for (let i = 0; i < empty; i += 1) {
          const square = `${FILES[file]}${8 - rowIndex}`;
          cells.push({
            square,
            piece: null,
            dark: (file + rowIndex) % 2 === 1,
          });
          file += 1;
        }
      } else {
        const square = `${FILES[file]}${8 - rowIndex}`;
        cells.push({
          square,
          piece: char,
          dark: (file + rowIndex) % 2 === 1,
        });
        file += 1;
      }
    }
  });

  return cells;
}

export function MiniBoard({
  fen,
  orientation = "white",
  label,
}: {
  fen: string;
  orientation?: "white" | "black";
  label: string;
}) {
  const cells = parseFen(fen);
  const ordered = orientation === "white" ? cells : [...cells].reverse();

  return (
    <div className="mini-board" role="img" aria-label={label}>
      {ordered.map((cell, index) => (
        <div
          key={`${cell.square}-${index}`}
          className={`mini-square${cell.dark ? " is-dark" : " is-light"}`}
        >
          {cell.piece ? (
            <span
              className={`mini-piece${cell.piece === cell.piece.toUpperCase() ? " is-white" : " is-black"}`}
            >
              {GLYPHS[cell.piece]}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
