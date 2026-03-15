import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
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

  // Load the user's saved language preference on login
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("content_language")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.content_language) {
          setLangState(data.content_language as ContentLanguage);
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
