"use client";

import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import {
  localeCookie,
  switchLocalePath,
  type Locale,
} from "@/lib/i18n/config";

export function LanguageSwitcher() {
  const { locale, m } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const target: Locale = locale === "en" ? "ar" : "en";

  function switchLanguage() {
    document.cookie = `${localeCookie}=${target}; path=/; max-age=31536000; samesite=lax`;
    const query = window.location.search;
    router.push(`${switchLocalePath(pathname, target)}${query}`);
  }

  return (
    <button
      type="button"
      className="language-switcher"
      onClick={switchLanguage}
      title={m.nav.switchToAria}
      aria-label={m.nav.switchToAria}
      lang={target}
    >
      <span aria-hidden>🌐</span>
      <span>{m.nav.switchTo}</span>
    </button>
  );
}
