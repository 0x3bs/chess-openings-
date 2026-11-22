import type { Locale } from "../config";
import { ar } from "./ar";
import { en, type Messages } from "./en";

export const messages: Record<Locale, Messages> = { en, ar };

export function getMessages(locale: Locale): Messages {
  return messages[locale];
}

export type { Messages };
