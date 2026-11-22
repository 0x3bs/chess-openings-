"use client";

import { useEffect, useMemo, useState } from "react";
import { LocaleLink as Link } from "./LocaleLink";
import { WeekStreak } from "./WeekStreak";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { fill } from "@/lib/i18n/plural";
import type { Opening, OpeningLine } from "@/lib/openings/types";
import {
  completedOf,
  dayStreak,
  emptyStats,
  isDue,
  learnedOf,
  masteryOf,
  type LineProgress,
  type ProgressStore,
  type TrainingStats,
} from "@/lib/progress";
import {
  clearRemoteProgress,
  loadRemoteProgress,
  loadRemoteStats,
} from "@/lib/db/progress";

type LineRow = {
  opening: Opening;
  line: OpeningLine;
  progress: LineProgress | undefined;
};

function formatDate(iso: string, locale: "en" | "ar"): string {
  return new Date(iso).toLocaleDateString(locale === "ar" ? "ar" : "en", {
    month: "short",
    day: "numeric",
  });
}

function lastPracticedOf(opening: Opening, store: ProgressStore): number {
  return opening.lines.reduce((latest, line) => {
    const value = store[line.id]?.lastPracticed;
    const time = value ? new Date(value).getTime() : 0;
    return Math.max(latest, Number.isFinite(time) ? time : 0);
  }, 0);
}

function Mastery({ value }: { value: number }) {
  const { m } = useI18n();
  return (
    <span
      className="mastery"
      aria-label={fill(m.dashboard.masteryAria, { value })}
    >
      {[0, 1, 2, 3, 4].map((index) => (
        <span key={index} className={index < value ? "on" : ""}>
          ★
        </span>
      ))}
    </span>
  );
}

export function Dashboard({ openings }: { openings: Opening[] }) {
  const { locale, m, p } = useI18n();
  const [store, setStore] = useState<ProgressStore>({});
  const [stats, setStats] = useState<TrainingStats>({ days: [], sessions: 0 });
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([loadRemoteProgress(), loadRemoteStats()]).then(
      ([remoteProgress, remoteStats]) => {
        if (cancelled) return;
        setStore(remoteProgress);
        setStats(remoteStats);
        setReady(true);
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const allRows = useMemo<LineRow[]>(
    () =>
      openings.flatMap((opening) =>
        opening.lines.map((line) => ({
          opening,
          line,
          progress: store[line.id],
        })),
      ),
    [openings, store],
  );

  const practiced = allRows.filter((row) => row.progress);
  const totalLines = allRows.length;
  const learned = allRows.filter((row) => learnedOf(row.progress)).length;
  const finished = allRows.filter((row) => completedOf(row.progress)).length;
  const dueRows = allRows.filter((row) => isDue(row.progress));
  const attempts = practiced.reduce(
    (total, row) => total + (row.progress?.attempts ?? 0),
    0,
  );
  const clean = practiced.reduce(
    (total, row) => total + (row.progress?.clean ?? 0),
    0,
  );
  const cleanRate = attempts > 0 ? Math.round((clean / attempts) * 100) : 0;
  const streak = dayStreak(stats);
  const coursesStarted = openings.filter((opening) =>
    opening.lines.some((line) => store[line.id]?.attempts),
  ).length;

  const recent = [...practiced]
    .sort(
      (a, b) =>
        new Date(b.progress?.lastPracticed ?? 0).getTime() -
        new Date(a.progress?.lastPracticed ?? 0).getTime(),
    )
    .slice(0, 8);

  const courseRows = openings
    .map((opening) => {
      const rows = allRows.filter((row) => row.opening.slug === opening.slug);
      const courseLearned = rows.filter((row) => learnedOf(row.progress)).length;
      const courseFinished = rows.filter((row) =>
        completedOf(row.progress),
      ).length;
      const courseDue = rows.filter((row) => isDue(row.progress)).length;
      const started = courseFinished > 0;
      const lastPracticed = lastPracticedOf(opening, store);
      const recentLine = [...rows]
        .filter((row) => row.progress)
        .sort(
          (a, b) =>
            new Date(b.progress?.lastPracticed ?? 0).getTime() -
            new Date(a.progress?.lastPracticed ?? 0).getTime(),
        )[0]?.line;

      return {
        opening,
        total: rows.length,
        learned: courseLearned,
        finished: courseFinished,
        due: courseDue,
        started,
        lastPracticed,
        href:
          started && recentLine
            ? `/openings/${opening.slug}?line=${recentLine.id}&train=1`
            : `/openings/${opening.slug}`,
        drillHref: `/openings/${opening.slug}?drill=due`,
      };
    })
    .sort((a, b) => {
      if (a.due !== b.due) return b.due - a.due;
      if (a.lastPracticed !== b.lastPracticed) {
        return b.lastPracticed - a.lastPracticed;
      }
      if (a.learned !== b.learned) return b.learned - a.learned;
      return a.opening.name.localeCompare(b.opening.name, locale);
    });

  const dueCourse = courseRows.find((course) => course.due > 0);
  const nextCourse =
    dueCourse ?? courseRows.find((course) => course.learned < course.total);
  const dailyHref = dueCourse
    ? dueCourse.drillHref
    : nextCourse
      ? nextCourse.href
      : "/openings";

  async function syncNow() {
    setSyncing(true);
    try {
      const [remoteProgress, remoteStats] = await Promise.all([
        loadRemoteProgress(),
        loadRemoteStats(),
      ]);
      setStore(remoteProgress);
      setStats(remoteStats);
    } finally {
      setSyncing(false);
    }
  }

  async function reset() {
    if (!window.confirm(m.dashboard.resetConfirm)) return;
    await clearRemoteProgress();
    setStore({});
    setStats(emptyStats);
  }

  return (
    <main className="page dashboard-page">
      <header className="page-header dashboard-header">
        <div>
          <p className="eyebrow">{m.dashboard.eyebrow}</p>
          <h1>{m.dashboard.title}</h1>
          <p>{m.dashboard.lead}</p>
          <p className="server-progress-note">{m.dashboard.serverNote}</p>
        </div>
        <WeekStreak stats={stats} streak={streak} />
      </header>

      <section className="today-panel">
        <div>
          <p className="eyebrow">{m.dashboard.todayEyebrow}</p>
          <h2>
            {dueRows.length > 0
              ? p(m.dashboard.dueReady, dueRows.length)
              : practiced.length > 0
                ? m.dashboard.noReviews
                : m.dashboard.startFirst}
          </h2>
          <div className="today-meta">
            <span>
              {fill(m.dashboard.linesLearned, {
                learned,
                total: totalLines,
              })}
            </span>
            <span>{fill(m.dashboard.finishedCount, { count: finished })}</span>
            <span>{fill(m.dashboard.dueCount, { count: dueRows.length })}</span>
            <span>{fill(m.dashboard.streak, { count: streak })}</span>
          </div>
        </div>
        <div className="today-actions">
          <Link href={dailyHref} className="btn btn-primary">
            {dueCourse
              ? fill(m.dashboard.reviewDue, { count: dueRows.length })
              : nextCourse
                ? fill(m.dashboard.continueCourse, {
                    name: nextCourse.opening.name,
                  })
                : m.dashboard.browseCourses}
          </Link>
          <Link href="/openings" className="btn btn-ghost">
            {m.dashboard.allCourses}
          </Link>
        </div>
      </section>

      <div className="stat-grid">
        <div className="stat-card">
          <strong>
            {learned}
            <span style={{ fontSize: 15, color: "var(--muted)" }}>
              /{totalLines}
            </span>
          </strong>
          <span>{m.dashboard.statLinesLearned}</span>
        </div>
        <div className="stat-card">
          <strong>{finished}</strong>
          <span>{m.dashboard.statLinesFinished}</span>
        </div>
        <div className="stat-card">
          <strong>{dueRows.length}</strong>
          <span>{m.dashboard.statDue}</span>
        </div>
        <div className="stat-card">
          <strong>{attempts}</strong>
          <span>{m.dashboard.statAttempts}</span>
        </div>
        <div className="stat-card">
          <strong>{cleanRate}%</strong>
          <span>{m.dashboard.statCleanRate}</span>
        </div>
        <div className="stat-card">
          <strong>
            {coursesStarted}
            <span style={{ fontSize: 15, color: "var(--muted)" }}>
              /{openings.length}
            </span>
          </strong>
          <span>{m.dashboard.statCoursesStarted}</span>
        </div>
      </div>

      <section className="dashboard-courses" aria-labelledby="courses-title">
        <div className="dashboard-section-head">
          <div>
            <p className="eyebrow">{m.dashboard.coursesEyebrow}</p>
            <h2 id="courses-title">{m.dashboard.courseTitle}</h2>
          </div>
          <Link href="/openings" className="dashboard-text-link">
            {fill(m.dashboard.browseAll, { count: openings.length })}
          </Link>
        </div>

        <div className="dashboard-course-grid">
          {courseRows.map((course) => {
            const pct = course.total
              ? Math.round((course.learned / course.total) * 100)
              : 0;
            return (
              <article
                className={`dashboard-course${course.due ? " is-due" : ""}`}
                key={course.opening.slug}
              >
                <div className="dashboard-course-top">
                  <div>
                    <span className="dashboard-course-side">
                      {course.opening.side === "white"
                        ? m.common.white
                        : m.common.black}
                    </span>
                    <h3>{course.opening.name}</h3>
                  </div>
                  <span className="dashboard-course-eco">
                    {course.opening.eco}
                  </span>
                </div>

                <div className="dashboard-course-progress">
                  <div className="dashboard-course-bar">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <span>
                    {fill(m.dashboard.courseLearned, {
                      learned: course.learned,
                      total: course.total,
                    })}
                  </span>
                </div>

                <div className="dashboard-course-meta">
                  <span>
                    {fill(m.dashboard.courseFinished, {
                      count: course.finished,
                    })}
                  </span>
                  <span>
                    {fill(m.dashboard.courseDue, { count: course.due })}
                  </span>
                  <span>
                    {fill(m.dashboard.courseLines, { count: course.total })}
                  </span>
                </div>

                <div className="dashboard-course-actions">
                  <Link href={course.href} className="dashboard-course-cta">
                    {course.started
                      ? m.dashboard.continueCta
                      : m.dashboard.startCta}{" "}
                    {m.common.arrowForward}
                  </Link>
                  {course.due > 0 ? (
                    <Link
                      href={course.drillHref}
                      className="dashboard-course-due"
                    >
                      {fill(m.dashboard.reviewCta, { count: course.due })}
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="dashboard-recent" aria-labelledby="recent-title">
        <div className="dashboard-section-head">
          <div>
            <p className="eyebrow">{m.dashboard.recentEyebrow}</p>
            <h2 id="recent-title">{m.dashboard.recentTitle}</h2>
          </div>
        </div>

        {ready && recent.length === 0 ? (
          <div className="empty-state">{m.dashboard.empty}</div>
        ) : (
          <div className="progress-table">
            <div className="progress-row is-head">
              <span>{m.dashboard.tableLine}</span>
              <span>{m.dashboard.tableCourse}</span>
              <span>{m.dashboard.tableMastery}</span>
              <span>{m.dashboard.tableNext}</span>
              <span>{m.dashboard.tablePractice}</span>
            </div>

            {recent.map(({ opening, line, progress }) => (
              <div className="progress-row" key={`${opening.slug}-${line.id}`}>
                <div>
                  <div className="progress-name">{line.name}</div>
                  <div className="progress-sub">
                    {line.eco} ·{" "}
                    {p(m.dashboard.attempts, progress?.attempts ?? 0)} ·{" "}
                    {p(m.dashboard.cleanRuns, progress?.clean ?? 0)}
                  </div>
                </div>
                <span>{opening.name}</span>
                <span>
                  <Mastery value={masteryOf(progress)} />
                </span>
                <span>
                  {progress ? formatDate(progress.dueAt, locale) : "—"}
                </span>
                <span>
                  <Link
                    href={`/openings/${opening.slug}?line=${line.id}&train=1`}
                    className="row-practice"
                  >
                    {m.dashboard.train}
                  </Link>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="page-actions">
        <Link href="/openings" className="btn btn-primary">
          {m.dashboard.browseCourses}
        </Link>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => void syncNow()}
          disabled={syncing}
          title={m.dashboard.syncTitle}
        >
          {syncing ? m.dashboard.syncing : m.dashboard.syncNow}
        </button>
        {practiced.length > 0 ? (
          <button type="button" className="danger-btn" onClick={reset}>
            {m.dashboard.reset}
          </button>
        ) : null}
      </div>
    </main>
  );
}
