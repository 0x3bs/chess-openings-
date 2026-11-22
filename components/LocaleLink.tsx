"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { localePath } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/LocaleProvider";

type LocaleLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children?: ReactNode;
  };

/**
 * A `next/link` that keeps the active locale in the URL. Every internal link
 * should use this instead of importing `next/link` directly.
 */
export function LocaleLink({ href, ...rest }: LocaleLinkProps) {
  const { locale } = useI18n();
  const target =
    typeof href === "string" ? localePath(locale, href) : href;
  return <Link href={target} {...rest} />;
}
