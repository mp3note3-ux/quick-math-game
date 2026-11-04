/**
 * Simulation bots. Node-only; never imported by the app.
 *
 * Each bot plays ONE board through the real session reducer, so simulated
 * scoring is exactly the game's scoring. Bots are simple, documented models
 * of player behavior — they inform the scoring decision, they do not prove
 * real-world outcomes.
 *
 * A bot stops when its policy finishes or when it exhausts its action
 * budget (a model of the player giving up on the board without the bonus;
 * the real game has no board time limit, so unfinished boards simply score
 * what they scored).
 */
import type { Card } from "../cards";
import { combinationLevel, findCombinations, type CombinationLevel } from "../combinations";
import type { RandomSource } from "../rng";
import type { ScoringConfig } from "../scoring";
import {
  createInitialState,
  createSessionReducer,
  type SessionState,
} from "../session";

export interface BotParams {
  /** Per-set probability that the realistic bot spots it on a search pass. */
  realisticFindRate: number;
  /** Probability that a realistic submission fumbles into a wrong triple. */
  realisticFumbleRate: number;
  /** Maximum actions before any bot gives up on the board. */
  actionBudget: number;
  /** Per-action probability the random guesser declares "no sets left". */
  randomDeclareRate: number;
}

export const DEFAULT_BOT_PARAMS: BotParams = {
  realisticFindRate: 0.75,
  realisticFumbleRate: 0.05,
  actionBudget: 25,
  randomDeclareRate: 0.1,
};

export interface RoundTrace {
  bot: string;
  setCount: number;
  /** Difficulty level of each valid combination on the board. */
  setLevels: CombinationLevel[];
  actions: number;
  correctSubmissions: number;
  wrongSubmissions: number;
  duplicateSubmissions: number;
  noSetsDeclarations: number;
  roundCleared: boolean;
  finalScore: number;
}

interface Counters {
  actions: number;
  correct: number;
  wrong: number;
  duplicate: number;
  declarations: number;
}

export interface Bot {
  name: string;
  playRound(board: Card[], random: RandomSource, config: ScoringConfig, params: BotParams): RoundTrace;
}

function trace(
  bot: string,
  board: Card[],
  counters: Counters,
  state: SessionState,
): RoundTrace {
  const combos = findCombinations(board);
  return {
    bot,
    setCount: combos.length,
    setLevels: combos.map((triple) =>
      combinationLevel(triple.map((index) => board[index]!)),
    ),
    actions: counters.actions,
    correctSubmissions: counters.correct,
    wrongSubmissions: counters.wrong,
    duplicateSubmissions: counters.duplicate,
    noSetsDeclarations: counters.declarations,
    roundCleared: state.phase === "round-complete",
    finalScore: state.score,
  };
}

function freshState(board: Card[], config: ScoringConfig): SessionState {
  const reducer = createSessionReducer();
  return reducer(createInitialState(config, 1), { type: "start-session", board });
}

function submitTriple(
  state: SessionState,
  triple: number[],
  counters: Counters,
): SessionState {
  const reducer = createSessionReducer();
  counters.actions += 1;
  let next = reducer(state, { type: "start-selection" });
  for (const index of triple) {
    next = reducer(next, { type: "toggle-card", index });
  }
  if (next.feedback?.kind === "correct-set") counters.correct += 1;
  else if (next.feedback?.kind === "wrong-set") counters.wrong += 1;
  else if (next.feedback?.kind === "duplicate-set") counters.duplicate += 1;
  return next;
}

function declare(
  state: SessionState,
  counters: Counters,
): SessionState {
  const reducer = createSessionReducer();
  counters.actions += 1;
  counters.declarations += 1;
  return reducer(state, { type: "declare-no-sets" });
}

function counters(): Counters {
  return { actions: 0, correct: 0, wrong: 0, duplicate: 0, declarations: 0 };
}

/** Never acts. The control case: proves inactivity earns exactly nothing. */
export const idleBot: Bot = {
  name: "idle",
  playRound(board, _random, config) {
    return trace("idle", board, counters(), freshState(board, config));
  },
};

/** Finds every set, never errs, then declares "no sets left". The ceiling. */
export const perfectBot: Bot = {
  name: "perfect",
  playRound(board, _random, config, params) {
    const count = counters();
    let state = freshState(board, config);
    for (const triple of findCombinations(board)) {
      if (count.actions >= params.actionBudget) break;
      state = submitTriple(state, triple, count);
    }
    if (count.actions < params.actionBudget) {
      state = declare(state, count);
    }
    return trace("perfect", board, count, state);
  },
};

/**
 * Submits uniformly random triples without tracking duplicates, and
 * occasionally declares "no sets left" at random. Models careless play.
 */
export const randomGuesserBot: Bot = {
  name: "random-guesser",
  playRound(board, random, config, params) {
    const count = counters();
    let state = freshState(board, config);
    while (count.actions < params.actionBudget && state.phase === "playing") {
      if (random() < params.randomDeclareRate) {
        state = declare(state, count);
        continue;
      }
      const picked = new Set<number>();
      while (picked.size < 3) picked.add(Math.floor(random() * board.length));
      state = submitTriple(state, [...picked], count);
    }
    return trace("random-guesser", board, count, state);
  },
};

/**
 * Models an engaged but imperfect player: each search pass spots each
 * still-undiscovered set with `realisticFindRate`; each submission fumbles
 * with `realisticFumbleRate`; it declares "no sets left" when it believes
 * nothing remains (which is wrong when it missed sets). After a failed
 * declaration it searches again, until the action budget runs out.
 */
export const realisticBot: Bot = {
  name: "realistic",
  playRound(board, random, config, params) {
    const count = counters();
    let state = freshState(board, config);
    const found = new Set<string>();

    while (count.actions < params.actionBudget && state.phase === "playing") {
      const remaining = findCombinations(board).filter(
        (triple) => !found.has(triple.join(",")),
      );
      const spotted = remaining.filter(() => random() < params.realisticFindRate);

      if (spotted.length === 0) {
        // Believes nothing remains — may be wrong.
        state = declare(state, count);
        if (state.phase === "playing" && count.actions >= params.actionBudget) break;
        if (state.phase === "playing" && remaining.length === 0) break; // would loop forever
        continue;
      }

      for (const triple of spotted) {
        if (count.actions >= params.actionBudget) break;
        let submission = triple;
        if (random() < params.realisticFumbleRate) {
          // Fumble: swap one card for a random different index.
          const swapPosition = Math.floor(random() * 3);
          let replacement = Math.floor(random() * board.length);
          while (triple.includes(replacement)) {
            replacement = Math.floor(random() * board.length);
          }
          submission = triple.map((index, position) =>
            position === swapPosition ? replacement : index,
          );
        }
        const before = state.score;
        state = submitTriple(state, submission, count);
        if (state.feedback?.kind === "correct-set" || state.score > before) {
          found.add(triple.join(","));
        }
      }
    }
    return trace("realistic", board, count, state);
  },
};

export const ALL_BOTS: readonly Bot[] = [idleBot, randomGuesserBot, realisticBot, perfectBot];
