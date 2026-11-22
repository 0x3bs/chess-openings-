import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OpeningsCatalogue } from "@/components/OpeningsCatalogue";
import { isLocale } from "@/lib/i18n/config";
import { getLocalizedOpenings } from "@/lib/i18n/openings";
import { getMessages } from "@/lib/i18n/messages";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const m = getMessages(locale);
  return {
    title: m.meta.openingsTitle,
    description: m.meta.openingsDescription,
    alternates: {
      canonical: `/${locale}/openings`,
      languages: { en: "/en/openings", ar: "/ar/openings" },
    },
  };
}

export default async function OpeningsPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <OpeningsCatalogue openings={getLocalizedOpenings(locale)} />;
}
