/**
 * Localization manager. English is the default and fallback language.
 *
 * Catalog parity is enforced at compile time: the Korean catalog must
 * satisfy the English catalog's type (`const koCatalog: Catalog = ko`),
 * and `src/i18n/locales.test.ts` verifies the reverse direction at runtime.
 */
import en from "./locales/en.json";
import ko from "./locales/ko.json";

export const SUPPORTED_LOCALES = ["en", "ko"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export type Catalog = typeof en;
export type CatalogKey = keyof Catalog;
export type TranslationVariables = Record<string, string | number>;

const STORAGE_KEY = "combination-game-language";

// Compile-time key parity: missing or mistyped Korean keys fail the build.
const koCatalog: Catalog = ko;
const catalogs: Record<Locale, Catalog> = { en, ko: koCatalog };

function normalizeLocale(value: unknown): Locale {
  return SUPPORTED_LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
}

function readSavedLocale(): Locale {
  try {
    return normalizeLocale(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export interface I18n {
  t(key: CatalogKey, variables?: TranslationVariables): string;
  getLocale(): Locale;
  setLocale(nextLocale: Locale): void;
  getSupportedLocales(): Locale[];
}

export function createI18n(onChange: (locale: Locale) => void = () => {}): I18n {
  let locale = readSavedLocale();

  function t(key: CatalogKey, variables: TranslationVariables = {}): string {
    const template = catalogs[locale][key] ?? catalogs[DEFAULT_LOCALE][key] ?? key;
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
      Object.hasOwn(variables, name) ? String(variables[name]) : match,
    );
  }

  function setLocale(nextLocale: Locale): void {
    const normalized = normalizeLocale(nextLocale);
    if (normalized === locale) return;
    locale = normalized;

    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // The language still changes for this session when storage is unavailable.
    }

    document.documentElement.lang = locale;
    onChange(locale);
  }

  document.documentElement.lang = locale;

  return Object.freeze({
    t,
    getLocale: () => locale,
    setLocale,
    getSupportedLocales: () => [...SUPPORTED_LOCALES],
  });
}
