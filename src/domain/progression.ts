/**
 * Local mastery progression. Pure: no React, DOM, storage, or network.
 *
 * Mastery XP is deliberately SEPARATE from match score: it rewards verified
 * skill (sets found, boards cleared) across sessions and persists locally on
 * this device only. No XP for presence, clicks, or inactivity.
 *
 * XP is difficulty-aware and checkpoint-based:
 * - Sets award more XP at higher difficulty (Level 1/2/3 = 10/15/25).
 * - XP is applied per verified board (checkpoint), not only at full session
 *   completion — exiting after a cleared board keeps that board's progress.
 * - Checkpoints are idempotent: `statsAfterBoard` is pure, and the caller
 *   records each round exactly once (a completed round's state is terminal),
 *   so reload/retry cannot award the same board twice.
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

/**
 * Difficulty-aware XP per verified set, by level: [lv1, lv2, lv3].
 * Candidate values from the design brief, pending human playtesting.
 */
export const XP_PER_LEVEL: readonly [number, number, number] = [10, 15, 25];

/** Additional XP for clearing a board (finding every set on it). */
export const XP_PER_BOARD_CLEARED = 25;

/** Legacy flat per-set value, retained for reference/migration notes. */
export const XP_PER_SET = 10;

/** XP for a tuple of sets by level: [lv1Count, lv2Count, lv3Count]. */
export function xpForSets(setsByLevel: readonly [number, number, number]): number {
  return (
    setsByLevel[0] * XP_PER_LEVEL[0] +
    setsByLevel[1] * XP_PER_LEVEL[1] +
    setsByLevel[2] * XP_PER_LEVEL[2]
  );
}

/**
 * A verified, completed board: the sets found on it, by level. This is the
 * unit at which progress is checkpointed.
 */
export interface BoardCheckpoint {
  /** Sets found on this board, by level: [lv1, lv2, lv3]. */
  setsFoundByLevel: [number, number, number];
  /** True when the board was fully cleared (adds the clear bonus). */
  boardCleared: boolean;
}

/**
 * Applies one verified board checkpoint to the stats. Pure and idempotent at
 * the call-site level: the caller records each round once, so applying this
 * for a given round adds that round's XP exactly once.
 */
export function statsAfterBoard(stats: PersonalStats, checkpoint: BoardCheckpoint): PersonalStats {
  const sets = checkpoint.setsFoundByLevel;
  const totalSets = sets[0] + sets[1] + sets[2];
  return {
    ...stats,
    xp: stats.xp + xpForSets(sets) + (checkpoint.boardCleared ? XP_PER_BOARD_CLEARED : 0),
    setsByLevel: [
      stats.setsByLevel[0] + sets[0],
      stats.setsByLevel[1] + sets[1],
      stats.setsByLevel[2] + sets[2],
    ],
    totalSetsFound: stats.totalSetsFound + totalSets,
    boardsCleared: stats.boardsCleared + (checkpoint.boardCleared ? 1 : 0),
  };
}

/** The slice of session results that feeds session-level stats. */
export interface SessionSummary {
  score: number;
  totalSetsFound: number;
  setsFoundByLevel: [number, number, number];
  boardsCleared: number;
  roundsCompleted: number;
  totalRounds: number;
}

/**
 * Records session-level bookkeeping at session finish: session counts and the
 * personal-best score. XP and per-set totals are intentionally NOT applied
 * here — they are checkpointed per board via `statsAfterBoard`, so finishing
 * the session must not double-award them.
 */
export function statsAfterSession(stats: PersonalStats, summary: SessionSummary): PersonalStats {
  const completedAllRounds = summary.roundsCompleted === summary.totalRounds;
  return {
    ...stats,
    sessionsPlayed: stats.sessionsPlayed + 1,
    sessionsCompleted: stats.sessionsCompleted + (completedAllRounds ? 1 : 0),
    bestScore:
      stats.bestScore === null ? summary.score : Math.max(stats.bestScore, summary.score),
  };
}

/* ---------- Mastery ranks ---------- */

export interface MasteryRank {
  /** Stable id, also the i18n key suffix for the localized rank name. */
  id: string;
  /** Total XP required to reach this rank. */
  minXp: number;
}

/**
 * The rank ladder, in ascending order. Thresholds are a first pass and expect
 * a balancing review; the ladder is data so it is cheap to retune.
 */
export const MASTERY_RANKS: readonly MasteryRank[] = [
  { id: "novice", minXp: 0 },
  { id: "spotter", minXp: 100 },
  { id: "pattern-seeker", minXp: 300 },
  { id: "set-finder", minXp: 700 },
  { id: "combo-master", minXp: 1500 },
  { id: "grandmaster", minXp: 3000 },
];

export interface RankProgress {
  rank: MasteryRank;
  /** The next rank, or null when at the top. */
  nextRank: MasteryRank | null;
  /** XP accumulated toward the next rank (0 when at the top). */
  xpIntoRank: number;
  /** XP span between the current and next rank (0 when at the top). */
  xpForNext: number;
  /** Progress to the next rank as a 0..1 fraction (1 when at the top). */
  fraction: number;
}

/** Computes the current rank and progress toward the next one from total XP. */
export function rankForXp(xp: number): RankProgress {
  let current: MasteryRank = MASTERY_RANKS[0]!;
  for (const rank of MASTERY_RANKS) {
    if (xp >= rank.minXp) current = rank;
    else break;
  }
  const index = MASTERY_RANKS.indexOf(current);
  const next = index >= 0 && index < MASTERY_RANKS.length - 1 ? MASTERY_RANKS[index + 1]! : null;
  if (next === null) {
    return { rank: current, nextRank: null, xpIntoRank: 0, xpForNext: 0, fraction: 1 };
  }
  const xpIntoRank = xp - current.minXp;
  const xpForNext = next.minXp - current.minXp;
  return {
    rank: current,
    nextRank: next,
    xpIntoRank,
    xpForNext,
    fraction: xpForNext > 0 ? Math.min(1, xpIntoRank / xpForNext) : 1,
  };
}
