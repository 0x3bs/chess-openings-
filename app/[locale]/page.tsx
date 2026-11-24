import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, localePath } from "@/lib/i18n/config";
import { getLocalizedOpenings } from "@/lib/i18n/openings";
import { courseLines } from "@/lib/openings/curation";
import { getMessages } from "@/lib/i18n/messages";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const m = getMessages(locale);
  return {
    title: m.meta.siteTitle,
    description: m.meta.siteDescription,
    alternates: {
      canonical: `/${locale}`,
      languages: { en: "/en", ar: "/ar" },
    },
  };
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const m = getMessages(locale);
  const openings = getLocalizedOpenings(locale);
  const totalLines = openings.reduce(
    (total, opening) => total + courseLines(opening).length,
    0,
  );
  const totalMoves = openings.reduce(
    (total, opening) =>
      total +
      courseLines(opening).reduce((sum, line) => sum + line.moves.length, 0),
    0,
  );

  return (
    <main className="landing">
      <section className="landing-hero">
        <p className="eyebrow">{m.home.eyebrow}</p>
        <h1 className="landing-title">
          {m.home.titleLead} <span>{m.home.titleAccent}</span>
        </h1>
        <p className="landing-lead">{m.home.lead}</p>
        <div className="landing-actions">
          <Link
            href={localePath(locale, "/openings")}
            className="btn btn-primary"
          >
            {m.home.browseCourses}
          </Link>
          <Link
            href={localePath(locale, "/progress")}
            className="btn btn-ghost"
          >
            {m.home.openDashboard}
          </Link>
        </div>
        <div className="landing-stats">
          <div>
            <strong>{openings.length}</strong>
            <span>{m.home.statCourses}</span>
          </div>
          <div>
            <strong>{totalLines.toLocaleString("en-US")}</strong>
            <span>{m.home.statLines}</span>
          </div>
          <div>
            <strong>{totalMoves.toLocaleString("en-US")}</strong>
            <span>{m.home.statIdeas}</span>
          </div>
        </div>
      </section>

      <section className="landing-grid">
        <article className="feature-card">
          <span className="feature-icon">💡</span>
          <h2>{m.home.features.ideaTitle}</h2>
          <p>{m.home.features.ideaText}</p>
        </article>
        <article className="feature-card">
          <span className="feature-icon">♟️</span>
          <h2>{m.home.features.boardTitle}</h2>
          <p>{m.home.features.boardText}</p>
        </article>
        <article className="feature-card">
          <span className="feature-icon">🎯</span>
          <h2>{m.home.features.drillTitle}</h2>
          <p>{m.home.features.drillText}</p>
        </article>
        <article className="feature-card">
          <span className="feature-icon">🔁</span>
          <h2>{m.home.features.reviewTitle}</h2>
          <p>{m.home.features.reviewText}</p>
        </article>
      </section>

      <section className="coach-explainer">
        <div className="explainer-copy">
          <p className="eyebrow">{m.home.coachEyebrow}</p>
          <h2>{m.home.coachTitle}</h2>
          <p>{m.home.coachText}</p>
          <Link
            href={localePath(locale, "/openings/english")}
            className="btn btn-primary"
          >
            {m.home.openEnglish}
          </Link>
        </div>
        <div className="explainer-cards">
          <div className="explainer-card coach-card-blue">
            <span className="coach-card-top">
              <span className="coach-dot coach-dot-blue" />
              <span className="coach-card-label">{m.home.cardIdeaLabel}</span>
            </span>
            <span className="coach-card-text">{m.home.cardIdeaText}</span>
          </div>
          <div className="explainer-card coach-card-green">
            <span className="coach-card-top">
              <span className="coach-dot coach-dot-green" />
              <span className="coach-card-label">{m.home.cardWhyLabel}</span>
            </span>
            <span className="coach-card-text">{m.home.cardWhyText}</span>
          </div>
          <div className="explainer-card coach-card-orange">
            <span className="coach-card-top">
              <span className="coach-dot coach-dot-orange" />
              <span className="coach-card-label">
                {m.home.cardCarefulLabel}
              </span>
            </span>
            <span className="coach-card-text">
              {m.home.cardCarefulText}
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
