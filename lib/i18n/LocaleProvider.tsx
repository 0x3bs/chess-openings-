"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { dirFor, type Locale } from "./config";
import { messages, type Messages } from "./messages";
import { pluralize, type PluralValue } from "./plural";

type I18nValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  m: Messages;
  /** Pick the right plural form and fill `{count}` / extra variables. */
  p: (
    value: PluralValue,
    count: number,
    vars?: Record<string, string | number>,
  ) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({
      locale,
      dir: dirFor(locale),
      m: messages[locale],
      p: (forms, count, vars) => pluralize(locale, forms, count, vars),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used inside a LocaleProvider.");
  }
  return value;
}

/** Small helper for plain string templates such as `{count} lines`. */
export function fill(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}
