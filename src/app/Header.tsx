import { LanguageSwitcher } from "../features/settings/LanguageSwitcher";
import { useI18n } from "./I18nContext";

interface HeaderProps {
  showQuit?: boolean;
  showBrand?: boolean;
  onHome?: () => void;
  onQuit?: () => void;
}

/** The title screen already shows the game name as a logo, so it hides the brand link. */
export function Header({ showQuit = false, showBrand = true, onHome, onQuit }: HeaderProps) {
  const { t } = useI18n();
  return (
    <header className={`topbar ${showBrand ? "" : "topbar-end"}`}>
      {showBrand ? (
        <a
          className="brand"
          href="#"
          aria-label={`${t("appName")} ${t("home")}`}
          onClick={(event) => {
            event.preventDefault();
            onHome?.();
          }}
        >
          <span className="brand-mark" aria-hidden="true">
            ♦
          </span>
          <span>{t("appName")}</span>
        </a>
      ) : null}
      <div className="topbar-actions">
        <LanguageSwitcher />
        {showQuit ? (
          <button className="button button-small" type="button" onClick={onQuit}>
            {t("quit")}
          </button>
        ) : null}
      </div>
    </header>
  );
}
