"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { fill } from "@/lib/i18n/plural";

const THEMES = ["teal", "blue", "violet", "amber"] as const;

type ThemeId = (typeof THEMES)[number];

const STORAGE_KEY = "chess-coach-theme";

export function ThemeSwitcher() {
  const { m } = useI18n();
  const [theme, setTheme] = useState<ThemeId>("teal");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeId | null;
      if (saved && THEMES.includes(saved)) {
        setTheme(saved);
        document.documentElement.dataset.theme = saved;
      }
    } catch {
      // Local storage can be blocked; the default theme still works.
    }
  }, []);

  function cycleTheme() {
    const index = THEMES.indexOf(theme);
    const next = THEMES[(index + 1) % THEMES.length];
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }

  const current = THEMES.includes(theme) ? theme : THEMES[0];
  const label = m.theme.names[current];

  return (
    <button
      type="button"
      className="theme-switcher"
      onClick={cycleTheme}
      title={fill(m.theme.title, { name: label })}
      aria-label={fill(m.theme.aria, { name: label })}
    >
      <span className="theme-dot" aria-hidden />
      <span className="theme-label">{label}</span>
    </button>
  );
}
