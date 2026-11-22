import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EnglishCourse } from "@/components/EnglishCourse";
import { isLocale, locales } from "@/lib/i18n/config";
import { getLocalizedOpening } from "@/lib/i18n/openings";
import { getMessages } from "@/lib/i18n/messages";
import { openings } from "@/lib/openings";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    openings.map((opening) => ({ locale, slug: opening.slug })),
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const opening = getLocalizedOpening(locale, slug);
  if (!opening) return { title: getMessages(locale).meta.notFoundTitle };

  const m = getMessages(locale);
  return {
    title: `${opening.name} — ${m.nav.brand}`,
    description: m.meta.courseDescription.replace("{intro}", opening.intro),
    alternates: {
      canonical: `/${locale}/openings/${slug}`,
      languages: {
        en: `/en/openings/${slug}`,
        ar: `/ar/openings/${slug}`,
      },
    },
  };
}

export default async function OpeningPage({ params }: PageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const opening = getLocalizedOpening(locale, slug);
  if (!opening) notFound();

  return <EnglishCourse opening={opening} />;
}
