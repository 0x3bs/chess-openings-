import type {
  LineProgress,
  ProgressStore,
  TrainingStats,
} from "@/lib/progress";
import {
  clearProgress,
  loadProgress,
  loadStats,
  saveProgress,
  saveStats,
} from "@/lib/progress";
import { supabase, supabaseConfigured } from "./client";

type Row = {
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
  streak?: number | null;
  mastery?: number | null;
  last_mistakes?: number | null;
  last_hints?: number | null;
  last_quality?: number | null;
};

function progressToRow(userId: string, entry: LineProgress) {
  return {
    user_id: userId,
    line_id: entry.lineId,
    attempts: entry.attempts,
    clean: entry.clean,
    total_mistakes: entry.totalMistakes,
    total_hints: entry.totalHints,
    last_practiced: entry.lastPracticed,
    interval: entry.interval,
    ease: entry.ease,
    reps: entry.reps,
    due_at: entry.dueAt,
    history: entry.history,
    streak: entry.streak,
    mastery: entry.mastery,
    last_mistakes: entry.lastMistakes,
    last_hints: entry.lastHints,
    last_quality: entry.lastQuality,
    updated_at: new Date().toISOString(),
  };
}

function rowToProgress(row: Row): LineProgress {
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

/** Push one finished line to the cloud. No-op when Supabase is not configured. */
export async function pushLineProgress(entry: LineProgress | undefined): Promise<void> {
  if (!supabaseConfigured || !supabase || !entry) return;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return;

    const { error: upsertError } = await supabase
      .from("line_progress")
      .upsert(progressToRow(data.user.id, entry), {
        onConflict: "user_id,line_id",
      });

    if (upsertError) {
      console.warn("Could not push progress:", upsertError.message);
    }
  } catch (error) {
    console.warn("Could not push progress:", error);
  }
}

/**
 * Pull cloud progress and merge it with local progress. For each line the
 * most recently practiced copy wins. No-op when Supabase is not configured.
 */
export async function pullAndMergeProgress(): Promise<ProgressStore> {
  const local = loadProgress();
  if (!supabaseConfigured || !supabase) return local;

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return local;

    const { data, error } = await supabase
      .from("line_progress")
      .select(
        "line_id, attempts, clean, total_mistakes, total_hints, last_practiced, interval, ease, reps, due_at, history, streak, mastery, last_mistakes, last_hints, last_quality",
      );

    if (error || !data) return local;

    const merged: ProgressStore = { ...local };
    for (const row of data as Row[]) {
      const remote = rowToProgress(row);
      const existing = merged[remote.lineId];
      if (
        !existing ||
        new Date(remote.lastPracticed).getTime() >
          new Date(existing.lastPracticed).getTime()
      ) {
        merged[remote.lineId] = remote;
      }
    }

    saveProgress(merged);
    return merged;
  } catch (error) {
    console.warn("Could not pull progress:", error);
    return local;
  }
}

async function syncTrainingStats(userId: string): Promise<void> {
  if (!supabase) return;

  try {
    const local = loadStats();
    const { data, error } = await supabase
      .from("user_stats")
      .select("days, sessions")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("Could not read training stats:", error.message);
      return;
    }

    const remote = data as { days?: string[]; sessions?: number } | null;
    const days = [...new Set([...local.days, ...(remote?.days ?? [])])]
      .sort()
      .slice(-120);
    const sessions = Math.max(local.sessions, remote?.sessions ?? 0);
    const merged: TrainingStats = { days, sessions };
    saveStats(merged);

    const { error: upsertError } = await supabase
      .from("user_stats")
      .upsert(
        {
          user_id: userId,
          days,
          sessions,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (upsertError) {
      console.warn("Could not sync training stats:", upsertError.message);
    }
  } catch (error) {
    console.warn("Could not sync training stats:", error);
  }
}

/**
 * Pull the latest cloud rows, merge them locally, then upload the merged
 * snapshot. This is what makes a local-only account start syncing as soon as
 * the user signs in on a new device.
 */
export async function syncAllProgress(): Promise<ProgressStore> {
  let merged = loadProgress();
  if (!supabaseConfigured || !supabase) return merged;

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return merged;

    // Keep different accounts from uploading each other's local progress on a
    // shared browser. A blank owner means this is anonymous progress created
    // before the account existed, so it is safe to merge into this account.
    const ownerKey = "chess-coach-account-id";
    const owner =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(ownerKey);
    if (owner && owner !== userData.user.id) {
      clearProgress();
      merged = {};
    }

    merged = await pullAndMergeProgress();

    const rows = Object.values(merged).map((entry) =>
      progressToRow(userData.user.id, entry),
    );

    if (rows.length) {
      const { error } = await supabase
        .from("line_progress")
        .upsert(rows, { onConflict: "user_id,line_id" });

      if (error) {
        console.warn("Could not sync progress:", error.message);
      }
    }

    await syncTrainingStats(userData.user.id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ownerKey, userData.user.id);
    }
  } catch (error) {
    console.warn("Could not sync progress:", error);
  }

  return merged;
}
