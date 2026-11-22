import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n/config";
import { openings } from "@/lib/openings";

const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/openings", "/progress"];

  return locales.flatMap((locale) => [
    ...pages.map((page) => ({
      url: `${base}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: page === "" ? 1 : 0.8,
    })),
    ...openings.map((opening) => ({
      url: `${base}/${locale}/openings/${opening.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ]);
}
