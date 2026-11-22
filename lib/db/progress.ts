import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import {
  emptyStats,
  type LineProgress,
  type ProgressStore,
  type TrainingStats,
} from "@/lib/progress";

/**
 * Only the sync code is kept in the browser. Progress itself is always loaded
 * from Postgres, so opening the app on another device shows the same data.
 */
export const SYNC_CODE_KEY = "chess-coach-sync-code";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 20;

const LEGACY_KEYS = ["chess-coach-progress-v1", "chess-coach-stats-v1"];
let legacyCleaned = false;

/**
 * Older builds kept progress in localStorage. Remove those keys on the first
 * load so the database is the only source of truth.
 */
export function removeLegacyProgressStorage(): void {
  if (typeof window === "undefined" || legacyCleaned) return;
  legacyCleaned = true;
  try {
    for (const key of LEGACY_KEYS) window.localStorage.removeItem(key);
  } catch {
    // Storage can be blocked; nothing else depends on it.
  }
}

export function normalizeSyncCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z2-9]/g, "")
    .slice(0, CODE_LENGTH);
}

export function formatSyncCode(value: string): string {
  const clean = normalizeSyncCode(value);
  return clean.match(/.{1,4}/g)?.join("-") ?? clean;
}

export function generateSyncCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) {
    code += ALPHABET[byte % ALPHABET.length];
  }
  return code;
}

export function getSyncCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const code = normalizeSyncCode(
      window.localStorage.getItem(SYNC_CODE_KEY) ?? "",
    );
    return code.length === CODE_LENGTH ? code : null;
  } catch {
    return null;
  }
}

export function setSyncCode(code: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SYNC_CODE_KEY, normalizeSyncCode(code));
}

export function clearSyncCode(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SYNC_CODE_KEY);
}

export function hasSyncCode(): boolean {
  return Boolean(getSyncCode());
}

type ProgressRow = {
  line_id: string;
  attempts: number;
  clean: number;
  total_mistakes: number;
  total_hints: number;
  last_practiced: string;
  interval: number;
  ease: number;
  reps: number;
  due_at: string;
  history: LineProgress["history"];
  streak: number | null;
  mastery: number | null;
  last_mistakes: number | null;
  last_hints: number | null;
  last_quality: number | null;
};

function rowToProgress(row: ProgressRow): LineProgress {
  return {
    lineId: row.line_id,
    attempts: row.attempts,
    clean: row.clean,
    totalMistakes: row.total_mistakes,
    totalHints: row.total_hints,
    lastPracticed: row.last_practiced,
    interval: row.interval,
    ease: row.ease,
    reps: row.reps,
    dueAt: row.due_at,
    streak: row.streak ?? 0,
    mastery: row.mastery ?? 0,
    lastMistakes: row.last_mistakes ?? 0,
    lastHints: row.last_hints ?? 0,
    lastQuality: row.last_quality ?? 0,
    history: Array.isArray(row.history) ? row.history : [],
  };
}

export function databaseConfigured(): boolean {
  return supabaseConfigured && Boolean(supabase);
}

/** Load every progress row for the current sync code. */
export async function loadRemoteProgress(): Promise<ProgressStore> {
  removeLegacyProgressStorage();
  const code = getSyncCode();
  if (!supabase || !code) return {};

  const { data, error } = await supabase.rpc("sync_load_progress", {
    p_code: code,
  });
  if (error) {
    console.warn("Could not load progress:", error.message);
    return {};
  }

  const store: ProgressStore = {};
  for (const row of (data ?? []) as ProgressRow[]) {
    store[row.line_id] = rowToProgress(row);
  }
  return store;
}

export async function saveRemoteLine(
  entry: LineProgress | undefined,
): Promise<void> {
  const code = getSyncCode();
  if (!supabase || !code || !entry) return;

  const { error } = await supabase.rpc("sync_upsert_progress", {
    p_code: code,
    p_line_id: entry.lineId,
    p_attempts: entry.attempts,
    p_clean: entry.clean,
    p_total_mistakes: entry.totalMistakes,
    p_total_hints: entry.totalHints,
    p_last_practiced: entry.lastPracticed,
    p_interval: entry.interval,
    p_ease: entry.ease,
    p_reps: entry.reps,
    p_due_at: entry.dueAt,
    p_history: entry.history,
    p_streak: entry.streak,
    p_mastery: entry.mastery,
    p_last_mistakes: entry.lastMistakes,
    p_last_hints: entry.lastHints,
    p_last_quality: entry.lastQuality,
  });

  if (error) console.warn("Could not save progress:", error.message);
}

export async function loadRemoteStats(): Promise<TrainingStats> {
  removeLegacyProgressStorage();
  const code = getSyncCode();
  if (!supabase || !code) return emptyStats;

  const { data, error } = await supabase.rpc("sync_load_stats", {
    p_code: code,
  });
  if (error) {
    console.warn("Could not load stats:", error.message);
    return emptyStats;
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | { days?: string[]; sessions?: number }
    | undefined;
  return {
    days: Array.isArray(row?.days) ? row.days : [],
    sessions: typeof row?.sessions === "number" ? row.sessions : 0,
  };
}

export async function saveRemoteStats(stats: TrainingStats): Promise<void> {
  const code = getSyncCode();
  if (!supabase || !code) return;

  const { error } = await supabase.rpc("sync_upsert_stats", {
    p_code: code,
    p_days: stats.days,
    p_sessions: stats.sessions,
  });
  if (error) console.warn("Could not save stats:", error.message);
}

export async function clearRemoteProgress(): Promise<void> {
  const code = getSyncCode();
  if (!supabase || !code) return;

  const { error } = await supabase.rpc("sync_clear_progress", {
    p_code: code,
  });
  if (error) console.warn("Could not clear progress:", error.message);
}

export async function deleteRemoteProfile(): Promise<void> {
  const code = getSyncCode();
  if (!supabase || !code) return;

  const { error } = await supabase.rpc("sync_delete_profile", {
    p_code: code,
  });
  if (error) console.warn("Could not delete profile:", error.message);
}

/** Create a new code and start a fresh cloud profile. */
export async function createSyncProfile(): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const code = generateSyncCode();
  const { error } = await supabase.rpc("sync_create_profile", {
    p_code: code,
  });
  if (error) throw error;

  setSyncCode(code);
  return code;
}

/** Connect this browser to an existing code. */
export async function connectSyncProfile(rawCode: string): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const code = normalizeSyncCode(rawCode);
  if (code.length !== CODE_LENGTH) {
    throw new Error("The sync code must contain 20 letters and numbers.");
  }

  const { data, error } = await supabase.rpc("sync_check_code", {
    p_code: code,
  });
  if (error) throw error;
  if (!data) throw new Error("No profile was found for that code.");

  setSyncCode(code);
  return code;
}
