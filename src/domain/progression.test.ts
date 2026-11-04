import { describe, expect, it } from "vitest";
import {
  EMPTY_STATS,
  MASTERY_RANKS,
  rankForXp,
  statsAfterBoard,
  statsAfterSession,
  xpForSets,
  XP_PER_BOARD_CLEARED,
  XP_PER_LEVEL,
  type BoardCheckpoint,
  type SessionSummary,
} from "./progression";

describe("xpForSets", () => {
  it("awards more XP for higher-level sets", () => {
    expect(xpForSets([1, 0, 0])).toBe(XP_PER_LEVEL[0]);
    expect(xpForSets([0, 1, 0])).toBe(XP_PER_LEVEL[1]);
    expect(xpForSets([0, 0, 1])).toBe(XP_PER_LEVEL[2]);
    expect(XP_PER_LEVEL[2]).toBeGreaterThan(XP_PER_LEVEL[1]);
    expect(XP_PER_LEVEL[1]).toBeGreaterThan(XP_PER_LEVEL[0]);
  });

  it("sums across levels", () => {
    expect(xpForSets([2, 1, 1])).toBe(
      2 * XP_PER_LEVEL[0] + XP_PER_LEVEL[1] + XP_PER_LEVEL[2],
    );
  });
});

describe("statsAfterBoard", () => {
  const cleared: BoardCheckpoint = { setsFoundByLevel: [2, 1, 1], boardCleared: true };

  it("awards difficulty-aware set XP plus the board-clear bonus", () => {
    const stats = statsAfterBoard(EMPTY_STATS, cleared);
    const expected =
      2 * XP_PER_LEVEL[0] + XP_PER_LEVEL[1] + XP_PER_LEVEL[2] + XP_PER_BOARD_CLEARED;
    expect(stats.xp).toBe(expected);
  });

  it("accumulates per-level set counts and totals", () => {
    const stats = statsAfterBoard(EMPTY_STATS, cleared);
    expect(stats.setsByLevel).toEqual([2, 1, 1]);
    expect(stats.totalSetsFound).toBe(4);
    expect(stats.boardsCleared).toBe(1);
  });

  it("does not add the clear bonus for a partial board", () => {
    const stats = statsAfterBoard(EMPTY_STATS, { setsFoundByLevel: [1, 0, 0], boardCleared: false });
    expect(stats.xp).toBe(XP_PER_LEVEL[0]);
    expect(stats.boardsCleared).toBe(0);
  });

  it("does not touch session counters or best score (session-level only)", () => {
    const stats = statsAfterBoard(EMPTY_STATS, cleared);
    expect(stats.sessionsPlayed).toBe(0);
    expect(stats.sessionsCompleted).toBe(0);
    expect(stats.bestScore).toBeNull();
  });

  it("accumulates across successive board checkpoints", () => {
    let stats = statsAfterBoard(EMPTY_STATS, cleared);
    stats = statsAfterBoard(stats, cleared);
    expect(stats.boardsCleared).toBe(2);
    expect(stats.totalSetsFound).toBe(8);
    expect(stats.setsByLevel).toEqual([4, 2, 2]);
  });
});

describe("statsAfterSession", () => {
  const summary: SessionSummary = {
    score: 7,
    totalSetsFound: 4,
    setsFoundByLevel: [2, 1, 1],
    boardsCleared: 2,
    roundsCompleted: 3,
    totalRounds: 3,
  };

  it("records session counts and best score without double-awarding XP", () => {
    // Simulate checkpointed progress first.
    const base = statsAfterBoard(EMPTY_STATS, { setsFoundByLevel: [2, 1, 1], boardCleared: true });
    const stats = statsAfterSession(base, summary);
    // XP unchanged from the checkpoint — session finish must not re-award.
    expect(stats.xp).toBe(base.xp);
    expect(stats.sessionsPlayed).toBe(1);
    expect(stats.sessionsCompleted).toBe(1);
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

  it("preserves checkpointed XP when a session is abandoned early", () => {
    // Player clears one board, then exits before finishing the session.
    let stats = statsAfterBoard(EMPTY_STATS, { setsFoundByLevel: [1, 1, 0], boardCleared: true });
    const xpAfterBoard = stats.xp;
    // An abandoned session records bookkeeping but no new XP.
    stats = statsAfterSession(stats, { ...summary, roundsCompleted: 1, score: 2 });
    expect(stats.xp).toBe(xpAfterBoard);
    expect(stats.sessionsCompleted).toBe(0);
  });
});

describe("rankForXp", () => {
  it("starts at the first rank with zero XP", () => {
    const progress = rankForXp(0);
    expect(progress.rank.id).toBe(MASTERY_RANKS[0]!.id);
    expect(progress.nextRank?.id).toBe(MASTERY_RANKS[1]!.id);
    expect(progress.fraction).toBe(0);
  });

  it("advances rank at thresholds", () => {
    expect(rankForXp(MASTERY_RANKS[1]!.minXp).rank.id).toBe(MASTERY_RANKS[1]!.id);
    expect(rankForXp(MASTERY_RANKS[1]!.minXp - 1).rank.id).toBe(MASTERY_RANKS[0]!.id);
  });

  it("reports progress toward the next rank", () => {
    const low = MASTERY_RANKS[0]!.minXp;
    const high = MASTERY_RANKS[1]!.minXp;
    const mid = rankForXp(low + (high - low) / 2);
    expect(mid.fraction).toBeCloseTo(0.5, 5);
    expect(mid.xpForNext).toBe(high - low);
  });

  it("caps at the top rank with full progress", () => {
    const top = MASTERY_RANKS[MASTERY_RANKS.length - 1]!;
    const progress = rankForXp(top.minXp + 9999);
    expect(progress.rank.id).toBe(top.id);
    expect(progress.nextRank).toBeNull();
    expect(progress.fraction).toBe(1);
  });
});
