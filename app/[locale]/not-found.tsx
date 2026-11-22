"use client";

import { LocaleLink as Link } from "@/components/LocaleLink";
import { useI18n } from "@/lib/i18n/LocaleProvider";

export default function NotFound() {
  const { m } = useI18n();

  return (
    <main className="page">
      <div className="auth-card">
        <p className="eyebrow">404</p>
        <h1>{m.notFound.title}</h1>
        <p>{m.notFound.text}</p>
        <div className="page-actions">
          <Link href="/openings" className="btn btn-primary">
            {m.notFound.back}
          </Link>
        </div>
      </div>
    </main>
  );
}
