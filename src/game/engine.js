export const SHAPE_COUNT = 3;
export const SHAPE_COLOR_COUNT = 3;
export const BACKGROUND_COUNT = 3;
export const BOARD_SIZE = 9;

export function createDeck() {
  const deck = [];
  for (let s = 0; s < SHAPE_COUNT; s += 1) {
    for (let c = 0; c < SHAPE_COLOR_COUNT; c += 1) {
      for (let b = 0; b < BACKGROUND_COUNT; b += 1) {
        deck.push({ s, c, b });
      }
    }
  }
  return deck;
}

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createBoard(random = Math.random) {
  return shuffle(createDeck(), random).slice(0, BOARD_SIZE);
}

function attributeIsValid(a, b, c) {
  return (a === b && b === c) || (a !== b && a !== c && b !== c);
}

export function isCombination(cards) {
  if (!Array.isArray(cards) || cards.length !== 3) return false;
  return ["s", "c", "b"].every((key) =>
    attributeIsValid(cards[0][key], cards[1][key], cards[2][key])
  );
}

export function combinationKey(indices) {
  if (!Array.isArray(indices) || indices.length !== 3) {
    throw new TypeError("A combination must contain exactly three card indices.");
  }
  return [...indices].sort((a, b) => a - b).join(",");
}

export function findCombinations(cards, excludedKeys = new Set()) {
  const results = [];
  for (let i = 0; i < cards.length; i += 1) {
    for (let j = i + 1; j < cards.length; j += 1) {
      for (let k = j + 1; k < cards.length; k += 1) {
        const indices = [i, j, k];
        if (isCombination(indices.map((index) => cards[index]))) {
          const key = combinationKey(indices);
          if (!excludedKeys.has(key)) results.push(indices);
        }
      }
    }
  }
  return results;
}
