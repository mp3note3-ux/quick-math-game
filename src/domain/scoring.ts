/**
 * Scoring model. Pure: no React, DOM, storage, or network.
 *
 * All point values live in `ScoringConfig` — never hard-coded in game logic
 * or UI strings. The default now uses the difficulty-weighted candidate
 * rewards documented in `GAME_DESIGN_IMPROVEMENT.md` (Level 1/2/3 = 1/2/3
 * points) with a zero score floor in Classic, so one mistake cannot make a
 * session feel hopeless. These values remain the *tested candidate*, not a
 * final balance lock: the structural level classification is a hypothesis,
 * and human playtesting is still required before treating the weights as
 * proven. Evidence: `npm run simulate` → `docs/scoring-simulation.md`.
 *
 * The prior flat prototype values (+1 any set, −1 wrong, +3 no-sets, no
 * floor) are preserved below as `PROTOTYPE_SCORING_CONFIG` for comparison.
 */
import type { CombinationLevel } from "./combinations";

export interface ScoringConfig {
  /** Reward per combination level: [level1, level2, level3]. */
  levelRewards: readonly [number, number, number];
  /** Applied when the submitted triple is not a valid combination. */
  wrongSetPenalty: number;
  /** Applied when "no sets left" is declared but undiscovered sets remain. */
  wrongNoSetsPenalty: number;
  /** Applied when "no sets left" is declared correctly; completes the round. */
  noSetsBonus: number;
  /**
   * Applied once per board when the player chooses to reveal the exact
   * remaining-set count. Kept in config (never hard-coded in the UI) so the
   * information trade stays an explicit, tunable scored choice.
   */
  revealRemainingCost: number;
  /** Optional lower bound for the match score. `null` = no floor. */
  scoreFloor: number | null;
  /**
   * Minimum verified sets for a session to count as a verified contribution.
   * Sessions below this are "unranked" — inactivity must not be presented as
   * a competitive win.
   */
  eligibilityMinVerifiedSets: number;
}

/**
 * The original flat prototype behavior (+1 any set, no floor). Kept for
 * simulation comparison and regression reference — no longer the live
 * default.
 */
export const PROTOTYPE_SCORING_CONFIG: ScoringConfig = {
  levelRewards: [1, 1, 1],
  wrongSetPenalty: -1,
  wrongNoSetsPenalty: -1,
  noSetsBonus: 3,
  revealRemainingCost: -1,
  scoreFloor: null,
  eligibilityMinVerifiedSets: 1,
};

/**
 * Live Classic defaults: difficulty-weighted rewards (Lv1/2/3 = 1/2/3) with
 * a zero floor so mistakes never drag a session negative. A correct
 * "no sets left" still awards the clear bonus. Penalties stay modest (−1).
 *
 * Design-brief candidate, pending human playtest — see file header.
 */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  levelRewards: [1, 2, 3],
  wrongSetPenalty: -1,
  wrongNoSetsPenalty: -1,
  noSetsBonus: 3,
  revealRemainingCost: -1,
  scoreFloor: 0,
  eligibilityMinVerifiedSets: 1,
};

export type ScoreOutcomeKind =
  | "correct-set"
  | "wrong-set"
  | "duplicate-set"
  | "no-sets-correct"
  | "no-sets-wrong"
  | "reveal-remaining";

export interface ScoreOutcome {
  kind: ScoreOutcomeKind;
  /** Signed score change before the floor is applied. */
  delta: number;
  /** Difficulty level of the set; only present for "correct-set". */
  level?: CombinationLevel;
}

export function rewardForLevel(config: ScoringConfig, level: CombinationLevel): number {
  return config.levelRewards[level - 1]!;
}

export function outcomeForCorrectSet(config: ScoringConfig, level: CombinationLevel): ScoreOutcome {
  return { kind: "correct-set", delta: rewardForLevel(config, level), level };
}

export function outcomeForWrongSet(config: ScoringConfig): ScoreOutcome {
  return { kind: "wrong-set", delta: config.wrongSetPenalty };
}

export function outcomeForDuplicateSet(): ScoreOutcome {
  return { kind: "duplicate-set", delta: 0 };
}

export function outcomeForNoSetsCorrect(config: ScoringConfig): ScoreOutcome {
  return { kind: "no-sets-correct", delta: config.noSetsBonus };
}

export function outcomeForNoSetsWrong(config: ScoringConfig): ScoreOutcome {
  return { kind: "no-sets-wrong", delta: config.wrongNoSetsPenalty };
}

export function outcomeForRevealRemaining(config: ScoringConfig): ScoreOutcome {
  return { kind: "reveal-remaining", delta: config.revealRemainingCost };
}

/** Applies an outcome to a score, honoring the configured floor. */
export function applyOutcome(score: number, outcome: ScoreOutcome, config: ScoringConfig): number {
  const next = score + outcome.delta;
  return config.scoreFloor === null ? next : Math.max(config.scoreFloor, next);
}
