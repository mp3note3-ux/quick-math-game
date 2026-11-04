import { describe, expect, it } from "vitest";
import {
  applyOutcome,
  DEFAULT_SCORING_CONFIG,
  outcomeForCorrectSet,
  outcomeForDuplicateSet,
  outcomeForNoSetsCorrect,
  outcomeForNoSetsWrong,
  outcomeForRevealRemaining,
  outcomeForWrongSet,
  rewardForLevel,
  type ScoringConfig,
} from "./scoring";

describe("rewardForLevel", () => {
  it("indexes rewards by level", () => {
    const config: ScoringConfig = { ...DEFAULT_SCORING_CONFIG, levelRewards: [1, 2, 4] };
    expect(rewardForLevel(config, 1)).toBe(1);
    expect(rewardForLevel(config, 2)).toBe(2);
    expect(rewardForLevel(config, 3)).toBe(4);
  });
});

describe("outcomes", () => {
  it("builds a correct-set outcome with level and weighted reward", () => {
    expect(outcomeForCorrectSet(DEFAULT_SCORING_CONFIG, 1)).toEqual({
      kind: "correct-set",
      delta: 1,
      level: 1,
    });
    expect(outcomeForCorrectSet(DEFAULT_SCORING_CONFIG, 2)).toEqual({
      kind: "correct-set",
      delta: 2,
      level: 2,
    });
    expect(outcomeForCorrectSet(DEFAULT_SCORING_CONFIG, 3)).toEqual({
      kind: "correct-set",
      delta: 3,
      level: 3,
    });
  });

  it("builds penalty outcomes from the config", () => {
    const config: ScoringConfig = {
      ...DEFAULT_SCORING_CONFIG,
      wrongSetPenalty: -2,
      wrongNoSetsPenalty: -3,
      noSetsBonus: 5,
    };
    expect(outcomeForWrongSet(config).delta).toBe(-2);
    expect(outcomeForNoSetsWrong(config).delta).toBe(-3);
    expect(outcomeForNoSetsCorrect(config).delta).toBe(5);
  });

  it("never scores duplicates", () => {
    expect(outcomeForDuplicateSet().delta).toBe(0);
  });

  it("builds the reveal outcome from the configured cost", () => {
    expect(outcomeForRevealRemaining(DEFAULT_SCORING_CONFIG)).toEqual({
      kind: "reveal-remaining",
      delta: -1,
    });
    const config: ScoringConfig = { ...DEFAULT_SCORING_CONFIG, revealRemainingCost: -2 };
    expect(outcomeForRevealRemaining(config).delta).toBe(-2);
  });
});

describe("applyOutcome", () => {
  it("applies the delta when above the floor", () => {
    expect(applyOutcome(5, outcomeForWrongSet(DEFAULT_SCORING_CONFIG), DEFAULT_SCORING_CONFIG)).toBe(4);
  });

  it("clamps at the default zero floor so mistakes never go negative", () => {
    expect(applyOutcome(0, outcomeForWrongSet(DEFAULT_SCORING_CONFIG), DEFAULT_SCORING_CONFIG)).toBe(0);
    expect(applyOutcome(1, outcomeForWrongSet(DEFAULT_SCORING_CONFIG), DEFAULT_SCORING_CONFIG)).toBe(0);
  });

  it("respects an explicit floorless config", () => {
    const config: ScoringConfig = { ...DEFAULT_SCORING_CONFIG, scoreFloor: null };
    expect(applyOutcome(0, outcomeForWrongSet(config), config)).toBe(-1);
  });
});
