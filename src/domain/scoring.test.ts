import { describe, expect, it } from "vitest";
import {
  applyOutcome,
  DEFAULT_SCORING_CONFIG,
  outcomeForCorrectSet,
  outcomeForDuplicateSet,
  outcomeForNoSetsCorrect,
  outcomeForNoSetsWrong,
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
  it("builds a correct-set outcome with level and reward", () => {
    expect(outcomeForCorrectSet(DEFAULT_SCORING_CONFIG, 2)).toEqual({
      kind: "correct-set",
      delta: 1,
      level: 2,
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
});

describe("applyOutcome", () => {
  it("applies the delta without a floor by default", () => {
    expect(applyOutcome(0, outcomeForWrongSet(DEFAULT_SCORING_CONFIG), DEFAULT_SCORING_CONFIG)).toBe(-1);
  });

  it("clamps at the configured floor", () => {
    const config: ScoringConfig = { ...DEFAULT_SCORING_CONFIG, scoreFloor: 0 };
    expect(applyOutcome(0, outcomeForWrongSet(config), config)).toBe(0);
    expect(applyOutcome(2, outcomeForWrongSet(config), config)).toBe(1);
  });
});
