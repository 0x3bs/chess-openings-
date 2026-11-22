"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";
import { fill } from "@/lib/i18n/plural";
import type { TrainingStats } from "@/lib/progress";

function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

export function WeekStreak({
  stats,
  streak,
}: {
  stats: TrainingStats;
  streak: number;
}) {
  const { m } = useI18n();
  const trained = new Set(stats.days);
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  const days = m.week.days.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = localDay(date);
    return {
      label,
      name: m.week.names[index],
      date: date.getDate(),
      done: trained.has(key),
      today: key === localDay(now),
    };
  });

  return (
    <div className="week-streak">
      <div className="week-streak-head">
        <span>{m.week.dayStreak}</span>
        <strong>🔥 {streak}</strong>
      </div>
      <div className="week-streak-days" aria-label={m.week.aria}>
        {days.map((day) => {
          const status = day.done ? m.week.trained : m.week.notTrained;
          return (
            <span
              key={`${day.name}-${day.date}`}
              className={`week-day${day.done ? " is-done" : ""}${
                day.today ? " is-today" : ""
              }`}
              title={`${day.name}: ${status}`}
              aria-label={fill(m.week.dayAria, {
                name: day.name,
                status,
              })}
            >
              <em>{day.label}</em>
              <i>{day.done ? "✓" : day.date}</i>
            </span>
          );
        })}
      </div>
    </div>
  );
}
