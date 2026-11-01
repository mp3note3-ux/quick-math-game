import en from "./locales/en.json";
import ko from "./locales/ko.json";

export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = Object.freeze(["en", "ko"]);
const STORAGE_KEY = "combination-game-language";

const catalogs = Object.freeze({ en, ko });

function normalizeLocale(value) {
  return SUPPORTED_LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}

function readSavedLocale() {
  try {
    return normalizeLocale(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function createI18n(onChange = () => {}) {
  let locale = readSavedLocale();

  function t(key, variables = {}) {
    const template = catalogs[locale]?.[key] ?? catalogs[DEFAULT_LOCALE]?.[key] ?? key;
    return String(template).replace(/\{(\w+)\}/g, (match, name) => {
      return Object.hasOwn(variables, name) ? String(variables[name]) : match;
    });
  }

  function setLocale(nextLocale) {
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
