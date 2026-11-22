import type { Locale } from "./config";

/**
 * Plural forms with enough slots for Arabic's zero/one/two/few/many rules.
 * English only uses `one` and `other`; the extra slots are ignored there.
 */
export type PluralForms = {
  zero?: string;
  one: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
};

export type PluralValue = string | PluralForms;

export function isPlural(value: unknown): value is PluralForms {
  return (
    typeof value === "object" &&
    value !== null &&
    "one" in value &&
    "other" in value
  );
}

export function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/** Alias used by content builders that only need string interpolation. */
export const fill = interpolate;

export function selectPlural(
  locale: Locale,
  forms: PluralForms,
  count: number,
): string {
  if (locale === "ar") {
    if (count === 0) return forms.zero ?? forms.other;
    if (count === 1) return forms.one;
    if (count === 2) return forms.two ?? forms.other;
    const mod = count % 100;
    if (mod >= 3 && mod <= 10) return forms.few ?? forms.other;
    if (mod >= 11 && mod <= 99) return forms.many ?? forms.other;
    return forms.other;
  }

  return count === 1 ? forms.one : forms.other;
}

export function pluralize(
  locale: Locale,
  value: PluralValue,
  count: number,
  vars?: Record<string, string | number>,
): string {
  const template = isPlural(value)
    ? selectPlural(locale, value, count)
    : value;
  return interpolate(template, { ...vars, count });
}
