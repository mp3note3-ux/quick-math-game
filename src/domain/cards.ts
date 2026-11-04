/**
 * Card model and board generation. Pure: no React, DOM, storage, or network.
 *
 * Invariant game rules (do not change silently):
 * - 27 unique cards: 3 shapes x 3 shape colors x 3 background colors.
 * - A board contains 9 distinct cards.
 */
import type { RandomSource } from "./rng";

export const SHAPE_COUNT = 3;
export const SHAPE_COLOR_COUNT = 3;
export const BACKGROUND_COUNT = 3;
export const BOARD_SIZE = 9;
export const DECK_SIZE = SHAPE_COUNT * SHAPE_COLOR_COUNT * BACKGROUND_COUNT;

export type AttributeValue = 0 | 1 | 2;

export interface Card {
  /** Shape value (circle / triangle / square). */
  s: AttributeValue;
  /** Shape-color value. */
  c: AttributeValue;
  /** Background-color value. */
  b: AttributeValue;
}

export type AttributeKey = keyof Card;
export const ATTRIBUTE_KEYS: readonly AttributeKey[] = ["s", "c", "b"];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (let s = 0; s < SHAPE_COUNT; s += 1) {
    for (let c = 0; c < SHAPE_COLOR_COUNT; c += 1) {
      for (let b = 0; b < BACKGROUND_COUNT; b += 1) {
        deck.push({ s: s as AttributeValue, c: c as AttributeValue, b: b as AttributeValue });
      }
    }
  }
  return deck;
}

export function shuffle<T>(items: readonly T[], random: RandomSource = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = result[i]!;
    const b = result[j]!;
    result[i] = b;
    result[j] = a;
  }
  return result;
}

export function createBoard(random: RandomSource = Math.random): Card[] {
  return shuffle(createDeck(), random).slice(0, BOARD_SIZE);
}

/** Stable string id for a card, e.g. "0-1-2". Useful for tests and debugging. */
export function cardId(card: Card): string {
  return `${card.s}-${card.c}-${card.b}`;
}
