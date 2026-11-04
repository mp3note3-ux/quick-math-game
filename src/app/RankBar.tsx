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

/**
 * Mastery rank + progress-to-next-rank bar. Purely presentational: it reads
 * the player's total XP and renders the current rank and an accessible
 * progress bar toward the next rank.
 */
export function RankBar({ xp }: { xp: number }) {
  const { t } = useI18n();
  const progress = rankForXp(xp);
  const rankName = t(rankNameKey(progress.rank.id));
  const percent = Math.round(progress.fraction * 100);

  return (
    <div className="rank-bar">
      <div className="rank-bar-top">
        <span className="rank-label">{t("rankLabel")}</span>
        <strong className="rank-name">{rankName}</strong>
      </div>
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
