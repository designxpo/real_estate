import { en, type Dictionary } from "./en";
import { hi } from "./hi";

export type { Dictionary };

const DICTS: Record<string, Dictionary> = { en, hi };

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
];

// Resolve a dictionary by language code, falling back to English.
export function getDictionary(lang: string | null | undefined): Dictionary {
  if (lang && DICTS[lang]) return DICTS[lang];
  return en;
}
