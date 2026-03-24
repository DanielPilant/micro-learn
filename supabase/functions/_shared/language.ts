export const SUPPORTED_LANGUAGES = ["en", "he"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  he: "Hebrew",
};
