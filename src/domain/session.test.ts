import { describe, expect, it } from "vitest";
import { createBoard, type Card } from "./cards";
import {
  combinationLevel,
  findCombinations,
  isCombination,
  type CombinationLevel,
} from "./combinations";
import { mulberry32 } from "./rng";
import { DEFAULT_SCORING_CONFIG, type ScoringConfig } from "./scoring";
import {
  createInitialState,
  createSessionReducer,
  isEligibleForRanking,
  remainingCombinations,
  TOTAL_ROUNDS,
  type SessionState,
} from "./session";

type Reducer = ReturnType<typeof createSessionReducer>;

function makeReducer(seed = 1234): Reducer {
  return createSessionReducer(mulberry32(seed));
}

/** Finds a board that contains at least one valid combination. */
function boardWithSet(seedStart = 1): { board: Card[]; triple: number[] } {
  for (let seed = seedStart; seed < seedStart + 500; seed += 1) {
    const board = createBoard(mulberry32(seed));
    const triple = findCombinations(board)[0];
    if (triple) return { board, triple };
  }
  throw new Error("no board with a combination found");
}

/** Finds a board containing a combination of the requested level. */
function boardWithLevel(
  level: CombinationLevel,
  seedStart = 1,
): { board: Card[]; triple: number[] } {
  for (let seed = seedStart; seed < seedStart + 2000; seed += 1) {
    const board = createBoard(mulberry32(seed));
    for (const triple of findCombinations(board)) {
      const cards = triple.map((index) => board[index]!);
      if (combinationLevel(cards) === level) return { board, triple };
    }
  }
  throw new Error(`no board with a level ${level} combination found`);
}

/** Finds a triple on the board that is NOT a valid combination. */
function invalidTriple(board: Card[]): number[] {
  for (let i = 0; i < board.length; i += 1) {
    for (let j = i + 1; j < board.length; j += 1) {
      for (let k = j + 1; k < board.length; k += 1) {
        if (!isCombination([board[i]!, board[j]!, board[k]!])) return [i, j, k];
      }
    }
  }
  throw new Error("board unexpectedly has only valid triples");
}

function startSession(
  reducer: Reducer,
  board: Card[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): SessionState {
  return reducer(createInitialState(config), { type: "start-session", board });
}

function playTriple(reducer: Reducer, state: SessionState, triple: number[]): SessionState {
  let next = reducer(state, { type: "start-selection" });
  for (const index of triple) {
    next = reducer(next, { type: "toggle-card", index });
  }
  return next;
}

/** Plays a round to completion: finds every set, then declares no-sets. */
function clearBoard(reducer: Reducer, state: SessionState): SessionState {
  let next = state;
  for (const triple of findCombinations(next.board)) {
    next = playTriple(reducer, next, triple);
  }
  return reducer(next, { type: "declare-no-sets" });
}

describe("session lifecycle", () => {
  it("starts round 1 with a 9-card board and a zero score", () => {
    const reducer = makeReducer();
    const state = startSession(reducer, boardWithSet().board);
    expect(state.phase).toBe("playing");
    expect(state.round).toBe(1);
    expect(state.totalRounds).toBe(TOTAL_ROUNDS);
    expect(state.score).toBe(0);
    expect(state.board.length).toBe(9);
  });

  it("requires 'Find a set!' before cards can be selected", () => {
    const reducer = makeReducer();
    const { board, triple } = boardWithSet();
    const state = startSession(reducer, board);
    const after = reducer(state, { type: "toggle-card", index: triple[0]! });
    expect(after.selection).toEqual([]);
  });

  it("lets the player deselect a card before the third pick", () => {
    const reducer = makeReducer();
    const { board, triple } = boardWithSet();
    let state = startSession(reducer, board);
    state = reducer(state, { type: "start-selection" });
    state = reducer(state, { type: "toggle-card", index: triple[0]! });
    state = reducer(state, { type: "toggle-card", index: triple[0]! });
    expect(state.selection).toEqual([]);
  });

  it("auto-submits on the third selected card", () => {
    const reducer = makeReducer();
    const { board, triple } = boardWithSet();
    const state = playTriple(reducer, startSession(reducer, board), triple);
    expect(state.selection).toEqual([]);
    expect(state.selecting).toBe(false);
    expect(state.feedback?.kind).toBe("correct-set");
  });
});

describe("scoring", () => {
  it("awards the level-weighted reward for a correct new set by default", () => {
    const reducer = makeReducer();
    const { board, triple } = boardWithSet();
    const state = playTriple(reducer, startSession(reducer, board), triple);
    expect(state.score).toBeGreaterThanOrEqual(1);
    expect(state.totalSetsFound).toBe(1);
    expect(state.foundKeys.length).toBe(1);
  });

  it("rewards harder sets more under the default config", () => {
    const reducer = makeReducer();
    const levelOne = boardWithLevel(1);
    const levelThree = boardWithLevel(3);
    const s1 = playTriple(reducer, startSession(reducer, levelOne.board), levelOne.triple);
    const s3 = playTriple(reducer, startSession(reducer, levelThree.board), levelThree.triple);
    expect(s1.score).toBe(1);
    expect(s3.score).toBe(3);
  });

  it("tracks the difficulty level of each found set", () => {
    const reducer = makeReducer();
    const { board, triple } = boardWithLevel(2);
    const state = playTriple(reducer, startSession(reducer, board), triple);
    expect(state.setsFoundByLevel).toEqual([0, 1, 0]);
    expect(state.feedback).toMatchObject({ kind: "correct-set", level: 2 });
  });

  it("applies level rewards from the config", () => {
    const reducer = makeReducer();
    const { board, triple } = boardWithLevel(3);
    const config: ScoringConfig = { ...DEFAULT_SCORING_CONFIG, levelRewards: [1, 2, 3] };
    const state = playTriple(reducer, startSession(reducer, board, config), triple);
    expect(state.score).toBe(3);
    expect(state.feedback).toMatchObject({ kind: "correct-set", delta: 3, level: 3 });
  });

  it("does not score a duplicate set twice, even across attempts", () => {
    const reducer = makeReducer();
    const { board, triple } = boardWithSet();
    // The first discovery scores the set's level-weighted reward; repeats add nothing.
    const level = combinationLevel(triple.map((index) => board[index]!));
    let state = startSession(reducer, board);
    state = playTriple(reducer, state, triple);
    state = playTriple(reducer, state, triple);
    state = playTriple(reducer, state, triple);
    expect(state.score).toBe(level);
    expect(state.feedback?.kind).toBe("duplicate-set");
    expect(state.totalSetsFound).toBe(1);
  });

  it("penalizes an invalid triple but never below the zero floor", () => {
    const reducer = makeReducer();
    const { board } = boardWithSet();
    const state = playTriple(reducer, startSession(reducer, board), invalidTriple(board));
    expect(state.score).toBe(0);
    expect(state.feedback?.kind).toBe("wrong-set");
  });

  it("subtracts the penalty from a positive score", () => {
    const reducer = makeReducer();
    const { board, triple } = boardWithSet();
    let state = startSession(reducer, board);
    state = playTriple(reducer, state, triple);
    const before = state.score;
    state = reducer(state, { type: "start-selection" });
    for (const index of invalidTriple(board)) {
      state = reducer(state, { type: "toggle-card", index });
    }
    expect(state.score).toBe(Math.max(0, before - 1));
    expect(state.feedback?.kind).toBe("wrong-set");
  });

  it("honors the score floor when configured", () => {
    const reducer = makeReducer();
    const { board } = boardWithSet();
    const config: ScoringConfig = { ...DEFAULT_SCORING_CONFIG, scoreFloor: 0 };
    let state = startSession(reducer, board, config);
    state = playTriple(reducer, state, invalidTriple(board));
    state = playTriple(reducer, state, invalidTriple(board));
    expect(state.score).toBe(0);
  });
});

describe("no-sets declaration", () => {
  it("penalizes a wrong declaration (floored at zero) and reports the remaining count", () => {
    const reducer = makeReducer();
    const { board } = boardWithSet();
    const total = findCombinations(board).length;
    const state = reducer(startSession(reducer, board), { type: "declare-no-sets" });
    expect(state.score).toBe(0);
    expect(state.feedback).toMatchObject({ kind: "no-sets-wrong", remaining: total });
    expect(state.phase).toBe("playing");
  });

  it("awards the bonus and completes the round when correct", () => {
    const reducer = makeReducer();
    const { board } = boardWithSet();
    const state = clearBoard(reducer, startSession(reducer, board));
    expect(state.phase).toBe("round-complete");
    expect(state.roundsCompleted).toBe(1);
    expect(state.feedback?.kind).toBe("no-sets-correct");
    expect(remainingCombinations(state).length).toBe(0);
  });
});

describe("remaining-count reveal", () => {
  it("starts each board with the count hidden", () => {
    const reducer = makeReducer();
    const state = startSession(reducer, boardWithSet().board);
    expect(state.countRevealed).toBe(false);
  });

  it("charges the configured cost once and reveals the count", () => {
    const reducer = makeReducer();
    const { board, triple } = boardWithSet();
    let state = startSession(reducer, board);
    // Build a positive score so the cost is actually deducted below.
    state = playTriple(reducer, state, triple);
    const before = state.score;
    state = reducer(state, { type: "reveal-remaining" });
    expect(state.countRevealed).toBe(true);
    expect(state.score).toBe(before - 1);
    expect(state.feedback).toMatchObject({
      kind: "reveal-remaining",
      delta: -1,
      remaining: remainingCombinations(state).length,
    });
  });

  it("never charges twice: repeat reveals are free no-ops", () => {
    const reducer = makeReducer();
    const { board, triple } = boardWithSet();
    let state = startSession(reducer, board);
    state = playTriple(reducer, state, triple);
    state = reducer(state, { type: "reveal-remaining" });
    const scoreAfterFirst = state.score;
    const feedbackAfterFirst = state.feedback;
    state = reducer(state, { type: "reveal-remaining" });
    state = reducer(state, { type: "reveal-remaining" });
    expect(state.score).toBe(scoreAfterFirst);
    expect(state.feedback).toBe(feedbackAfterFirst);
    expect(state.countRevealed).toBe(true);
  });

  it("respects the score floor at zero", () => {
    const reducer = makeReducer();
    const { board } = boardWithSet();
    const state = reducer(startSession(reducer, board), { type: "reveal-remaining" });
    expect(state.score).toBe(0);
    expect(state.countRevealed).toBe(true);
  });

  it("is disabled while a card selection is in progress", () => {
    const reducer = makeReducer();
    const { board, triple } = boardWithSet();
    let state = startSession(reducer, board);
    state = reducer(state, { type: "start-selection" });
    state = reducer(state, { type: "toggle-card", index: triple[0]! });
    const scoreDuringSelection = state.score;
    state = reducer(state, { type: "reveal-remaining" });
    expect(state.countRevealed).toBe(false);
    expect(state.score).toBe(scoreDuringSelection);
    expect(state.selection).toEqual([triple[0]!]);
  });

  it("a wrong no-sets claim reveals the count without a second charge", () => {
    const reducer = makeReducer();
    const { board, triple } = boardWithSet();
    let state = startSession(reducer, board);
    state = playTriple(reducer, state, triple);
    state = reducer(state, { type: "declare-no-sets" });
    // Wrong claim already applied its own penalty and revealed the count.
    expect(state.countRevealed).toBe(true);
    expect(state.feedback?.kind).toBe("no-sets-wrong");
    const scoreAfterClaim = state.score;
    // The paid reveal is now a no-op: the information was already bought.
    state = reducer(state, { type: "reveal-remaining" });
    expect(state.score).toBe(scoreAfterClaim);
  });

  it("resets the revealed state on the next board", () => {
    const reducer = makeReducer();
    const { board } = boardWithSet();
    let state = startSession(reducer, board);
    state = reducer(state, { type: "reveal-remaining" });
    expect(state.countRevealed).toBe(true);
    state = clearBoard(reducer, state);
    state = reducer(state, { type: "next-round" });
    expect(state.round).toBe(2);
    expect(state.countRevealed).toBe(false);
  });
});

describe("round transitions", () => {
  it("advances to the next round with a fresh board", () => {
    const reducer = makeReducer();
    const { board } = boardWithSet();
    let state = clearBoard(reducer, startSession(reducer, board));
    const scoreAfterRound = state.score;
    state = reducer(state, { type: "next-round" });
    expect(state.phase).toBe("playing");
    expect(state.round).toBe(2);
    expect(state.board.length).toBe(9);
    expect(state.foundKeys).toEqual([]);
    expect(state.score).toBe(scoreAfterRound);
  });

  it("finishes the session after the final round", () => {
    const reducer = makeReducer();
    let state = startSession(reducer, boardWithSet().board);
    for (let round = 0; round < TOTAL_ROUNDS; round += 1) {
      state = clearBoard(reducer, state);
      state = reducer(state, { type: "next-round" });
    }
    expect(state.phase).toBe("finished");
    expect(state.roundsCompleted).toBe(TOTAL_ROUNDS);
  });

  it("restart begins a fresh session while keeping the config", () => {
    const reducer = makeReducer();
    const config: ScoringConfig = { ...DEFAULT_SCORING_CONFIG, levelRewards: [1, 2, 4] };
    let state = startSession(reducer, boardWithSet().board, config);
    state = playTriple(reducer, state, findCombinations(state.board)[0]!);
    state = reducer(state, { type: "restart" });
    expect(state.score).toBe(0);
    expect(state.round).toBe(1);
    expect(state.config.levelRewards).toEqual([1, 2, 4]);
  });
});

describe("fairness guards", () => {
  it("an idle session has no verified contribution", () => {
    const reducer = makeReducer();
    const state = startSession(reducer, boardWithSet().board);
    expect(state.totalSetsFound).toBe(0);
    expect(isEligibleForRanking(state)).toBe(false);
  });

  it("a session with a found set is eligible", () => {
    const reducer = makeReducer();
    const { board, triple } = boardWithSet();
    const state = playTriple(reducer, startSession(reducer, board), triple);
    expect(isEligibleForRanking(state)).toBe(true);
  });
});
