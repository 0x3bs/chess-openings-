import {
  emptyStats,
  type LineProgress,
  type ProgressStore,
  type TrainingStats,
} from "@/lib/progress";

/**
 * Progress is stored in `data/progress.json` by the server. Every device that
 * opens this site reads and writes the same file, so no login or sync code is
 * needed.
 */
const API_URL = "/api/progress";

const LEGACY_KEYS = [
  "chess-coach-progress-v1",
  "chess-coach-stats-v1",
  "chess-coach-sync-code",
];

let legacyCleaned = false;

/** Remove progress keys from older browser-only builds. */
export function removeLegacyProgressStorage(): void {
  if (typeof window === "undefined" || legacyCleaned) return;
  legacyCleaned = true;
  try {
    for (const key of LEGACY_KEYS) window.localStorage.removeItem(key);
  } catch {
    // Storage can be blocked; progress itself is not stored there anymore.
  }
}

type ProgressState = {
  progress: ProgressStore;
  stats: TrainingStats;
};

function normalizeStats(value: unknown): TrainingStats {
  if (!value || typeof value !== "object") return { ...emptyStats };
  const raw = value as { days?: unknown; sessions?: unknown };
  return {
    days: Array.isArray(raw.days)
      ? raw.days.filter((day): day is string => typeof day === "string")
      : [],
    sessions:
      typeof raw.sessions === "number" && Number.isFinite(raw.sessions)
        ? Math.max(0, Math.trunc(raw.sessions))
        : 0,
  };
}

function normalizeState(value: unknown): ProgressState {
  if (!value || typeof value !== "object") {
    return { progress: {}, stats: { ...emptyStats } };
  }
  const raw = value as { progress?: unknown; stats?: unknown };
  return {
    progress:
      raw.progress && typeof raw.progress === "object"
        ? (raw.progress as ProgressStore)
        : {},
    stats: normalizeStats(raw.stats),
  };
}

async function fetchState(): Promise<ProgressState> {
  removeLegacyProgressStorage();

  try {
    const response = await fetch(API_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return normalizeState(await response.json());
  } catch (error) {
    console.warn("Could not load progress from the server:", error);
    return { progress: {}, stats: { ...emptyStats } };
  }
}

let inFlight: Promise<ProgressState> | null = null;

function currentState(): Promise<ProgressState> {
  if (!inFlight) {
    inFlight = fetchState().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

function invalidate(): void {
  inFlight = null;
}

/** Load every saved line for this server. */
export async function loadRemoteProgress(): Promise<ProgressStore> {
  return (await currentState()).progress;
}

/** Load streak days and session count for this server. */
export async function loadRemoteStats(): Promise<TrainingStats> {
  return (await currentState()).stats;
}

/** Save one finished line. The server updates stats in the same write. */
export async function saveRemoteLine(
  entry: LineProgress | undefined,
): Promise<void> {
  if (!entry) return;
  invalidate();

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "record",
        lineId: entry.lineId,
        mistakes: entry.lastMistakes,
        hints: entry.lastHints,
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.warn("Could not save progress to the server:", error);
  }
}

/** Clear every line for this server. */
export async function clearRemoteProgress(): Promise<void> {
  invalidate();

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.warn("Could not reset progress on the server:", error);
  }
}
