import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AccountMenu } from "@/components/AccountMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LocaleLink as Link } from "@/components/LocaleLink";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { dirFor, isLocale, locales } from "@/lib/i18n/config";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getMessages } from "@/lib/i18n/messages";
import "../globals.css";

type LayoutProps = {
  params: Promise<{ locale: string }>;
  children: ReactNode;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const m = getMessages(locale);
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    ),
    title: m.meta.siteTitle,
    description: m.meta.siteDescription,
  };
}

export default async function LocaleLayout({
  params,
  children,
}: LayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const m = getMessages(locale);

  return (
    <html lang={locale} dir={dirFor(locale)} suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('chess-coach-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}})()",
          }}
        />
        <LocaleProvider locale={locale}>
          <header className="site-header">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden>
                ♞
              </span>
              <span>{m.nav.brand}</span>
            </Link>
            <nav className="site-nav">
              <LanguageSwitcher />
              <ThemeSwitcher />
              <Link href="/openings">{m.nav.openings}</Link>
              <Link href="/progress">{m.nav.dashboard}</Link>
              <AccountMenu />
            </nav>
          </header>
          {children}
          <footer className="site-footer">
            <span>{m.nav.footer}</span>
          </footer>
        </LocaleProvider>
      </body>
    </html>
  );
}
