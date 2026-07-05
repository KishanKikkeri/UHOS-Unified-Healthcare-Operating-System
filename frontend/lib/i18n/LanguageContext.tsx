"use client";

/**
 * Phase 6 — Multilingual AI.
 *
 * Deliberately lightweight per the handover doc ("if a translation service
 * is needed, keep it lightweight" / "no complex localization backend"):
 * plain JSON dictionaries + a React Context, no next-intl/i18next. Adding
 * a language is just adding a JSON file and one entry in `messages` below.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import en from "@/messages/en.json";
import hi from "@/messages/hi.json";
import kn from "@/messages/kn.json";
import gu from "@/messages/gu.json";

export type SupportedLanguage = "en" | "hi" | "kn" | "gu";

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["en", "hi", "kn", "gu"];

const messages: Record<SupportedLanguage, Record<string, unknown>> = { en, hi, kn, gu };

const STORAGE_KEY = "uhos.language";

type Dict = Record<string, unknown>;

function lookup(dict: Dict, path: string): string | undefined {
  const value = path
    .split(".")
    .reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Dict)[key] : undefined), dict);
  return typeof value === "string" ? value : undefined;
}

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");

  // Restore the user's last choice. Client-only (guarded), so this never
  // runs during server rendering / build.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES.includes(saved as SupportedLanguage)) {
      setLanguageState(saved as SupportedLanguage);
    }
  }, []);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, lang);
    }
  }, []);

  const t = useCallback(
    (key: string) => {
      // Fall back to English, then to the raw key, so a missing
      // translation never crashes the UI or shows a blank label.
      return (
        lookup(messages[language], key) ??
        lookup(messages.en, key) ??
        key
      );
    },
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
