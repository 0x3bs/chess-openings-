"use client";

import { useEffect, useMemo, useRef } from "react";
import { Chessground } from "@lichess-org/chessground";
import type { Api } from "@lichess-org/chessground/api";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Key } from "@lichess-org/chessground/types";
import "@lichess-org/chessground/assets/chessground.base.css";
import "@lichess-org/chessground/assets/chessground.brown.css";
import "@lichess-org/chessground/assets/chessground.cburnett.css";

export type ChessBoardProps = {
  fen: string;
  orientation?: "white" | "black";
  shapes?: DrawShape[];
  viewOnly?: boolean;
  movableColor?: "white" | "black" | "both";
  dests?: Map<string, string[]>;
  lastMove?: [string, string] | null;
  onMove?: (from: string, to: string) => void;
  /** Change this to force the board back to `fen` (used after a wrong move). */
  positionKey?: string;
};

const EMPTY_DESTS = new Map<string, string[]>();

export function ChessBoard({
  fen,
  orientation = "white",
  shapes,
  viewOnly = true,
  movableColor = "white",
  dests = EMPTY_DESTS,
  lastMove,
  onMove,
  positionKey,
}: ChessBoardProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<Api | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const lastMoveFrom = lastMove?.[0];
  const lastMoveTo = lastMove?.[1];
  const lastMoveKeys = useMemo(
    () =>
      lastMoveFrom && lastMoveTo
        ? ([lastMoveFrom as Key, lastMoveTo as Key] as Key[])
        : undefined,
    [lastMoveFrom, lastMoveTo],
  );

  // Chessground tracks the side to move separately from the FEN, and it does
  // not reset it when a new FEN is set. Keep it in sync or the board can end
  // up stuck on Black's turn after a rejected move.
  const turnColor: "white" | "black" =
    fen.split(" ")[1] === "b" ? "black" : "white";

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Chessground only binds input listeners when it is first created, so the
    // board must always start interactive. Read-only states are enforced below
    // through `selectable` / `draggable` / empty destinations.
    const api = Chessground(element, {
      fen,
      orientation,
      turnColor,
      viewOnly: false,
      coordinates: true,
      animation: { enabled: true, duration: 180 },
      highlight: { lastMove: true, check: true },
      lastMove: lastMoveKeys,
      selectable: { enabled: !viewOnly },
      draggable: { enabled: !viewOnly },
      premovable: { enabled: false },
      predroppable: { enabled: false },
      drawable: {
        enabled: true,
        visible: true,
        brushes: {
          blue: { key: "blue", color: "#3b82f6", opacity: 0.9, lineWidth: 11 },
          green: { key: "green", color: "#22c55e", opacity: 0.9, lineWidth: 11 },
          orange: { key: "orange", color: "#f97316", opacity: 0.9, lineWidth: 11 },
          red: { key: "red", color: "#ef4444", opacity: 0.9, lineWidth: 11 },
          yellow: { key: "yellow", color: "#eab308", opacity: 0.9, lineWidth: 11 },
        },
      },
      movable: {
        free: false,
        color: viewOnly ? "white" : movableColor,
        dests: (dests as unknown as Map<Key, Key[]>) ?? EMPTY_DESTS,
        showDests: !viewOnly,
        events: {
          after: (from, to) => onMoveRef.current?.(from, to),
        },
      },
    });

    apiRef.current = api;
    return () => {
      api.destroy();
      apiRef.current = null;
    };
    // The board is created once. All later updates go through api.set below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Position + interactivity updates.
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;

    api.set({
      fen,
      orientation,
      turnColor,
      lastMove: lastMoveKeys,
      selectable: { enabled: !viewOnly },
      draggable: { enabled: !viewOnly },
      premovable: { enabled: false },
      predroppable: { enabled: false },
      movable: {
        free: false,
        color: viewOnly ? "white" : movableColor,
        dests: (viewOnly ? EMPTY_DESTS : (dests ?? EMPTY_DESTS)) as unknown as Map<
          Key,
          Key[]
        >,
        showDests: !viewOnly,
        events: {
          after: (from, to) => onMoveRef.current?.(from, to),
        },
      },
    });

    // `set` re-applies any selection that existed before the new FEN, and a
    // stale selection ring can otherwise survive because chessground only
    // redraws lazily. Clear it, then force the square classes to match.
    api.selectSquare(null);
    api.redrawAll();
  }, [fen, orientation, viewOnly, movableColor, dests, lastMoveKeys, positionKey]);

  // Coach highlights. Re-applied after every fen change because chessground
  // clears user shapes when a new fen is loaded.
  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;
  const shapesKey = JSON.stringify(shapes ?? []);
  useEffect(() => {
    apiRef.current?.setShapes((shapesRef.current ?? []) as DrawShape[]);
  }, [shapesKey, fen, positionKey]);

  return <div ref={elementRef} className="cg-wrap chess-board" />;
}
