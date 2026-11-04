import { useEffect, useRef } from "react";
import { Header, type NavTarget } from "../../app/Header";
import { useI18n } from "../../app/I18nContext";
import { RankBar } from "../../app/RankBar";
import type { PersonalStats } from "../../domain/progression";
import { isEligibleForRanking, type SessionState } from "../../domain/session";

interface ResultsScreenProps {
  playerName: string;
  state: SessionState;
  /** Persistent mastery stats, already including this session. */
  stats: PersonalStats;
  /** XP earned by this session's verified sets (checkpointed per board). */
  sessionXpEarned: number;
  onPlayAgain: () => void;
  onHome: () => void;
  onNavigate: (target: NavTarget) => void;
}

export function ResultsScreen({ playerName, state, stats, sessionXpEarned, onPlayAgain, onHome, onNavigate }: ResultsScreenProps) {
  const { t } = useI18n();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const eligible = isEligibleForRanking(state);

  return (
    <div className="screen">
      <Header onHome={onHome} currentNav="play" onNavigate={onNavigate} />
      <main className="results window">
        <p className="window-title">{t("resultsTitle")}</p>
        <h1 ref={headingRef} tabIndex={-1}>
          {t("resultsSubtitle", { name: playerName })}
        </h1>

        <div className="final-score">
          <span>{t("finalScore")}</span>
          <strong>{state.score}</strong>
          <small>{t("pointsLabel")}</small>
        </div>

        <div className="results-stats">
          <div className="hud-cell">
            <span className="hud-label">{t("roundsCompleted")}</span>
            <strong className="hud-value">
              {state.roundsCompleted} / {state.totalRounds}
            </strong>
          </div>
          <div className="hud-cell">
            <span className="hud-label">{t("totalSetsFound")}</span>
            <strong className="hud-value">{state.totalSetsFound}</strong>
          </div>
          <div className="hud-cell session-breakdown">
            <span className="hud-label">{t("sessionSetsByLevel")}</span>
            <strong className="hud-value">
              {state.setsFoundByLevel
                .map((count, index) => `${t("masteryLevelLabel", { level: index + 1 })} ${count}`)
                .join(" · ")}
            </strong>
          </div>
          <div className="hud-cell">
            <span className="hud-label">{t("xpEarnedThisSession")}</span>
            <strong className="hud-value">{sessionXpEarned}</strong>
          </div>
        </div>

        {eligible ? null : <p className="unranked-note">{t("unrankedNote")}</p>}

        <section className="mastery" aria-label={t("masteryTitle")}>
          <h2 className="window-title">{t("masteryTitle")}</h2>
          <RankBar xp={stats.xp} />
          <div className="results-stats">
            <div className="hud-cell">
              <span className="hud-label">{t("masteryXp")}</span>
              <strong className="hud-value">{stats.xp}</strong>
            </div>
            <div className="hud-cell">
              <span className="hud-label">{t("masteryBestScore")}</span>
              <strong className="hud-value">{stats.bestScore ?? "—"}</strong>
            </div>
            <div className="hud-cell">
              <span className="hud-label">{t("masteryBoardsCleared")}</span>
              <strong className="hud-value">{stats.boardsCleared}</strong>
            </div>
            <div className="hud-cell">
              <span className="hud-label">{t("masterySetsByLevel")}</span>
              <strong className="hud-value">
                {stats.setsByLevel
                  .map((count, index) => `${t("masteryLevelLabel", { level: index + 1 })} ${count}`)
                  .join(" · ")}
              </strong>
            </div>
          </div>
          <p className="local-note">{t("masteryLocalNote")}</p>
        </section>

        <div className="results-actions">
          <button className="button button-primary" type="button" onClick={onPlayAgain}>
            {t("playAgain")}
          </button>
          <button className="button" type="button" onClick={onHome}>
            {t("returnHome")}
          </button>
        </div>
      </main>
    </div>
  );
}
