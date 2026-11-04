import { LanguageSwitcher } from "../features/settings/LanguageSwitcher";
import type { CatalogKey } from "../i18n/index";
import { useI18n } from "./I18nContext";

/** Top-level sections the shared navigation can open. */
export type NavTarget = "play" | "rules" | "settings";

const NAV_ITEMS: ReadonlyArray<{ target: NavTarget; labelKey: CatalogKey }> = [
  { target: "play", labelKey: "navPlay" },
  { target: "rules", labelKey: "navRules" },
  { target: "settings", labelKey: "navSettings" },
];

interface HeaderProps {
  showQuit?: boolean;
  showBrand?: boolean;
  onHome?: () => void;
  onQuit?: () => void;
  /** Current top-level section, highlighted in the navigation. */
  currentNav?: NavTarget;
  /** When provided, the Play/Rules/Settings navigation is rendered. */
  onNavigate?: (target: NavTarget) => void;
}

/** The title screen already shows the game name as a logo, so it hides the brand link. */
export function Header({
  showQuit = false,
  showBrand = true,
  onHome,
  onQuit,
  currentNav,
  onNavigate,
}: HeaderProps) {
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
      {onNavigate ? (
        <nav className="main-nav" aria-label={t("navLabel")}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.target}
              className={`nav-item ${currentNav === item.target ? "is-active" : ""}`}
              type="button"
              aria-current={currentNav === item.target ? "page" : undefined}
              onClick={() => onNavigate(item.target)}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </nav>
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
