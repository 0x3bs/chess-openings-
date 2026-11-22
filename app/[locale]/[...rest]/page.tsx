import { notFound } from "next/navigation";

/**
 * Catch unknown paths inside a locale so the bilingual not-found boundary is
 * used instead of Next's built-in English 404.
 */
export default function CatchAllPage() {
  notFound();
}
