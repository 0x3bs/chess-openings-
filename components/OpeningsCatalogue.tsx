"use client";

import { useEffect, useMemo, useState } from "react";
import { LocaleLink as Link } from "./LocaleLink";
import { MiniBoard } from "./MiniBoard";
import { WeekStreak } from "./WeekStreak";
import { buildPositions } from "@/lib/chess";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { fill } from "@/lib/i18n/plural";
import type { Opening } from "@/lib/openings/types";
import {
  completedOf,
  dayStreak,
  isDue,
  learnedOf,
  type ProgressStore,
  type TrainingStats,
} from "@/lib/progress";
import {
  loadRemoteProgress,
  loadRemoteStats,
} from "@/lib/db/progress";

type SideFilter = "all" | "white" | "black";
type SortMode = "last" | "progress" | "az";

function lastPlayed(opening: Opening, store: ProgressStore): number {
  return opening.lines.reduce((latest, line) => {
    const value = store[line.id]?.lastPracticed;
    const time = value ? new Date(value).getTime() : 0;
    return Math.max(latest, Number.isFinite(time) ? time : 0);
  }, 0);
}

export function OpeningsCatalogue({ openings }: { openings: Opening[] }) {
  const { locale, m } = useI18n();
  const [store, setStore] = useState<ProgressStore>({});
  const [stats, setStats] = useState<TrainingStats>({ days: [], sessions: 0 });
  const [query, setQuery] = useState("");
  const [side, setSide] = useState<SideFilter>("all");
  const [sort, setSort] = useState<SortMode>("last");

  useEffect(() => {
    let cancelled = false;

    void Promise.all([loadRemoteProgress(), loadRemoteStats()]).then(
      ([remoteProgress, remoteStats]) => {
        if (cancelled) return;
        setStore(remoteProgress);
        setStats(remoteStats);
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const previews = useMemo(() => {
    const map: Record<string, string> = {};
    for (const opening of openings) {
      const firstLine = opening.lines[0];
      if (!firstLine) continue;
      const positions = buildPositions(firstLine);
      const index = Math.min(12, firstLine.moves.length);
      map[opening.slug] = positions[index]?.fen ?? positions[0].fen;
    }
    return map;
  }, [openings]);

  const totalLines = openings.reduce(
    (total, opening) => total + opening.lines.length,
    0,
  );
  const learnedLines = openings.reduce(
    (total, opening) =>
      total + opening.lines.filter((line) => learnedOf(store[line.id])).length,
    0,
  );
  const dueLines = openings.reduce(
    (total, opening) =>
      total + opening.lines.filter((line) => isDue(store[line.id])).length,
    0,
  );
  const streak = dayStreak(stats);
  const trainedAny = Object.values(store).some((entry) => entry.attempts > 0);

  const cards = useMemo(() => {
    const text = query.trim().toLowerCase();

    const filtered = openings.filter((opening) => {
      if (side !== "all" && opening.side !== side) return false;
      if (!text) return true;
      return `${opening.name} ${opening.eco} ${opening.intro} ${opening.themes.join(" ")}`
        .toLowerCase()
        .includes(text);
    });

    return [...filtered].sort((a, b) => {
      if (sort === "last") {
        const aTime = lastPlayed(a, store);
        const bTime = lastPlayed(b, store);
        if (aTime !== bTime) return bTime - aTime;
      }

      if (sort === "progress") {
        const aLearned = a.lines.filter((line) => learnedOf(store[line.id]))
          .length;
        const bLearned = b.lines.filter((line) => learnedOf(store[line.id]))
          .length;
        if (aLearned !== bLearned) return bLearned - aLearned;
        const aFinished = a.lines.filter((line) => completedOf(store[line.id]))
          .length;
        const bFinished = b.lines.filter((line) => completedOf(store[line.id]))
          .length;
        if (aFinished !== bFinished) return bFinished - aFinished;
      }

      return a.name.localeCompare(b.name, locale);
    });
  }, [openings, query, side, sort, store, locale]);

  const sortNote =
    sort === "last"
      ? trainedAny
        ? m.catalogue.sortLastNoteTrained
        : m.catalogue.sortLastNoteEmpty
      : sort === "progress"
        ? m.catalogue.sortProgressNote
        : m.catalogue.sortAzNote;

  return (
    <main className="catalogue-page">
      <section className="catalogue-hero">
        <div className="catalogue-hero-copy">
          <p className="eyebrow">{m.catalogue.eyebrow}</p>
          <h1>{m.catalogue.title}</h1>
          <p>{m.catalogue.lead}</p>
          <div className="catalogue-hero-actions">
            <Link
              href={
                openings.length === 1
                  ? `/openings/${openings[0].slug}`
                  : `#courses`
              }
              className="btn btn-primary"
            >
              {m.catalogue.startTraining}
            </Link>
            <Link href="/progress" className="btn btn-ghost">
              {m.catalogue.viewProgress}
            </Link>
          </div>
        </div>

        <div className="catalogue-hero-side">
          <div className="catalogue-hero-stats">
            <div>
              <strong>{openings.length}</strong>
              <span>{m.catalogue.statCourses}</span>
            </div>
            <div>
              <strong>{totalLines.toLocaleString("en-US")}</strong>
              <span>{m.catalogue.statLines}</span>
            </div>
            <div>
              <strong>
                {learnedLines}
                <em>/{totalLines.toLocaleString("en-US")}</em>
              </strong>
              <span>{m.catalogue.statLearned}</span>
            </div>
            <div>
              <strong>{dueLines}</strong>
              <span>{m.catalogue.statDue}</span>
            </div>
          </div>
          <WeekStreak stats={stats} streak={streak} />
        </div>
      </section>

      <section className="catalogue-how">
        <div>
          <span>1</span>
          <h3>{m.catalogue.how.learnTitle}</h3>
          <p>{m.catalogue.how.learnText}</p>
        </div>
        <div>
          <span>2</span>
          <h3>{m.catalogue.how.playTitle}</h3>
          <p>{m.catalogue.how.playText}</p>
        </div>
        <div>
          <span>3</span>
          <h3>{m.catalogue.how.automaticTitle}</h3>
          <p>{m.catalogue.how.automaticText}</p>
        </div>
      </section>

      <section className="catalogue-body" id="courses">
        <div className="catalogue-toolbar">
          <div
            className="catalogue-filters"
            role="group"
            aria-label={m.catalogue.sideAria}
          >
            {(["all", "white", "black"] as SideFilter[]).map((value) => (
              <button
                key={value}
                type="button"
                className={side === value ? "is-active" : ""}
                onClick={() => setSide(value)}
              >
                {value === "all"
                  ? m.common.all
                  : value === "white"
                    ? m.common.white
                    : m.common.black}
              </button>
            ))}
          </div>

          <div className="catalogue-tools">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={m.catalogue.searchPlaceholder}
              aria-label={m.catalogue.searchAria}
            />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              aria-label={m.catalogue.sortAria}
            >
              <option value="last">{m.catalogue.sortLast}</option>
              <option value="progress">{m.catalogue.sortProgress}</option>
              <option value="az">{m.catalogue.sortAz}</option>
            </select>
          </div>
        </div>

        <p className="catalogue-sort-note">{sortNote}</p>

        {cards.length === 0 ? (
          <div className="catalogue-empty">
            <h2>{m.catalogue.emptyTitle}</h2>
            <p>{m.catalogue.emptyText}</p>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setQuery("");
                setSide("all");
              }}
            >
              {m.catalogue.clearFilters}
            </button>
          </div>
        ) : (
          <div className="catalogue-grid">
            {cards.map((opening) => {
              const total = opening.lines.length;
              const finished = opening.lines.filter((line) =>
                completedOf(store[line.id]),
              ).length;
              const clean = opening.lines.filter((line) =>
                learnedOf(store[line.id]),
              ).length;
              const due = opening.lines.filter((line) =>
                isDue(store[line.id]),
              ).length;
              const pct = total ? (clean / total) * 100 : 0;
              const allClean = total > 0 && clean === total;

              return (
                <article
                  className={`catalogue-card${finished > 0 ? " is-finished" : ""}${
                    allClean ? " is-clean" : ""
                  }`}
                  key={opening.slug}
                >
                  <Link
                    href={`/openings/${opening.slug}`}
                    className="catalogue-card-board"
                    aria-label={fill(m.catalogue.openCourseAria, {
                      name: opening.name,
                    })}
                  >
                    <MiniBoard
                      fen={previews[opening.slug]}
                      orientation={opening.side}
                      label={fill(m.catalogue.positionLabel, {
                        name: opening.name,
                      })}
                    />
                    <span className="catalogue-side">
                      {opening.side === "white"
                        ? m.common.white
                        : m.common.black}
                    </span>
                    {due > 0 ? (
                      <span className="catalogue-due">
                        {fill(m.catalogue.due, { count: due })}
                      </span>
                    ) : null}
                  </Link>

                  <div className="catalogue-card-body">
                    <div className="catalogue-card-title">
                      <h2>{opening.name}</h2>
                      <span>{opening.eco}</span>
                    </div>
                    <p className="catalogue-card-summary">{opening.intro}</p>
                    <div className="catalogue-card-tags">
                      {opening.themes.slice(0, 3).map((theme) => (
                        <span key={theme}>{theme}</span>
                      ))}
                    </div>

                    <div className="catalogue-progress">
                      <span className="catalogue-progress-bar">
                        <span style={{ width: `${pct}%` }} />
                      </span>
                      <span>
                        {fill(m.catalogue.learnedOf, {
                          learned: clean,
                          total,
                        })}
                      </span>
                    </div>

                    <div className="catalogue-card-foot">
                      <span>
                        {fill(m.catalogue.finishedOf, {
                          finished,
                          total,
                        })}
                      </span>
                      <Link
                        href={`/openings/${opening.slug}`}
                        className="catalogue-card-cta"
                      >
                        {finished > 0
                          ? m.catalogue.continueCourse
                          : m.catalogue.startCourse}{" "}
                        {m.common.arrowForward}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
