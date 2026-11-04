/**
 * Game session state machine. Pure reducer: no React, DOM, storage, or
 * network. The React layer wraps this with `useReducer`; simulations drive
 * it directly with seeded randomness.
 *
 * Flow (mirrors the original prototype):
 *   start-session → "Find a set!" (start-selection) → pick 3 cards
 *   (auto-submits on the third) → scoring feedback → repeat →
 *   "No sets left!" (declare-no-sets) → round complete → next round →
 *   after the final round, the session is finished.
 */
import { createBoard, type Card } from "./cards";
import {
  combinationKey,
  combinationLevel,
  explainInvalid,
  findCombinations,
  isCombination,
  type CombinationLevel,
  type MixedAttribute,
} from "./combinations";
import type { RandomSource } from "./rng";
import {
  DEFAULT_SCORING_CONFIG,
  applyOutcome,
  outcomeForCorrectSet,
  outcomeForDuplicateSet,
  outcomeForNoSetsCorrect,
  outcomeForNoSetsWrong,
  outcomeForWrongSet,
  type ScoreOutcome,
  type ScoringConfig,
} from "./scoring";

export const TOTAL_ROUNDS = 3;

export type SessionPhase = "playing" | "round-complete" | "finished";

/**
 * Feedback is a typed outcome, never a pre-baked string, so the UI can
 * render localized, parameterized text (and exact configured point values).
 */
export interface FeedbackMessage {
  kind: ScoreOutcome["kind"] | "need-three";
  /** Signed score change; 0 when the score did not move. */
  delta: number;
  level?: CombinationLevel;
  /** Undiscovered sets remaining; present for "no-sets-wrong". */
  remaining?: number;
  /** Mixed (2+1) attributes; present for "wrong-set" to explain the failure. */
  mixed?: MixedAttribute[];
}

export interface SessionState {
  phase: SessionPhase;
  round: number;
  totalRounds: number;
  score: number;
  board: Card[];
  /** Keys of discovered combinations (serializable alternative to Set). */
  foundKeys: string[];
  /** Currently selected board indices. */
  selection: number[];
  /** Whether the player has called "Find a set!" and may select cards. */
  selecting: boolean;
  /** Result of the last scoring action; cleared when a new selection starts. */
  feedback: FeedbackMessage | null;
  roundsCompleted: number;
  totalSetsFound: number;
  /** Sets found, grouped by difficulty level: [lv1, lv2, lv3]. */
  setsFoundByLevel: [number, number, number];
  config: ScoringConfig;
}

export type SessionEvent =
  | { type: "start-session"; board?: Card[] }
  | { type: "start-selection" }
  | { type: "cancel-selection" }
  | { type: "toggle-card"; index: number }
  | { type: "declare-no-sets" }
  | { type: "next-round" }
  | { type: "restart"; board?: Card[] };

export function createInitialState(
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
  totalRounds: number = TOTAL_ROUNDS,
): SessionState {
  return {
    phase: "playing",
    round: 0,
    totalRounds,
    score: 0,
    board: [],
    foundKeys: [],
    selection: [],
    selecting: false,
    feedback: null,
    roundsCompleted: 0,
    totalSetsFound: 0,
    setsFoundByLevel: [0, 0, 0],
    config,
  };
}

export function foundKeySet(state: SessionState): Set<string> {
  return new Set(state.foundKeys);
}

/** Undiscovered valid combinations on the current board. */
export function remainingCombinations(state: SessionState): number[][] {
  return findCombinations(state.board, foundKeySet(state));
}

/**
 * A session counts as a verified contribution only when the player found at
 * least the configured minimum of sets. Inactivity is never a ranked win.
 */
export function isEligibleForRanking(state: SessionState): boolean {
  return state.totalSetsFound >= Math.max(1, state.config.eligibilityMinVerifiedSets);
}

function beginRound(
  state: SessionState,
  round: number,
  board: Card[],
): SessionState {
  return {
    ...state,
    phase: "playing",
    round,
    board,
    foundKeys: [],
    selection: [],
    selecting: false,
    feedback: null,
  };
}

function submitSelection(state: SessionState, selection: number[]): SessionState {
  const key = combinationKey(selection);
  const found = foundKeySet(state);
  const base: SessionState = { ...state, selection: [], selecting: false };

  if (found.has(key)) {
    const outcome = outcomeForDuplicateSet();
    return { ...base, feedback: { kind: outcome.kind, delta: outcome.delta } };
  }

  const picked = selection.map((index) => state.board[index]);
  if (picked.length !== 3 || picked.some((card) => card === undefined)) {
    return { ...base, feedback: { kind: "need-three", delta: 0 } };
  }
  const cards = picked as [Card, Card, Card];

  if (isCombination(cards)) {
    const level = combinationLevel(cards);
    const outcome = outcomeForCorrectSet(state.config, level);
    const setsFoundByLevel = [...state.setsFoundByLevel] as [number, number, number];
    setsFoundByLevel[level - 1]! += 1;
    return {
      ...base,
      score: applyOutcome(state.score, outcome, state.config),
      foundKeys: [...state.foundKeys, key],
      totalSetsFound: state.totalSetsFound + 1,
      setsFoundByLevel,
      feedback: { kind: outcome.kind, delta: outcome.delta, level },
    };
  }

  const outcome = outcomeForWrongSet(state.config);
  return {
    ...base,
    score: applyOutcome(state.score, outcome, state.config),
    feedback: { kind: outcome.kind, delta: outcome.delta, mixed: explainInvalid(cards) },
  };
}

function declareNoSets(state: SessionState): SessionState {
  const remaining = remainingCombinations(state).length;

  if (remaining > 0) {
    const outcome = outcomeForNoSetsWrong(state.config);
    return {
      ...state,
      score: applyOutcome(state.score, outcome, state.config),
      feedback: { kind: outcome.kind, delta: outcome.delta, remaining },
    };
  }

  const outcome = outcomeForNoSetsCorrect(state.config);
  return {
    ...state,
    phase: "round-complete",
    score: applyOutcome(state.score, outcome, state.config),
    roundsCompleted: state.roundsCompleted + 1,
    selecting: false,
    selection: [],
    feedback: { kind: outcome.kind, delta: outcome.delta },
  };
}

/**
 * Creates the session reducer bound to a random source. Board-heavy events
 * (`start-session`, `restart`, `next-round`) draw from it; everything else
 * is deterministic.
 */
export function createSessionReducer(random: RandomSource = Math.random) {
  return function sessionReducer(state: SessionState, event: SessionEvent): SessionState {
    switch (event.type) {
      case "start-session":
      case "restart": {
        const fresh = createInitialState(state.config, state.totalRounds);
        return beginRound(fresh, 1, event.board ?? createBoard(random));
      }

      case "start-selection": {
        if (state.phase !== "playing" || state.selecting) return state;
        return { ...state, selecting: true, selection: [], feedback: null };
      }

      case "cancel-selection": {
        if (state.phase !== "playing" || !state.selecting) return state;
        return { ...state, selecting: false, selection: [], feedback: null };
      }

      case "toggle-card": {
        if (state.phase !== "playing" || !state.selecting) return state;
        const { index } = event;
        if (!Number.isInteger(index) || index < 0 || index >= state.board.length) return state;

        const selection = state.selection.includes(index)
          ? state.selection.filter((item) => item !== index)
          : state.selection.length < 3
            ? [...state.selection, index]
            : state.selection;

        // The third selected card submits automatically, as in the prototype.
        if (selection.length === 3) {
          return submitSelection(state, selection);
        }
        return { ...state, selection };
      }

      case "declare-no-sets": {
        if (state.phase !== "playing") return state;
        return declareNoSets(state);
      }

      case "next-round": {
        if (state.phase !== "round-complete") return state;
        if (state.round >= state.totalRounds) {
          return { ...state, phase: "finished" };
        }
        return beginRound(state, state.round + 1, createBoard(random));
      }

      default:
        return state;
    }
  };
}
