import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { I18nManager } from "react-native";
import * as Updates from "expo-updates";
import { supabase } from "../services/supabase";
import { useAuth } from "./AuthContext";
import translations from "../i18n/translations";
import type { ContentLanguage, TranslationKey } from "../i18n/translations";

interface LanguageContextValue {
  lang: ContentLanguage;
  setLang: (lang: ContentLanguage) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [lang, setLangState] = useState<ContentLanguage>("en");

  // Load the user's saved language preference on login.
  // Also guards against the "fresh-install RTL trap": if the native
  // I18nManager direction doesn't match the stored language (e.g. the
  // user reinstalled the app), force-set RTL and reload immediately so
  // the layout direction is always in sync with the content language.
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("content_language")
      .eq("id", user.id)
      .single()
      .then(async ({ data }) => {
        if (!data?.content_language) return;

        const loadedLang = data.content_language as ContentLanguage;
        setLangState(loadedLang);

        const needsRTL = loadedLang === "he";
        if (I18nManager.isRTL !== needsRTL) {
          I18nManager.allowRTL(needsRTL);
          I18nManager.forceRTL(needsRTL);
          try {
            await Updates.reloadAsync();
          } catch {
            if (__DEV__) {
              const { DevSettings } = require("react-native");
              DevSettings.reload();
            }
            // In production, if Updates.reloadAsync() somehow fails, the
            // direction mismatch will self-correct on the next cold start
            // because I18nManager state is already persisted to native.
          }
        }
      });
  }, [user]);

  const setLang = useCallback((newLang: ContentLanguage) => {
    setLangState(newLang);
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>): string => {
      let text: string = translations[lang][key] ?? translations.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          text = text.replace(`{${k}}`, String(v));
        }
      }
      return text;
    },
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx)
    throw new Error("useLanguage must be used within <LanguageProvider>");
  return ctx;
}
