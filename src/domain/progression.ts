/**
 * Local mastery progression. Pure: no React, DOM, storage, or network.
 *
 * Mastery XP is deliberately minimal and SEPARATE from match score: it
 * rewards verified skill (sets found, boards cleared) across sessions and
 * persists locally on this device only. No points for presence, clicks, or
 * inactivity.
 */

export interface PersonalStats {
  xp: number;
  /** Sets found across all sessions, by difficulty level: [lv1, lv2, lv3]. */
  setsByLevel: [number, number, number];
  totalSetsFound: number;
  boardsCleared: number;
  sessionsPlayed: number;
  sessionsCompleted: number;
  bestScore: number | null;
}

export const EMPTY_STATS: PersonalStats = {
  xp: 0,
  setsByLevel: [0, 0, 0],
  totalSetsFound: 0,
  boardsCleared: 0,
  sessionsPlayed: 0,
  sessionsCompleted: 0,
  bestScore: null,
};

/** Flat XP per verified outcome. Modest on purpose — no economy in Stage 1. */
export const XP_PER_SET = 10;
export const XP_PER_BOARD_CLEARED = 25;

/** The slice of session results that feeds progression. */
export interface SessionSummary {
  score: number;
  totalSetsFound: number;
  setsFoundByLevel: [number, number, number];
  boardsCleared: number;
  roundsCompleted: number;
  totalRounds: number;
}

export function statsAfterSession(stats: PersonalStats, summary: SessionSummary): PersonalStats {
  const completedAllRounds = summary.roundsCompleted === summary.totalRounds;
  return {
    xp:
      stats.xp +
      summary.totalSetsFound * XP_PER_SET +
      summary.boardsCleared * XP_PER_BOARD_CLEARED,
    setsByLevel: [
      stats.setsByLevel[0] + summary.setsFoundByLevel[0],
      stats.setsByLevel[1] + summary.setsFoundByLevel[1],
      stats.setsByLevel[2] + summary.setsFoundByLevel[2],
    ],
    totalSetsFound: stats.totalSetsFound + summary.totalSetsFound,
    boardsCleared: stats.boardsCleared + summary.boardsCleared,
    sessionsPlayed: stats.sessionsPlayed + 1,
    sessionsCompleted: stats.sessionsCompleted + (completedAllRounds ? 1 : 0),
    bestScore:
      stats.bestScore === null ? summary.score : Math.max(stats.bestScore, summary.score),
  };
}
