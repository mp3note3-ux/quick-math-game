import { rankForXp } from "../domain/progression";
import { useI18n } from "./I18nContext";
import type { CatalogKey } from "../i18n/index";

/** Maps a rank id to its localized name key. */
const RANK_NAME_KEYS: Record<string, CatalogKey> = {
  novice: "rankNovice",
  spotter: "rankSpotter",
  "pattern-seeker": "rankPatternSeeker",
  "set-finder": "rankSetFinder",
  "combo-master": "rankComboMaster",
  grandmaster: "rankGrandmaster",
};

export function rankNameKey(rankId: string): CatalogKey {
  return RANK_NAME_KEYS[rankId] ?? "rankNovice";
}

interface RankBarProps {
  xp: number;
  /**
   * "full" is the stacked panel used on home/results. "compact" is a slim
   * inline strip for the in-game HUD, so mastery stays visible during play
   * without competing with the board.
   */
  variant?: "full" | "compact";
}

/**
 * Mastery rank + progress-to-next-rank bar. Purely presentational: it reads
 * the player's total XP and renders the current rank and an accessible
 * progress bar toward the next rank.
 */
export function RankBar({ xp, variant = "full" }: RankBarProps) {
  const { t } = useI18n();
  const progress = rankForXp(xp);
  const rankName = t(rankNameKey(progress.rank.id));
  const percent = Math.round(progress.fraction * 100);

  const track = (
    <div
      className="rank-track"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={t("rankLabel")}
    >
      <div className="rank-fill" style={{ width: `${percent}%` }} />
    </div>
  );

  if (variant === "compact") {
    return (
      <div className="rank-bar rank-bar-compact">
        <span className="rank-label">{t("rankLabel")}</span>
        <strong className="rank-name">{rankName}</strong>
        {track}
        <span className="rank-next rank-next-inline">
          {progress.nextRank === null
            ? t("maxRankReached")
            : t("nextRankProgress", {
                xp: progress.xpIntoRank,
                needed: progress.xpForNext,
                rank: t(rankNameKey(progress.nextRank.id)),
              })}
        </span>
      </div>
    );
  }

  return (
    <div className="rank-bar">
      <div className="rank-bar-top">
        <span className="rank-label">{t("rankLabel")}</span>
        <strong className="rank-name">{rankName}</strong>
      </div>
      {track}
      <p className="rank-next">
        {progress.nextRank === null
          ? t("maxRankReached")
          : t("nextRankProgress", {
              xp: progress.xpIntoRank,
              needed: progress.xpForNext,
              rank: t(rankNameKey(progress.nextRank.id)),
            })}
      </p>
    </div>
  );
}
