export const locales = ["en", "ar"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Cookie that remembers the reader's language across visits. */
export const localeCookie = "chess-coach-locale";

export const localeNames: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

export const localeLabels: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "ar";
}

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

/**
 * Prefix a route with its locale. `localePath("ar", "/openings")` returns
 * `/ar/openings`; passing `/` keeps a single trailing slash.
 */
export function localePath(locale: Locale, path: string): string {
  // Hashes and external URLs are not locale routes.
  if (path.startsWith("#")) return path;
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean}`;
}

/** Replace the locale segment of a pathname, keeping the rest untouched. */
export function switchLocalePath(pathname: string, locale: Locale): string {
  const parts = pathname.split("/");
  if (isLocale(parts[1])) {
    parts[1] = locale;
    return parts.join("/") || `/${locale}`;
  }
  return localePath(locale, pathname || "/");
}
