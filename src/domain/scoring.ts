/**
 * Scoring model. Pure: no React, DOM, storage, or network.
 *
 * All point values live in `ScoringConfig` — never hard-coded in game logic
 * or UI strings. Defaults reproduce the original prototype (+1 flat per set,
 * -1 wrong, +3 for a correct "no sets left" declaration). Final values stay
 * configurable until the owner reviews the simulation report; see
 * `src/domain/simulation/run.ts`.
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
  /** Optional lower bound for the match score. `null` = no floor. */
  scoreFloor: number | null;
  /**
   * Minimum verified sets for a session to count as a verified contribution.
   * Sessions below this are "unranked" — inactivity must not be presented as
   * a competitive win.
   */
  eligibilityMinVerifiedSets: number;
}

/** Current prototype behavior, used as the default until sims are reviewed. */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  levelRewards: [1, 1, 1],
  wrongSetPenalty: -1,
  wrongNoSetsPenalty: -1,
  noSetsBonus: 3,
  scoreFloor: null,
  eligibilityMinVerifiedSets: 1,
};

export type ScoreOutcomeKind =
  | "correct-set"
  | "wrong-set"
  | "duplicate-set"
  | "no-sets-correct"
  | "no-sets-wrong";

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

/** Applies an outcome to a score, honoring the configured floor. */
export function applyOutcome(score: number, outcome: ScoreOutcome, config: ScoringConfig): number {
  const next = score + outcome.delta;
  return config.scoreFloor === null ? next : Math.max(config.scoreFloor, next);
}
