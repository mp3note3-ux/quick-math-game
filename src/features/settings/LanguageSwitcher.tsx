import { SUPPORTED_LOCALES, type Locale } from "../../i18n/index";
import { useI18n } from "../../app/I18nContext";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  ko: "한국어",
};

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="language-switcher" role="group" aria-label={t("language")}>
      {SUPPORTED_LOCALES.map((option) => (
        <button
          key={option}
          className={`language-option ${locale === option ? "is-active" : ""}`}
          type="button"
          aria-pressed={locale === option}
          onClick={() => setLocale(option)}
        >
          {LOCALE_LABELS[option]}
        </button>
      ))}
    </div>
  );
}
