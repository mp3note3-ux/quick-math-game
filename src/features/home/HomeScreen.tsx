import { useEffect, useRef, useState, type FormEvent } from "react";
import { Header, type NavTarget } from "../../app/Header";
import { useI18n } from "../../app/I18nContext";
import { formatDelta } from "../../app/format";
import { RankBar } from "../../app/RankBar";
import type { PersonalStats } from "../../domain/progression";
import type { ScoringConfig } from "../../domain/scoring";
import type { CatalogKey } from "../../i18n/index";

interface HomeScreenProps {
  initialName: string;
  config: ScoringConfig;
  stats: PersonalStats;
  onStart: (name: string) => void;
  onHome: () => void;
  onNavigate: (target: NavTarget) => void;
}

const HOW_TO_STEPS: ReadonlyArray<{ title: CatalogKey; body: CatalogKey }> = [
  { title: "howToStepOneTitle", body: "howToStepOneBody" },
  { title: "howToStepTwoTitle", body: "howToStepTwoBody" },
  { title: "howToStepThreeTitle", body: "howToStepThreeBody" },
];

/** Reward range shown in the rules, sourced from the live scoring config. */
function rewardSummary(config: ScoringConfig): string {
  const [one, two, three] = config.levelRewards;
  return one === two && two === three ? `+${one}` : `+${Math.min(one, two, three)}–${Math.max(one, two, three)}`;
}

export function HomeScreen({ initialName, config, stats, onStart, onHome, onNavigate }: HomeScreenProps) {
  const { t } = useI18n();
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Native constraint validation runs before the submit event fires, so the
  // localized message must be set on the field ahead of time — setting it in
  // the submit handler is too late (the browser shows its default message).
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.setCustomValidity(name.trim() === "" ? t("playerNameRequired") : "");
  }, [name, t]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      inputRef.current?.setCustomValidity(t("playerNameRequired"));
      inputRef.current?.reportValidity();
      return;
    }
    onStart(trimmed);
  }

  return (
    <div className="screen">
      <Header showBrand={false} onHome={onHome} currentNav="play" onNavigate={onNavigate} />
      <main>
        <section className="title-logo">
          <h1>{t("appName")}</h1>
          <p>{t("tagline")}</p>
        </section>

        <div className="title-grid">
          <section className="window" aria-label={t("singlePlayerTitle")}>
            <form id="start-form" onSubmit={handleSubmit} noValidate={false}>
              <div className="name-field">
                <label htmlFor="player-name">{t("playerNameLabel")}</label>
                <input
                  id="player-name"
                  name="playerName"
                  ref={inputRef}
                  maxLength={18}
                  autoComplete="nickname"
                  placeholder={t("playerNamePlaceholder")}
                  value={name}
                  required
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <button className="menu-item menu-item-primary" type="submit">
                {t("startSinglePlayer")}
              </button>
            </form>
            <button className="menu-item" type="button" disabled title={t("multiplayerNotReady")}>
              <span>{t("multiplayerTitle")}</span>
              <span className="tag">{t("comingSoon")}</span>
            </button>
            <div className="home-rank">
              <RankBar xp={stats.xp} />
            </div>
          </section>

          <section className="window" aria-label={t("howToTitle")}>
            <h2 className="window-title">{t("howToTitle")}</h2>
            <ol className="rules">
              {HOW_TO_STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="num">{index + 1}</span>
                  <div>
                    <strong>{t(step.title)}</strong>
                    <p>{t(step.body)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="scoring-summary">
              {t("howToScoring", {
                reward: rewardSummary(config),
                penalty: formatDelta(config.wrongSetPenalty),
                bonus: formatDelta(config.noSetsBonus),
              })}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
