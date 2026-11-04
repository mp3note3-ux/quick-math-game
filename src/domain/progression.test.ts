import { describe, expect, it } from "vitest";
import {
  EMPTY_STATS,
  statsAfterSession,
  XP_PER_BOARD_CLEARED,
  XP_PER_SET,
  type SessionSummary,
} from "./progression";

const summary: SessionSummary = {
  score: 7,
  totalSetsFound: 4,
  setsFoundByLevel: [2, 1, 1],
  boardsCleared: 2,
  roundsCompleted: 3,
  totalRounds: 3,
};

describe("statsAfterSession", () => {
  it("accumulates XP from verified sets and cleared boards only", () => {
    const stats = statsAfterSession(EMPTY_STATS, summary);
    expect(stats.xp).toBe(4 * XP_PER_SET + 2 * XP_PER_BOARD_CLEARED);
  });

  it("accumulates per-level set counts and totals", () => {
    const stats = statsAfterSession(EMPTY_STATS, summary);
    expect(stats.setsByLevel).toEqual([2, 1, 1]);
    expect(stats.totalSetsFound).toBe(4);
    expect(stats.boardsCleared).toBe(2);
  });

  it("counts a session as completed only when every round finished", () => {
    const complete = statsAfterSession(EMPTY_STATS, summary);
    expect(complete.sessionsPlayed).toBe(1);
    expect(complete.sessionsCompleted).toBe(1);

    const abandoned = statsAfterSession(EMPTY_STATS, { ...summary, roundsCompleted: 1 });
    expect(abandoned.sessionsCompleted).toBe(0);
  });

  it("keeps the best score across sessions", () => {
    let stats = statsAfterSession(EMPTY_STATS, summary);
    stats = statsAfterSession(stats, { ...summary, score: 3 });
    expect(stats.bestScore).toBe(7);
    stats = statsAfterSession(stats, { ...summary, score: 9 });
    expect(stats.bestScore).toBe(9);
  });

  it("awards nothing for an idle session", () => {
    const idle: SessionSummary = {
      score: 0,
      totalSetsFound: 0,
      setsFoundByLevel: [0, 0, 0],
      boardsCleared: 0,
      roundsCompleted: 0,
      totalRounds: 3,
    };
    const stats = statsAfterSession(EMPTY_STATS, idle);
    expect(stats.xp).toBe(0);
    expect(stats.totalSetsFound).toBe(0);
    expect(stats.sessionsCompleted).toBe(0);
  });
});
