/**
 * Combination rules. Pure: no React, DOM, storage, or network.
 *
 * A valid combination contains exactly 3 distinct cards. For EACH of the
 * three attributes independently, the values must be either all identical
 * or all different. A 2+1 split on any attribute makes it invalid.
 */
import { ATTRIBUTE_KEYS, cardId, type AttributeKey, type AttributeValue, type Card } from "./cards";

/**
 * Difficulty hypothesis from the design brief: a combination's level is the
 * number of attributes that are all-different. Level 1 = one all-different
 * attribute (two all-same), level 3 = all three all-different. Treat as a
 * testable hypothesis, not a proven difficulty scale.
 */
export type CombinationLevel = 1 | 2 | 3;

export type AttributePattern = "all-same" | "all-different" | "mixed";

export interface MixedAttribute {
  attribute: AttributeKey;
  values: [AttributeValue, AttributeValue, AttributeValue];
  pattern: "mixed";
}

function attributeIsValid(a: number, b: number, c: number): boolean {
  return (a === b && b === c) || (a !== b && a !== c && b !== c);
}

export function attributePattern(
  a: AttributeValue,
  b: AttributeValue,
  c: AttributeValue,
): AttributePattern {
  if (a === b && b === c) return "all-same";
  if (a !== b && a !== c && b !== c) return "all-different";
  return "mixed";
}

export function isCombination(cards: readonly Card[]): boolean {
  if (!Array.isArray(cards) || cards.length !== 3) return false;
  const [first, second, third] = cards;
  if (!first || !second || !third) return false;
  return ATTRIBUTE_KEYS.every((key) =>
    attributeIsValid(first[key], second[key], third[key]),
  );
}

/** Order-independent key for a triple of board indices, e.g. "2,4,8". */
export function combinationKey(indices: readonly number[]): string {
  if (!Array.isArray(indices) || indices.length !== 3) {
    throw new TypeError("A combination must contain exactly three card indices.");
  }
  return [...indices].sort((a, b) => a - b).join(",");
}

export function findCombinations(
  cards: readonly Card[],
  excludedKeys: ReadonlySet<string> = new Set(),
): number[][] {
  const results: number[][] = [];
  for (let i = 0; i < cards.length; i += 1) {
    for (let j = i + 1; j < cards.length; j += 1) {
      for (let k = j + 1; k < cards.length; k += 1) {
        const first = cards[i];
        const second = cards[j];
        const third = cards[k];
        if (!first || !second || !third) continue;
        if (isCombination([first, second, third])) {
          const key = combinationKey([i, j, k]);
          if (!excludedKeys.has(key)) results.push([i, j, k]);
        }
      }
    }
  }
  return results;
}

/**
 * Level of a VALID combination: number of all-different attributes.
 * Throws for invalid combinations or non-distinct cards — callers must
 * validate with `isCombination` first.
 */
export function combinationLevel(cards: readonly Card[]): CombinationLevel {
  if (!isCombination(cards)) {
    throw new Error("combinationLevel requires a valid combination of three cards.");
  }
  const ids = new Set(cards.map(cardId));
  if (ids.size !== 3) {
    throw new Error("A combination must contain three distinct cards.");
  }
  const [first, second, third] = cards as [Card, Card, Card];
  let level = 0;
  for (const key of ATTRIBUTE_KEYS) {
    if (attributePattern(first[key], second[key], third[key]) === "all-different") level += 1;
  }
  // Three distinct cards can never be all-same on every attribute, so level >= 1.
  return level as CombinationLevel;
}

/**
 * Explains WHY a triple is invalid: the attributes whose values form a
 * mixed 2+1 pattern. Returns an empty array for a valid combination.
 * Drives concise player-facing feedback ("shape: two match, one differs").
 */
export function explainInvalid(cards: readonly Card[]): MixedAttribute[] {
  if (!Array.isArray(cards) || cards.length !== 3) return [];
  const [first, second, third] = cards;
  if (!first || !second || !third) return [];
  const mixed: MixedAttribute[] = [];
  for (const key of ATTRIBUTE_KEYS) {
    const values: [AttributeValue, AttributeValue, AttributeValue] = [
      first[key],
      second[key],
      third[key],
    ];
    if (attributePattern(values[0], values[1], values[2]) === "mixed") {
      mixed.push({ attribute: key, values, pattern: "mixed" });
    }
  }
  return mixed;
}
