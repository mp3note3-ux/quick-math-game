import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  createI18n,
  DEFAULT_LOCALE,
  type CatalogKey,
  type I18n,
  type Locale,
  type TranslationVariables,
} from "../i18n/index";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: CatalogKey, variables?: TranslationVariables) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [i18n] = useState<I18n>(() => createI18n((next) => setLocale(next)));
  const [locale, setLocale] = useState<Locale>(() => i18n.getLocale());

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: (next) => i18n.setLocale(next),
      t: (key, variables) => i18n.t(key, variables),
    }),
    [i18n, locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (context === null) {
    throw new Error("useI18n must be used inside <I18nProvider>.");
  }
  return context;
}

export { DEFAULT_LOCALE };
