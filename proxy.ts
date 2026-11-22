import { NextResponse, type NextRequest } from "next/server";
import {
  defaultLocale,
  isLocale,
  localeCookie,
  type Locale,
} from "./lib/i18n/config";

function preferredLocale(request: NextRequest): Locale {
  const saved = request.cookies.get(localeCookie)?.value;
  if (isLocale(saved)) return saved;

  const header = request.headers.get("accept-language")?.toLowerCase() ?? "";
  // Arabic is the only non-English language, so a simple check is enough.
  if (header.split(",").some((part) => part.trim().startsWith("ar"))) {
    return "ar";
  }
  return defaultLocale;
}

/**
 * Every page lives under `/en` or `/ar`. Requests without a locale are
 * redirected using the saved cookie first, then the browser language.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];
  if (isLocale(first)) return;

  const locale = preferredLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals, API routes and any request for a file with a dot.
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
