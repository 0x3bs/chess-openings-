"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Key } from "@lichess-org/chessground/types";
import { ChessBoard } from "./ChessBoard";
import { CoachPanel } from "./CoachPanel";
import { IdeaText } from "./IdeaText";
import { LocaleLink as Link } from "./LocaleLink";
import { WeekStreak } from "./WeekStreak";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { fill } from "@/lib/i18n/plural";
import { buildPositions, legalDests, sanForMove } from "@/lib/chess";
import type {
  CoachPoint,
  MoveIdea,
  Opening,
  TextHotspot,
} from "@/lib/openings/types";
import {
  completedOf,
  dayStreak,
  isDue,
  learnedOf,
  masteryOf,
  recordResult,
  recordTrainingDay,
  type ProgressStore,
  type TrainingStats,
} from "@/lib/progress";
import {
  loadRemoteProgress,
  loadRemoteStats,
  saveRemoteLine,
} from "@/lib/db/progress";

type Mode = "learn" | "train" | "drill" | "exam";
type DrillScope = "due" | "mix" | "line";

type Feedback = {
  type: "ok" | "bad" | "info";
  text: string;
};

type DrillResult = {
  lineId: string;
  name: string;
  mistakes: number;
  hints: number;
  clean: boolean;
};

const EMPTY_DESTS = new Map<string, string[]>();

const BOARD_SIZE_KEY = "chess-coach-board-size";
const BOARD_SIZE_DEFAULT = 460;
const BOARD_SIZE_MIN = 280;
const BOARD_SIZE_MAX = 640;
const BOARD_SIZE_STEP = 20;

function clampBoardSize(value: number): number {
  if (!Number.isFinite(value)) return BOARD_SIZE_DEFAULT;
  return Math.min(BOARD_SIZE_MAX, Math.max(BOARD_SIZE_MIN, Math.round(value)));
}

function toDrawShapes(point: CoachPoint): DrawShape[] {
  return point.shapes.map((shape) =>
    shape.kind === "circle"
      ? { orig: shape.square as Key, brush: point.color }
      : { orig: shape.from as Key, dest: shape.to as Key, brush: point.color },
  );
}

function ideaShapes(idea: MoveIdea | null): DrawShape[] {
  if (!idea) return [];
  return idea.shapes.map((shape) =>
    shape.kind === "circle"
      ? { orig: shape.square as Key, brush: "blue" }
      : { orig: shape.from as Key, dest: shape.to as Key, brush: "blue" },
  );
}

function hotspotShapes(hotspot: TextHotspot | null): DrawShape[] {
  if (!hotspot) return [];
  return hotspot.shapes.map((shape) =>
    shape.kind === "circle"
      ? { orig: shape.square as Key, brush: "blue" }
      : { orig: shape.from as Key, dest: shape.to as Key, brush: "blue" },
  );
}

function plyLabel(ply: number): string {
  const number = Math.ceil(ply / 2);
  return ply % 2 === 1 ? `${number}.` : `${number}...`;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function EnglishCourse({ opening }: { opening: Opening }) {
  const { m, p } = useI18n();
  const [selectedId, setSelectedId] = useState(opening.lines[0]?.id ?? "");
  const line = useMemo(
    () =>
      opening.lines.find((item) => item.id === selectedId) ?? opening.lines[0],
    [opening.lines, selectedId],
  );

  const positions = useMemo(() => buildPositions(line), [line]);
  const totalPlies = line.moves.length;
  const userIsWhite = line.side === "white";
  const opponentName = userIsWhite ? m.common.black : m.common.white;
  const userSideName = userIsWhite ? m.common.white : m.common.black;

  const [mode, setMode] = useState<Mode>("learn");
  const [ply, setPly] = useState(0);
  const isUserTurn = userIsWhite ? ply % 2 === 0 : ply % 2 === 1;
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeHotspot, setActiveHotspot] = useState<TextHotspot | null>(null);
  const [showDeepNotes, setShowDeepNotes] = useState(false);
  const [filter, setFilter] = useState("");
  const [progress, setProgress] = useState<ProgressStore>({});
  const [progressReady, setProgressReady] = useState(false);
  const [stats, setStats] = useState<TrainingStats>({ days: [], sessions: 0 });
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [hints, setHints] = useState(0);
  const [hintedPlies, setHintedPlies] = useState<Set<number>>(new Set());
  const [hintOpen, setHintOpen] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [lastRunClean, setLastRunClean] = useState(false);
  const [syncToken, setSyncToken] = useState(0);
  const [boardSize, setBoardSize] = useState(BOARD_SIZE_DEFAULT);

  const [drillQueue, setDrillQueue] = useState<string[]>([]);
  const [drillIndex, setDrillIndex] = useState(0);
  const [drillResults, setDrillResults] = useState<DrillResult[]>([]);
  const [drillFinished, setDrillFinished] = useState(false);

  const recordedRef = useRef(false);
  const pendingPlyRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const pickerRef = useRef<HTMLDetailsElement | null>(null);
  const progressRef = useRef(progress);
  const statsRef = useRef(stats);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(BOARD_SIZE_KEY);
      if (raw !== null) setBoardSize(clampBoardSize(Number(raw)));
    } catch {
      // A blocked localStorage only means the default size is used.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(BOARD_SIZE_KEY, String(boardSize));
    } catch {
      // ignore
    }
  }, [boardSize]);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([loadRemoteProgress(), loadRemoteStats()]).then(
      ([remoteProgress, remoteStats]) => {
        if (cancelled) return;
        setProgress(remoteProgress);
        setStats(remoteStats);
        setProgressReady(true);
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const resetAttempt = useCallback(() => {
    setPly(0);
    setMistakes(0);
    setHints(0);
    setHintedPlies(new Set());
    setHintOpen(false);
    setFeedback(null);
    setCompleted(false);
    setLastRunClean(false);
    setSyncToken(0);
    setActiveNoteId(null);
    setActiveHotspot(null);
    recordedRef.current = false;
  }, []);

  // A new line or a new mode always starts from the beginning.
  useEffect(() => {
    resetAttempt();
  }, [line.id, mode, resetAttempt]);

  // Jumping to a move sets the target after the mode reset.
  useEffect(() => {
    if (mode !== "learn" || pendingPlyRef.current === null) return;
    const target = pendingPlyRef.current;
    pendingPlyRef.current = null;
    setPly(target);
  }, [mode]);

  useEffect(() => {
    setActiveNoteId(null);
    setActiveHotspot(null);
  }, [ply]);

  // On a small screen the completion card sits below the board. Bring it into
  // view instead of leaving the learner staring at the final position.
  useEffect(() => {
    if (!completed) return;
    const timer = window.setTimeout(() => {
      document
        .querySelector(".study-complete")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [completed, drillFinished]);

  const clearDrill = useCallback(() => {
    setDrillQueue([]);
    setDrillIndex(0);
    setDrillResults([]);
    setDrillFinished(false);
  }, []);

  const selectLine = useCallback(
    (id: string) => {
      pickerRef.current?.removeAttribute("open");
      setSelectedId(id);
      clearDrill();
      setMode("learn");
      resetAttempt();
    },
    [clearDrill, resetAttempt],
  );

  const scrollToBoard = useCallback(() => {
    window.requestAnimationFrame(() => {
      document
        .querySelector(".study-stage")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const practiceLine = useCallback(
    (id: string) => {
      setSelectedId(id);
      clearDrill();
      setMode("train");
      resetAttempt();
      scrollToBoard();
    },
    [clearDrill, resetAttempt, scrollToBoard],
  );

  const buildDrillQueue = useCallback(
    (scope: DrillScope): string[] => {
      if (scope === "line") return [line.id];

      const now = Date.now();
      const due: string[] = [];
      const fresh: string[] = [];
      const rest: string[] = [];

      for (const item of opening.lines) {
        const entry = progress[item.id];
        if (!entry) fresh.push(item.id);
        else if (new Date(entry.dueAt).getTime() <= now) due.push(item.id);
        else rest.push(item.id);
      }

      const ordered = [...shuffle(due), ...shuffle(fresh), ...shuffle(rest)].slice(
        0,
        8,
      );

      if (scope === "due" && due.length > 0) {
        return ordered.slice(0, Math.min(8, Math.max(3, due.length)));
      }
      return ordered;
    },
    [opening.lines, progress, line.id],
  );

  const startDrill = useCallback(
    (scope: DrillScope = "mix") => {
      const queue = buildDrillQueue(scope);
      if (!queue.length) return;
      setDrillQueue(queue);
      setDrillIndex(0);
      setDrillResults([]);
      setDrillFinished(false);
      setMode("drill");
      setSelectedId(queue[0]);
      resetAttempt();
    },
    [buildDrillQueue, resetAttempt],
  );

  const startDrillFromToolbar = useCallback(
    (scope: DrillScope) => {
      startDrill(scope);
      scrollToBoard();
    },
    [startDrill, scrollToBoard],
  );

  const startExam = useCallback(() => {
    const finished = opening.lines
      .filter((item) => completedOf(progress[item.id]))
      .map((item) => item.id);

    if (!finished.length) {
      setFeedback({ type: "info", text: m.course.examNeedsFinished });
      setMode("learn");
      return;
    }

    const queue = shuffle(finished);
    setDrillQueue(queue);
    setDrillIndex(0);
    setDrillResults([]);
    setDrillFinished(false);
    setMode("exam");
    setSelectedId(queue[0]);
    resetAttempt();
    scrollToBoard();
  }, [opening.lines, progress, resetAttempt, scrollToBoard]);

  const advanceDrill = useCallback(() => {
    const nextIndex = drillIndex + 1;
    if (nextIndex >= drillQueue.length) {
      setDrillFinished(true);
      return;
    }
    setDrillIndex(nextIndex);
    setSelectedId(drillQueue[nextIndex]);
    setPly(0);
    setMistakes(0);
    setHints(0);
    setHintedPlies(new Set());
    setHintOpen(false);
    setFeedback(null);
    setCompleted(false);
    setLastRunClean(false);
    setActiveNoteId(null);
    recordedRef.current = false;
  }, [drillIndex, drillQueue]);

  const jumpToPly = useCallback(
    (target: number) => {
      if (mode === "learn") {
        setPly(target);
        return;
      }
      if (mode === "drill" || mode === "exam") clearDrill();
      pendingPlyRef.current = target;
      setMode("learn");
    },
    [mode, clearDrill],
  );

  const nextPracticeLine = useCallback(() => {
    const index = opening.lines.findIndex((item) => item.id === line.id);
    const next = opening.lines[(index + 1) % opening.lines.length];
    if (!next) return;
    setSelectedId(next.id);
    setMode("train");
    resetAttempt();
  }, [opening.lines, line.id, resetAttempt]);

  // The opponent's replies are played automatically while training, drilling
  // or sitting an exam.
  useEffect(() => {
    if (mode !== "train" && mode !== "drill" && mode !== "exam") return;
    if (completed) return;
    if (ply >= totalPlies) return;
    if (isUserTurn) return;

    const replyMove = line.moves[ply];
    const timer = window.setTimeout(() => {
      setPly((current) => (current === ply ? current + 1 : current));
      setFeedback({
        type: "info",
        text: fill(m.course.feedbackOpponent, {
          opponent: opponentName,
          san: replyMove.san,
        }),
      });
    }, 620);

    return () => window.clearTimeout(timer);
  }, [mode, ply, completed, line, totalPlies, isUserTurn, opponentName]);

  // Finish the attempt once every move has been played.
  useEffect(() => {
    if (mode !== "train" && mode !== "drill" && mode !== "exam") return;
    if (completed) return;
    if (ply < totalPlies) return;

    const clean = mistakes === 0 && hints === 0;
    setCompleted(true);
    setLastRunClean(clean);

    if (recordedRef.current) return;
    recordedRef.current = true;

    const next = recordResult(
      line.id,
      { mistakes, hints },
      progressRef.current,
    );
    progressRef.current = next;
    setProgress(next);
    const nextStats = recordTrainingDay(statsRef.current);
    statsRef.current = nextStats;
    setStats(nextStats);
    void saveRemoteLine(next[line.id]);

    if (mode === "drill" || mode === "exam") {
      setDrillResults((previous) => [
        ...previous,
        {
          lineId: line.id,
          name: line.name,
          mistakes,
          hints,
          clean,
        },
      ]);
      if (drillIndex >= drillQueue.length - 1) setDrillFinished(true);
    }
  }, [
    mode,
    ply,
    completed,
    totalPlies,
    line.id,
    line.name,
    mistakes,
    hints,
    drillIndex,
    drillQueue.length,
  ]);

  // Entry points: ?drill=due | ?drill=mix, or ?line=<id>&train=1
  useEffect(() => {
    if (!progressReady || initializedRef.current) return;
    initializedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const lineParam = params.get("line");
    const drillParam = params.get("drill");

    if (lineParam && opening.lines.some((item) => item.id === lineParam)) {
      setSelectedId(lineParam);
      setMode(params.get("train") === "1" ? "train" : "learn");
    }

    if (drillParam) {
      startDrill(drillParam === "due" ? "due" : "mix");
    }
  }, [progressReady, opening.lines, startDrill]);

  const handleMove = useCallback(
    (from: string, to: string) => {
      if (mode !== "train" && mode !== "drill" && mode !== "exam") return;
      if (completed) return;
      if (ply >= totalPlies || !isUserTurn) return;

      const expected = line.moves[ply];
      const san = sanForMove(positions[ply].fen, from, to);
      if (!san) return;

      if (san === expected.san) {
        setPly(ply + 1);
        setFeedback({
          type: "ok",
          text: fill(m.course.feedbackCorrect, { san }),
        });
        setHintOpen(false);
      } else {
        setMistakes((value) => value + 1);
        setFeedback({
          type: "bad",
          text: fill(m.course.feedbackWrong, { san }),
        });
        setSyncToken((value) => value + 1);
      }
    },
    [mode, completed, ply, totalPlies, line, positions, isUserTurn],
  );

  const current = positions[ply] ?? positions[0];
  const currentMove = current.move;
  const lastPlayedIdea = currentMove?.idea ?? null;

  const practicing = mode === "train" || mode === "drill" || mode === "exam";
  const expectedMove =
    practicing && !completed && ply < totalPlies && isUserTurn
      ? line.moves[ply]
      : null;

  const displayIdea: MoveIdea | null =
    mode === "exam" && !completed
      ? null
      : hintOpen && expectedMove
        ? (expectedMove.idea ?? null)
        : lastPlayedIdea;

  const coachPoints = useMemo<CoachPoint[]>(
    () => currentMove?.coach ?? [],
    [currentMove],
  );
  const activePoint = coachPoints.find((point) => point.id === activeNoteId) ?? null;
  const shapes = useMemo<DrawShape[]>(
    () =>
      activeHotspot
        ? hotspotShapes(activeHotspot)
        : activePoint
          ? toDrawShapes(activePoint)
          : ideaShapes(displayIdea),
    [activeHotspot, activePoint, displayIdea],
  );

  const dests = useMemo(() => {
    if (!practicing || completed || !isUserTurn || ply >= totalPlies) {
      return EMPTY_DESTS;
    }
    return legalDests(positions[ply].fen);
  }, [practicing, completed, isUserTurn, ply, totalPlies, positions]);

  const toggleHint = useCallback(() => {
    if (!expectedMove) return;
    if (!hintOpen) {
      if (!hintedPlies.has(ply)) {
        setHints((value) => value + 1);
        setHintedPlies((previous) => new Set(previous).add(ply));
      }
      setHintOpen(true);
    } else {
      setHintOpen(false);
    }
  }, [expectedMove, hintOpen, hintedPlies, ply]);

  const playExpected = useCallback(() => {
    if (!expectedMove) return;
    setHints((value) => value + 1);
    setHintedPlies((previous) => new Set(previous).add(ply));
    setPly((value) => value + 1);
    setFeedback({
      type: "info",
      text: fill(m.course.feedbackCoach, { san: expectedMove.san }),
    });
    setHintOpen(false);
  }, [expectedMove, ply]);

  // Arrow keys make learning mode pleasant.
  useEffect(() => {
    if (mode !== "learn") return;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setPly((value) => Math.max(0, value - 1));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setPly((value) => Math.min(totalPlies, value + 1));
      } else if (event.key === "Home") {
        event.preventDefault();
        setPly(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setPly(totalPlies);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, totalPlies]);

  const learned = opening.lines.filter((item) =>
    learnedOf(progress[item.id]),
  ).length;
  const finished = opening.lines.filter((item) =>
    completedOf(progress[item.id]),
  ).length;
  const dueCount = opening.lines.filter((item) => isDue(progress[item.id])).length;
  const streak = dayStreak(stats);
  const lineLearned = learnedOf(progress[line.id]);
  const lineFinished = completedOf(progress[line.id]);
  const lineIndex = opening.lines.findIndex((item) => item.id === line.id);
  const coursePct = opening.lines.length
    ? Math.round((learned / opening.lines.length) * 100)
    : 0;
  const nextLine = lineFinished
    ? (opening.lines[(lineIndex + 1) % Math.max(1, opening.lines.length)] ??
      line)
    : line;

  const query = filter.trim().toLowerCase();
  const filteredLines = useMemo(() => {
    if (!query) return opening.lines;
    return opening.lines.filter((item) =>
      `${item.name} ${item.eco} ${item.summary} ${item.tags.join(" ")}`
        .toLowerCase()
        .includes(query),
    );
  }, [opening.lines, query]);

  const boardViewOnly = mode === "learn" || completed || !isUserTurn;
  const positionKey = `${current.fen}:${syncToken}`;

  const ideaHeading =
    mode === "exam" && !completed
      ? m.course.playFromMemory
      : hintOpen && expectedMove
        ? fill(m.course.hintHeading, { san: expectedMove.san })
        : currentMove
          ? `${plyLabel(ply)} ${currentMove.san}`
          : m.course.startHere;

  const ideaKicker =
    mode === "exam" && !completed
      ? m.course.kickerExam
      : hintOpen && expectedMove
        ? m.course.kickerHint
        : currentMove
          ? m.course.kickerIdea
          : m.course.kickerAbout;

  const statusText =
    feedback?.text ??
    (completed
      ? lastRunClean
        ? m.course.statusLearned
        : m.course.statusFinished
      : mode === "learn"
        ? m.course.statusStep
        : mode === "exam"
          ? isUserTurn
            ? fill(m.course.statusExamYourMove, { side: userSideName })
            : fill(m.course.statusOpponentReplying, {
                opponent: opponentName,
              })
          : isUserTurn
            ? fill(m.course.statusYourMove, { side: userSideName })
            : fill(m.course.statusOpponentReplying, {
                opponent: opponentName,
              }));

  const emptyIdeaText =
    mode === "exam" && !completed
      ? m.course.emptyExam
      : mode === "learn" && ply === 0
        ? line.summary
        : practicing
          ? fill(m.course.emptyFindMove, { side: userSideName })
          : m.course.emptyStep;

  const drillClean = drillResults.filter((result) => result.clean).length;
  const drillMistakes = drillResults.reduce(
    (total, result) => total + result.mistakes,
    0,
  );

  function changeMode(next: Mode) {
    if (next === "drill") {
      startDrill("mix");
      return;
    }
    if (next === "exam") {
      startExam();
      return;
    }
    if (mode === "drill" || mode === "exam") clearDrill();
    setMode(next);
  }

  return (
    <div className="study-page">
      <section className="study-hero">
        <div className="study-hero-copy">
          <Link href="/openings" className="study-back">
            {m.common.arrowBack} {m.course.back}
          </Link>
          <div className="study-title-row">
            <p className="eyebrow">
              {opening.eco} ·{" "}
              {fill(m.course.repertoire, {
                side:
                  opening.side === "white" ? m.common.white : m.common.black,
              })}
            </p>
            <span className="study-course-pill">
              {m.course.interactiveCourse}
            </span>
          </div>
          <h1>{opening.name}</h1>
          <p className="study-intro">{opening.intro}</p>
          <div className="theme-row">
            {opening.themes.map((theme) => (
              <span className="theme-chip" key={theme}>
                {theme}
              </span>
            ))}
          </div>
          <div className="study-hero-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={scrollToBoard}
            >
              {lineFinished
                ? m.course.continueLearning
                : m.course.startLearning}{" "}
              {m.common.arrowForward}
            </button>
            <span>
              {lineFinished ? m.course.nextUp : m.course.firstLesson}:{" "}
              {nextLine.name}
            </span>
          </div>
        </div>

        <aside
          className="study-progress"
          aria-label={m.course.courseProgress}
        >
          <div className="study-progress-head">
            <div>
              <span>{m.course.courseProgress}</span>
              <strong>
                {learned}
                <em>/{opening.lines.length}</em>
              </strong>
            </div>
            <span className="study-progress-pct">{coursePct}%</span>
          </div>
          <div
            className="study-progress-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={opening.lines.length}
            aria-valuenow={learned}
            aria-label={m.course.linesLearned}
          >
            <span style={{ width: `${coursePct}%` }} />
          </div>
          <p className="study-progress-note">
            {learned === 0
              ? m.course.progressEmpty
              : learned >= opening.lines.length
                ? m.course.progressDone
                : p(m.course.progressLeft, opening.lines.length - learned)}
          </p>

          <div className="study-hero-stats">
            <div>
              <strong>{learned}</strong>
              <span>{m.course.learned}</span>
            </div>
            <div>
              <strong>{finished}</strong>
              <span>{m.course.finished}</span>
            </div>
            <div>
              <strong>{dueCount}</strong>
              <span>{m.course.due}</span>
            </div>
          </div>

          <WeekStreak stats={stats} streak={streak} />
        </aside>
      </section>

      <div className="study-toolbar">
        <details className="study-picker" ref={pickerRef}>
          <summary>
            <span className="study-picker-label">{m.course.line}</span>
            <span className="study-picker-name">{line.name}</span>
            <span className="study-picker-eco">{line.eco}</span>
            <span className="study-picker-caret" aria-hidden>
              ▾
            </span>
          </summary>
          <div className="study-picker-menu">
            <input
              className="study-picker-search"
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder={m.course.searchPlaceholder}
              aria-label={m.course.searchAria}
            />
            <div className="study-picker-list">
              {filteredLines.map((item) => {
                const itemProgress = progress[item.id];
                const due = isDue(itemProgress);
                const mastery = masteryOf(itemProgress);
                const lineLearned = learnedOf(itemProgress);
                const lineFinished = completedOf(itemProgress);
                const notes = item.moves.reduce(
                  (sum, move) => sum + (move.coach?.length ?? 0),
                  0,
                );
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`study-picker-line${
                      item.id === line.id ? " is-current" : ""
                    }${lineLearned ? " is-clean" : lineFinished ? " is-finished" : ""}${
                      due ? " is-due" : ""
                    }`}
                    onClick={() => selectLine(item.id)}
                  >
                    <span className="study-picker-line-top">
                      <span>{item.name}</span>
                      <span className="study-picker-line-eco">{item.eco}</span>
                    </span>
                    <span className="study-picker-line-meta">
                      {p(m.course.deepNotesCount, notes)} ·{" "}
                      {itemProgress
                        ? due
                          ? m.course.lineStatusDue
                          : lineLearned
                            ? fill(m.course.lineStatusClean, { mastery })
                            : lineFinished
                              ? m.course.lineStatusFinished
                              : m.course.lineStatusLearning
                        : m.course.lineStatusNew}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </details>

        <div
          className="mode-tabs"
          role="tablist"
          aria-label={m.course.modeAria}
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "learn"}
            className={mode === "learn" ? "is-active" : ""}
            onClick={() => changeMode("learn")}
          >
            {m.course.modes.learn}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "train"}
            className={mode === "train" ? "is-active" : ""}
            onClick={() => changeMode("train")}
          >
            {m.course.modes.train}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "drill"}
            className={mode === "drill" ? "is-active" : ""}
            onClick={() => changeMode("drill")}
          >
            {m.course.modes.drill}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "exam"}
            className={mode === "exam" ? "is-active" : ""}
            onClick={() => changeMode("exam")}
            title={
              finished > 0
                ? p(m.course.examTitle, finished)
                : m.course.examTitleNone
            }
          >
            {m.course.modes.exam}
          </button>
        </div>

        <div
          className="board-size-control"
          role="group"
          aria-label={m.course.boardSize}
        >
          <span className="board-size-label">
            {m.course.boardSize}
            <small>{m.course.boardSizeHint}</small>
          </span>
          <button
            type="button"
            className="board-size-step"
            onClick={() =>
              setBoardSize((value) => clampBoardSize(value - BOARD_SIZE_STEP))
            }
            disabled={boardSize <= BOARD_SIZE_MIN}
            aria-label={m.course.boardSizeDecrease}
          >
            −
          </button>
          <input
            type="range"
            min={BOARD_SIZE_MIN}
            max={BOARD_SIZE_MAX}
            step={BOARD_SIZE_STEP}
            value={boardSize}
            onChange={(event) =>
              setBoardSize(clampBoardSize(Number(event.target.value)))
            }
            aria-label={m.course.boardSize}
          />
          <button
            type="button"
            className="board-size-step"
            onClick={() =>
              setBoardSize((value) => clampBoardSize(value + BOARD_SIZE_STEP))
            }
            disabled={boardSize >= BOARD_SIZE_MAX}
            aria-label={m.course.boardSizeIncrease}
          >
            +
          </button>
          <span className="board-size-value">{boardSize}px</span>
          <button
            type="button"
            className="board-size-reset"
            onClick={() => setBoardSize(BOARD_SIZE_DEFAULT)}
          >
            {m.course.boardSizeReset}
          </button>
        </div>

        <span className="study-toolbar-note">
          {fill(m.course.toolbarNote, { count: opening.lines.length })}
        </span>

        <button
          type="button"
          className="btn btn-primary study-drill-btn"
          onClick={() => startDrillFromToolbar("due")}
        >
          {dueCount > 0
            ? fill(m.course.reviewDue, { count: dueCount })
            : m.course.startDailyDrill}
        </button>
      </div>

      <div
        className="study-layout"
        style={{ "--board-size": `${boardSize}px` } as CSSProperties}
      >
        <section
          className="study-stage"
          aria-label={m.course.studyBoardAria}
        >
          {(mode === "drill" || mode === "exam") && drillQueue.length > 0 ? (
            <div
              className={`study-drill-bar${mode === "exam" ? " is-exam" : ""}`}
            >
              <span className="study-drill-kind">
                {mode === "exam" ? m.course.exam : m.course.drill}
              </span>
              <strong>
                {Math.min(drillIndex + 1, drillQueue.length)} /{" "}
                {drillQueue.length}
              </strong>
              <span>{p(m.course.cleanCount, drillClean)}</span>
              <span>{p(m.course.mistakes, drillMistakes)}</span>
              <button
                type="button"
                className="study-drill-quit"
                onClick={() => {
                  clearDrill();
                  setMode("learn");
                }}
              >
                {fill(m.course.exitMode, {
                  mode: mode === "exam" ? m.course.exam : m.course.drill,
                })}
              </button>
            </div>
          ) : null}

          <div className="study-stage-top">
            <div>
              <div className="study-line-title-row">
                <span className="study-lesson-label">
                  {fill(m.course.lesson, {
                    index: lineIndex + 1,
                    total: opening.lines.length,
                  })}
                </span>
                <p className="study-line-name">{line.name}</p>
                {lineFinished ? (
                  <span
                    className={`study-line-badge${lineLearned ? " is-clean" : ""}`}
                  >
                    {lineLearned
                      ? m.course.cleanBadge
                      : m.course.finishedBadge}
                  </span>
                ) : null}
              </div>
              <p className="study-line-meta">
                {line.eco} · {line.tags.join(" · ")}
              </p>
            </div>
            <div className="study-step">
              <span>
                {fill(m.course.step, { ply, total: totalPlies })}
              </span>
              <span className="study-step-bar" aria-hidden>
                <span
                  style={{
                    width: `${totalPlies ? (ply / totalPlies) * 100 : 0}%`,
                  }}
                />
              </span>
            </div>
          </div>

          <div className="study-board">
            <ChessBoard
              fen={current.fen}
              orientation={line.side}
              shapes={shapes}
              viewOnly={boardViewOnly}
              movableColor={line.side}
              dests={dests}
              lastMove={current.lastMove}
              onMove={handleMove}
              positionKey={positionKey}
            />
          </div>

          {mode !== "exam" || completed ? (
            <div
              className="study-move-strip"
              aria-label={m.course.movesAria}
            >
              {line.moves.map((move, index) => {
                const target = index + 1;
                const hidden = practicing && !completed && target > ply;
                return (
                  <button
                    key={`${move.san}-${index}`}
                    type="button"
                    className={`study-move${target === ply ? " is-current" : ""}${hidden ? " is-hidden" : ""}`}
                    onClick={() => jumpToPly(target)}
                    disabled={hidden}
                    title={hidden ? m.course.hiddenMove : move.san}
                  >
                    <span className="study-move-number">{plyLabel(target)}</span>
                    <span>{hidden ? "…" : move.san}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>

        <aside className="study-panel" aria-label={m.course.coachAria}>
          <div
            className={`study-idea${hintOpen ? " is-hint" : ""}${completed && lastRunClean ? " is-clean" : ""}`}
          >
            <div className="study-idea-head">
              <span className="study-idea-kicker">{ideaKicker}</span>
              <span className="study-idea-move">{ideaHeading}</span>
            </div>
            <IdeaText
              as="p"
              className="study-idea-text"
              text={displayIdea?.text ?? emptyIdeaText}
              hotspots={displayIdea?.hotspots}
              activeId={activeHotspot?.id ?? null}
              onActivate={setActiveHotspot}
            />
            {displayIdea?.hotspots?.length ? (
              <span className="study-idea-highlight">
                {activeHotspot ? (
                  <>
                    {m.course.onBoard}{" "}
                    <strong>{activeHotspot.label}</strong>
                  </>
                ) : (
                  m.course.hoverPhrase
                )}
              </span>
            ) : displayIdea?.shapes.length ? (
              <span className="study-idea-highlight">
                {m.course.keySquare}
              </span>
            ) : null}
          </div>

          <div className="study-status" aria-live="polite">
            <span
              className={`feedback${feedback ? ` feedback-${feedback.type}` : ""}`}
            >
              {statusText}
            </span>
            {practicing ? (
              <span className="study-score">
                {p(m.course.score, mistakes, {
                  hints: p(m.course.hintCount, hints),
                })}
              </span>
            ) : null}
          </div>

          <div className="study-controls">
            {mode === "learn" ? (
              <>
                <button
                  type="button"
                  className="control-btn"
                  onClick={() => setPly(0)}
                  disabled={ply === 0}
                  title={m.course.controlStart}
                >
                  ⏮
                </button>
                <button
                  type="button"
                  className="control-btn"
                  onClick={() => setPly((value) => Math.max(0, value - 1))}
                  disabled={ply === 0}
                >
                  {m.course.controlBack}
                </button>
                <button
                  type="button"
                  className="control-btn control-primary"
                  onClick={() =>
                    setPly((value) => Math.min(totalPlies, value + 1))
                  }
                  disabled={ply >= totalPlies}
                >
                  {m.course.controlNext}
                </button>
                <button
                  type="button"
                  className="control-btn"
                  onClick={() => practiceLine(line.id)}
                >
                  {m.course.trainThisLine}
                </button>
              </>
            ) : mode === "exam" ? (
              <>
                <button
                  type="button"
                  className="control-btn"
                  onClick={resetAttempt}
                >
                  {m.course.restartLine}
                </button>
                <button
                  type="button"
                  className="control-btn"
                  onClick={() => {
                    clearDrill();
                    setMode("learn");
                  }}
                >
                  {m.course.exitExam}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="control-btn"
                  onClick={resetAttempt}
                >
                  {m.course.restart}
                </button>
                <button
                  type="button"
                  className="control-btn"
                  onClick={toggleHint}
                  disabled={!expectedMove}
                >
                  {hintOpen ? m.course.hideHint : m.course.hint}
                </button>
                <button
                  type="button"
                  className="control-btn"
                  onClick={playExpected}
                  disabled={!expectedMove}
                >
                  {m.course.showMove}
                </button>
                {mode === "drill" ? (
                  <button
                    type="button"
                    className="control-btn control-primary"
                    onClick={() => startDrill("mix")}
                  >
                    {m.course.newDrill}
                  </button>
                ) : null}
              </>
            )}
          </div>

          {(mode === "drill" || mode === "exam") && drillFinished ? (
            <div className="study-complete is-session">
              <h3>
                {mode === "exam"
                  ? m.course.examComplete
                  : m.course.drillComplete}
              </h3>
              <p>
                {mode === "exam"
                  ? fill(m.course.examScore, {
                      clean: drillClean,
                      total: drillResults.length,
                      pct: Math.round(
                        (drillClean / Math.max(1, drillResults.length)) * 100,
                      ),
                      mistakes: p(m.course.mistakes, drillMistakes),
                    })
                  : fill(m.course.drillScore, {
                      clean: drillClean,
                      total: drillResults.length,
                      mistakes: p(m.course.mistakes, drillMistakes),
                    })}
              </p>
              <div className="session-chips">
                {drillResults.map((result, index) => (
                  <span
                    key={`${result.lineId}-${index}`}
                    className={`session-chip${result.clean ? " is-clean" : ""}`}
                  >
                    {result.clean ? "✓" : "•"} {result.name}
                  </span>
                ))}
              </div>
              <div className="study-complete-actions">
                {mode === "exam" ? (
                  <button
                    type="button"
                    className="control-btn control-primary"
                    onClick={startExam}
                  >
                    {m.course.newExam}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="control-btn control-primary"
                    onClick={() => startDrill("mix")}
                  >
                    {m.course.newDrill}
                  </button>
                )}
                <button
                  type="button"
                  className="control-btn"
                  onClick={() => startDrill("due")}
                >
                  {m.course.reviewDueShort}
                </button>
                <Link href="/progress" className="control-btn">
                  {m.common.progress}
                </Link>
              </div>
            </div>
          ) : completed ? (
            <div className={`study-complete${lastRunClean ? " is-clean" : ""}`}>
              <h3>
                {mode === "exam"
                  ? lastRunClean
                    ? m.course.cleanLine
                    : m.course.lineFinished
                  : lastRunClean
                    ? m.course.lineLearned
                    : m.course.lineFinished}
              </h3>
              <p>
                {mode === "exam"
                  ? lastRunClean
                    ? m.course.examCleanText
                    : m.course.examFinishedText
                  : lastRunClean
                    ? m.course.learnedText
                    : p(m.course.finishedText, mistakes, {
                        hints: p(m.course.hintCount, hints),
                      })}
              </p>
              <div className="study-complete-actions">
                {mode === "exam" ? (
                  <button
                    type="button"
                    className="control-btn control-primary"
                    onClick={advanceDrill}
                  >
                    {m.course.nextQuestion}
                  </button>
                ) : (
                  <>
                    {!lastRunClean ? (
                      <button
                        type="button"
                        className="control-btn control-primary"
                        onClick={resetAttempt}
                      >
                        {m.course.replayUntilClean}
                      </button>
                    ) : null}
                    {mode === "drill" ? (
                      <button
                        type="button"
                        className={`control-btn${lastRunClean ? " control-primary" : ""}`}
                        onClick={advanceDrill}
                      >
                        {m.course.nextLine}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`control-btn${lastRunClean ? " control-primary" : ""}`}
                        onClick={nextPracticeLine}
                      >
                        {m.course.nextLine}
                      </button>
                    )}
                    {lastRunClean ? (
                      <button
                        type="button"
                        className="control-btn"
                        onClick={resetAttempt}
                      >
                        {m.course.replay}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="control-btn"
                      onClick={() => jumpToPly(totalPlies)}
                    >
                      {m.course.review}
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {mode !== "exam" || completed ? (
            <>
              {coachPoints.length > 0 ? (
                <>
                  <button
                    type="button"
                    className="study-deep-toggle"
                    onClick={() => setShowDeepNotes((value) => !value)}
                    aria-expanded={showDeepNotes}
                  >
                    {showDeepNotes
                      ? m.course.hideDeepNotes
                      : m.course.deepNotes}
                    {` (${coachPoints.length})`}
                    <span aria-hidden>{showDeepNotes ? "▴" : "▾"}</span>
                  </button>

                  {showDeepNotes ? (
                    <div className="study-deep-panel">
                      <CoachPanel
                        points={coachPoints}
                        activeId={activeNoteId}
                        onActivate={setActiveNoteId}
                        activeHotspotId={activeHotspot?.id ?? null}
                        onHotspot={setActiveHotspot}
                        heading={
                          currentMove
                            ? `${plyLabel(ply)} ${currentMove.san}`
                            : m.course.startHere
                        }
                        subheading={line.name}
                        emptyText={m.course.noExtraNotes}
                      />
                    </div>
                  ) : null}
                </>
              ) : null}

              {line.sources?.[0] ? (
                <div className="study-sources">
                  <span className="study-sources-label">
                    {m.course.verify}
                  </span>
                  <div className="study-source-links">
                    <a
                      href={line.sources[0].url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {m.course.openLichess}
                    </a>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </aside>
      </div>

    </div>
  );
}
