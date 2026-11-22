import { promises as fs } from "node:fs";
import path from "node:path";
import {
  emptyStats,
  recordResult,
  recordTrainingDay,
  type LineProgress,
  type LineResult,
  type ProgressStore,
  type TrainingStats,
} from "@/lib/progress";

export type ProgressState = {
  progress: ProgressStore;
  stats: TrainingStats;
};

const DEFAULT_FILE = path.join(process.cwd(), "data", "progress.json");
const MAX_HISTORY = 30;
const MAX_DAYS = 120;

/** Where the shared progress file lives. Override with CHESSCOACH_DATA_FILE. */
export function dataFilePath(): string {
  const configured = process.env.CHESSCOACH_DATA_FILE?.trim();
  if (!configured) return DEFAULT_FILE;
  if (path.isAbsolute(configured)) return configured;
  return path.join(process.cwd(), "data", configured);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function integerOr(value: unknown, fallback: number, min = 0): number {
  return Math.max(min, Math.trunc(numberOr(value, fallback)));
}

function dateOr(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : fallback;
}

function emptyState(): ProgressState {
  return {
    progress: {},
    stats: { days: [...emptyStats.days], sessions: emptyStats.sessions },
  };
}

function normalizeEntry(
  lineId: string,
  value: unknown,
  now: string,
): LineProgress | null {
  if (!isRecord(value)) return null;

  const history = Array.isArray(value.history)
    ? value.history
        .filter(isRecord)
        .map((entry) => ({
          at: dateOr(entry.at, now),
          mistakes: integerOr(entry.mistakes, 0),
          hints: integerOr(entry.hints, 0),
          quality: Math.min(5, Math.max(1, integerOr(entry.quality, 1, 1))),
        }))
        .slice(-MAX_HISTORY)
    : [];

  return {
    lineId,
    attempts: integerOr(value.attempts, 0),
    clean: integerOr(value.clean, 0),
    totalMistakes: integerOr(value.totalMistakes, 0),
    totalHints: integerOr(value.totalHints, 0),
    lastPracticed: dateOr(value.lastPracticed, now),
    interval: integerOr(value.interval, 0),
    ease: Math.max(1.3, numberOr(value.ease, 2.5)),
    reps: integerOr(value.reps, 0),
    dueAt: dateOr(value.dueAt, now),
    streak: integerOr(value.streak, 0),
    mastery: Math.min(5, integerOr(value.mastery, 0)),
    lastMistakes: integerOr(value.lastMistakes, 0),
    lastHints: integerOr(value.lastHints, 0),
    lastQuality: Math.min(5, integerOr(value.lastQuality, 0)),
    history,
  };
}

function normalizeState(value: unknown): ProgressState {
  if (!isRecord(value)) return emptyState();

  const now = new Date().toISOString();
  const progress: ProgressStore = {};
  const rawProgress = isRecord(value.progress) ? value.progress : {};

  for (const [lineId, rawEntry] of Object.entries(rawProgress)) {
    if (!lineId || lineId.length > 240) continue;
    const entry = normalizeEntry(lineId, rawEntry, now);
    if (entry) progress[lineId] = entry;
  }

  const rawStats = isRecord(value.stats) ? value.stats : {};
  const days = Array.isArray(rawStats.days)
    ? rawStats.days.filter(
        (day): day is string =>
          typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day),
      )
    : [];

  return {
    progress,
    stats: {
      days: days.slice(-MAX_DAYS),
      sessions: integerOr(rawStats.sessions, 0),
    },
  };
}

/** Read the shared progress file. A missing file means fresh progress. */
export async function readProgressState(): Promise<ProgressState> {
  try {
    const raw = await fs.readFile(dataFilePath(), "utf8");
    return normalizeState(JSON.parse(raw) as unknown);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") {
      console.warn("Could not read the progress file:", error);
    }
    return emptyState();
  }
}

/** Write atomically so a crash cannot leave a half-written JSON file. */
async function writeProgressState(state: ProgressState): Promise<void> {
  const file = dataFilePath();
  await fs.mkdir(path.dirname(file), { recursive: true });

  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(temp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await fs.rename(temp, file);
  } catch (error) {
    await fs.rm(temp, { force: true }).catch(() => undefined);
    throw error;
  }
}

/**
 * Serialize writes inside this server process. Two tablets training at the
 * same moment must not overwrite each other's lines.
 */
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Record one finished line and update the training stats together. */
export async function recordLineResult(
  lineId: string,
  result: LineResult,
): Promise<{ entry: LineProgress | undefined; stats: TrainingStats }> {
  return enqueue(async () => {
    const state = await readProgressState();
    const progress = recordResult(lineId, result, state.progress);
    const stats = recordTrainingDay(state.stats);

    await writeProgressState({ progress, stats });
    return { entry: progress[lineId], stats };
  });
}

/** Clear every saved line while keeping the file (and its directory). */
export async function resetProgressState(): Promise<ProgressState> {
  return enqueue(async () => {
    const state = emptyState();
    await writeProgressState(state);
    return state;
  });
}
