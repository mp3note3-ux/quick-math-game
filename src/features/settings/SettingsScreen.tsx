import { useEffect, useRef, useState } from "react";
import { Header, type NavTarget } from "../../app/Header";
import { useI18n } from "../../app/I18nContext";
import {
  type Preferences,
  type ReducedMotionPreference,
  type SizePreference,
  type ThemePreference,
} from "../../domain/preferences";
import { SUPPORTED_LOCALES, type Locale } from "../../i18n/index";
import type { CatalogKey } from "../../i18n/index";

interface SettingsScreenProps {
  preferences: Preferences;
  onPreferencesChange: (next: Preferences) => void;
  /** Whether browser storage accepted a probe write (honest save status). */
  storageAvailable: boolean;
  /** Erases mastery progress (XP, ranks, stats) after the inline confirm. */
  onResetMastery: () => void;
  onNavigate: (target: NavTarget) => void;
  onHome: () => void;
}

const LOCALE_LABEL_KEYS: Record<Locale, CatalogKey> = {
  en: "languageEnglish",
  ko: "languageKorean",
};

/**
 * A row of chunky option buttons (one active), used for every enumerated
 * preference. Buttons carry aria-pressed and the group is labelled, so the
 * control works with keyboards and screen readers.
 */
function OptionGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="setting-row">
      <span className="setting-label">{legend}</span>
      <div className="setting-options" role="group" aria-label={legend}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`language-option ${value === option.value ? "is-active" : ""}`}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** On/off toggle in the same chunky style, with real pressed state. */
function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="setting-row">
      <span className="setting-label" id={`toggle-${label}`}>
        {label}
      </span>
      <div className="setting-options" role="group" aria-label={label}>
        <button
          type="button"
          className={`language-option ${value ? "is-active" : ""}`}
          aria-pressed={value}
          onClick={() => onChange(true)}
        >
          {t("settingsOn")}
        </button>
        <button
          type="button"
          className={`language-option ${value ? "" : "is-active"}`}
          aria-pressed={!value}
          onClick={() => onChange(false)}
        >
          {t("settingsOff")}
        </button>
      </div>
    </div>
  );
}

/**
 * Player-facing settings: appearance, accessibility, language, and local
 * data. Every control applies immediately (live preview), persists through
 * the versioned profile repository, and never affects score or XP.
 */
export function SettingsScreen({
  preferences,
  onPreferencesChange,
  storageAvailable,
  onResetMastery,
  onNavigate,
  onHome,
}: SettingsScreenProps) {
  const { t, locale, setLocale } = useI18n();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [resetArmed, setResetArmed] = useState(false);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    onPreferencesChange({ ...preferences, [key]: value });
  }

  function sizeOptions(labelKeys: Record<SizePreference, CatalogKey>) {
    return (["small", "standard", "large"] as const).map((value) => ({
      value,
      label: t(labelKeys[value]),
    }));
  }

  const themeOptions: ReadonlyArray<{ value: ThemePreference; label: string }> = [
    { value: "classic", label: t("settingsThemeClassic") },
    { value: "high-contrast", label: t("settingsThemeHighContrast") },
  ];

  const motionOptions: ReadonlyArray<{ value: ReducedMotionPreference; label: string }> = [
    { value: "system", label: t("settingsMotionSystem") },
    { value: "on", label: t("settingsMotionOn") },
    { value: "off", label: t("settingsMotionOff") },
  ];

  return (
    <div className="screen">
      <Header currentNav="settings" onNavigate={onNavigate} onHome={onHome} />
      <main className="settings-page">
        <h1 ref={headingRef} tabIndex={-1} className="page-heading">
          {t("settingsTitle")}
        </h1>
        <p className="settings-note">{t("settingsSavedNote")}</p>

        <section className="window rule-section" aria-labelledby="settings-general">
          <h2 className="window-title" id="settings-general">
            {t("settingsGeneralTitle")}
          </h2>
          <OptionGroup<Locale>
            legend={t("language")}
            options={SUPPORTED_LOCALES.map((value) => ({
              value,
              label: t(LOCALE_LABEL_KEYS[value]),
            }))}
            value={locale}
            onChange={setLocale}
          />
        </section>

        <section className="window rule-section" aria-labelledby="settings-appearance">
          <h2 className="window-title" id="settings-appearance">
            {t("settingsAppearanceTitle")}
          </h2>
          <OptionGroup<ThemePreference>
            legend={t("settingsThemeLabel")}
            options={themeOptions}
            value={preferences.theme}
            onChange={(value) => update("theme", value)}
          />
          <OptionGroup<SizePreference>
            legend={t("settingsCardSizeLabel")}
            options={sizeOptions({
              small: "settingsSizeSmall",
              standard: "settingsSizeStandard",
              large: "settingsSizeLarge",
            })}
            value={preferences.cardSize}
            onChange={(value) => update("cardSize", value)}
          />
          <OptionGroup<SizePreference>
            legend={t("settingsUiScaleLabel")}
            options={sizeOptions({
              small: "settingsSizeSmall",
              standard: "settingsSizeStandard",
              large: "settingsSizeLarge",
            })}
            value={preferences.uiScale}
            onChange={(value) => update("uiScale", value)}
          />
          <ToggleRow
            label={t("settingsScanlinesLabel")}
            value={preferences.scanlines}
            onChange={(value) => update("scanlines", value)}
          />
        </section>

        <section className="window rule-section" aria-labelledby="settings-accessibility">
          <h2 className="window-title" id="settings-accessibility">
            {t("settingsAccessibilityTitle")}
          </h2>
          <OptionGroup<ReducedMotionPreference>
            legend={t("settingsReducedMotionLabel")}
            options={motionOptions}
            value={preferences.reducedMotion}
            onChange={(value) => update("reducedMotion", value)}
          />
          <ToggleRow
            label={t("settingsStrongFocusLabel")}
            value={preferences.strongFocus}
            onChange={(value) => update("strongFocus", value)}
          />
          <p className="setting-hint">{t("settingsAccessibilityNote")}</p>
        </section>

        <section className="window rule-section" aria-labelledby="settings-data">
          <h2 className="window-title" id="settings-data">
            {t("settingsDataTitle")}
          </h2>
          <p className="setting-hint">{t("settingsDataLocalNote")}</p>
          <p className={`storage-status ${storageAvailable ? "is-ok" : "is-bad"}`} role="status">
            {storageAvailable ? t("settingsStorageOk") : t("settingsStorageUnavailable")}
          </p>
          {resetArmed ? (
            <div className="reset-confirm" role="alertdialog" aria-label={t("settingsResetLabel")}>
              <p>{t("settingsResetConfirmBody")}</p>
              <div className="modal-actions">
                <button
                  className="button button-danger"
                  type="button"
                  onClick={() => {
                    onResetMastery();
                    setResetArmed(false);
                  }}
                >
                  {t("settingsResetConfirm")}
                </button>
                <button className="button" type="button" onClick={() => setResetArmed(false)}>
                  {t("settingsResetCancel")}
                </button>
              </div>
            </div>
          ) : (
            <button className="button button-danger" type="button" onClick={() => setResetArmed(true)}>
              {t("settingsResetLabel")}
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
