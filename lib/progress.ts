export type LineResult = {
  mistakes: number;
  hints: number;
};

export type HistoryEntry = {
  at: string;
  mistakes: number;
  hints: number;
  quality: number;
};

export type LineProgress = {
  lineId: string;
  attempts: number;
  clean: number;
  totalMistakes: number;
  totalHints: number;
  lastPracticed: string;
  interval: number;
  ease: number;
  reps: number;
  dueAt: string;
  /** Consecutive clean (no mistake, no hint) runs. */
  streak: number;
  /** 0-5 stars. Grows with clean runs, drops on shaky runs. */
  mastery: number;
  lastMistakes: number;
  lastHints: number;
  lastQuality: number;
  history: HistoryEntry[];
};

export type ProgressStore = Record<string, LineProgress>;

export type TrainingStats = {
  /** Local calendar days (YYYY-MM-DD) with at least one finished line. */
  days: string[];
  /** Total finished line attempts. */
  sessions: number;
};

const STORAGE_KEY = "chess-coach-progress-v1";
const STATS_KEY = "chess-coach-stats-v1";

export function loadProgress(): ProgressStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as ProgressStore)
      : {};
  } catch {
    return {};
  }
}

export function saveProgress(store: ProgressStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage can be full or blocked; progress is non-critical.
  }
}

export function qualityFor(result: LineResult): number {
  const penalty = result.mistakes + result.hints;
  if (penalty === 0) return 5;
  if (penalty === 1) return 4;
  if (penalty === 2) return 3;
  if (penalty <= 4) return 2;
  return 1;
}

/**
 * Opening memory needs frequent early reviews, not a 400-day gap. Use a
 * fixed ladder (1, 3, 7, 14, 30, 60 days) and restart it after a bad run.
 */
const REVIEW_LADDER = [1, 3, 7, 14, 30, 60];

export function recordResult(
  lineId: string,
  result: LineResult,
): ProgressStore {
  const store = loadProgress();
  const prev = store[lineId];
  const now = new Date();
  const quality = qualityFor(result);

  let reps = prev?.reps ?? 0;
  let interval = prev?.interval ?? 0;
  let ease = prev?.ease ?? 2.5;

  if (quality < 3) {
    reps = 0;
    interval = 1;
  } else {
    interval = REVIEW_LADDER[Math.min(reps, REVIEW_LADDER.length - 1)];
    reps += 1;
  }

  ease = Math.max(
    1.3,
    ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  const prevStreak = prev?.streak ?? 0;
  const prevMastery = prev?.mastery ?? 0;
  const streak = quality === 5 ? prevStreak + 1 : 0;

  let mastery = prevMastery;
  if (quality === 5) mastery = Math.min(5, prevMastery + 1);
  else if (quality === 4) mastery = Math.max(1, prevMastery);
  else if (quality === 3) mastery = prevMastery;
  else mastery = Math.max(0, prevMastery - 1);

  const due = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  store[lineId] = {
    lineId,
    attempts: (prev?.attempts ?? 0) + 1,
    clean: (prev?.clean ?? 0) + (quality === 5 ? 1 : 0),
    totalMistakes: (prev?.totalMistakes ?? 0) + result.mistakes,
    totalHints: (prev?.totalHints ?? 0) + result.hints,
    lastPracticed: now.toISOString(),
    interval,
    ease,
    reps,
    dueAt: due.toISOString(),
    streak,
    mastery,
    lastMistakes: result.mistakes,
    lastHints: result.hints,
    lastQuality: quality,
    history: [
      ...(prev?.history ?? []),
      { at: now.toISOString(), ...result, quality },
    ].slice(-30),
  };

  saveProgress(store);
  return store;
}

export function clearProgress(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(STATS_KEY);
  } catch {
    // ignore
  }
}

export function isDue(progress: LineProgress | undefined, now = Date.now()): boolean {
  return Boolean(progress && new Date(progress.dueAt).getTime() <= now);
}

export function masteryOf(progress: LineProgress | undefined): number {
  return Math.max(0, Math.min(5, progress?.mastery ?? 0));
}

/**
 * A line counts as learned only after a completely clean run (no mistakes,
 * no hints). An attempt with hints still enters the review queue, but it is
 * not "learned" yet.
 */
export function learnedOf(progress: LineProgress | undefined): boolean {
  return (progress?.clean ?? 0) > 0;
}

/** Any finished attempt, clean or not. */
export function completedOf(progress: LineProgress | undefined): boolean {
  return (progress?.attempts ?? 0) > 0;
}

export function learnedCount(store: ProgressStore): number {
  return Object.values(store).filter(learnedOf).length;
}

/* ---------------------------- daily training ---------------------------- */

function localDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function loadStats(): TrainingStats {
  if (typeof window === "undefined") return { days: [], sessions: 0 };
  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    if (!raw) return { days: [], sessions: 0 };
    const parsed = JSON.parse(raw) as Partial<TrainingStats>;
    return {
      days: Array.isArray(parsed.days) ? parsed.days : [],
      sessions: typeof parsed.sessions === "number" ? parsed.sessions : 0,
    };
  } catch {
    return { days: [], sessions: 0 };
  }
}

export function saveStats(stats: TrainingStats): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

/** Called when a line is finished; marks today as a training day. */
export function recordTrainingDay(): TrainingStats {
  const stats = loadStats();
  const today = localDay(new Date());
  const days = stats.days.includes(today)
    ? stats.days
    : [...stats.days, today].slice(-120);

  const next: TrainingStats = { days, sessions: stats.sessions + 1 };
  saveStats(next);
  return next;
}

/**
 * Consecutive training days. If the user has not trained yet today the
 * streak is counted up to yesterday, so it does not look broken at 9am.
 */
export function dayStreak(stats: TrainingStats, now = new Date()): number {
  const trained = new Set(stats.days);
  const cursor = new Date(now);

  if (!trained.has(localDay(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (trained.has(localDay(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
