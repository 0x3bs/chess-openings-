import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Dashboard } from "@/components/Dashboard";
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
    title: m.meta.progressTitle,
    description: m.meta.progressDescription,
    alternates: {
      canonical: `/${locale}/progress`,
      languages: { en: "/en/progress", ar: "/ar/progress" },
    },
  };
}

export default async function ProgressPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <Dashboard openings={getLocalizedOpenings(locale)} />;
}
