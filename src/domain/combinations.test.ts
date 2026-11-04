import { describe, expect, it } from "vitest";
import { createBoard, createDeck, cardId, type Card } from "./cards";
import {
  combinationKey,
  combinationLevel,
  explainInvalid,
  findCombinations,
  isCombination,
} from "./combinations";
import { mulberry32 } from "./rng";

describe("createDeck", () => {
  it("returns all 27 unique cards", () => {
    const deck = createDeck();
    expect(deck.length).toBe(27);
    expect(new Set(deck.map(cardId)).size).toBe(27);
  });
});

describe("createBoard", () => {
  it("returns nine distinct cards", () => {
    const board = createBoard(() => 0.42);
    expect(board.length).toBe(9);
    expect(new Set(board.map(cardId)).size).toBe(9);
  });

  it("is deterministic with a seeded random source", () => {
    const a = createBoard(mulberry32(7)).map(cardId);
    const b = createBoard(mulberry32(7)).map(cardId);
    expect(a).toEqual(b);
  });
});

describe("isCombination", () => {
  it("accepts all-same and all-different attributes", () => {
    // s: all same, c: all same, b: all different
    expect(
      isCombination([
        { s: 0, c: 1, b: 2 },
        { s: 0, c: 1, b: 0 },
        { s: 0, c: 1, b: 1 },
      ]),
    ).toBe(true);

    // everything all-different
    expect(
      isCombination([
        { s: 0, c: 0, b: 0 },
        { s: 1, c: 1, b: 1 },
        { s: 2, c: 2, b: 2 },
      ]),
    ).toBe(true);
  });

  it("rejects a mixed (2+1) attribute", () => {
    expect(
      isCombination([
        { s: 0, c: 0, b: 0 },
        { s: 0, c: 1, b: 1 },
        { s: 1, c: 2, b: 2 },
      ]),
    ).toBe(false);
  });

  it.each(["s", "c", "b"] as const)("rejects a 2+1 split on attribute %s", (attribute) => {
    const base: Card[] = [
      { s: 0, c: 0, b: 0 },
      { s: 1, c: 1, b: 1 },
      { s: 2, c: 2, b: 2 },
    ];
    // Break exactly one attribute into a 2+1 pattern.
    const broken = base.map((card, index) =>
      index === 2 ? { ...card, [attribute]: 1 } : card,
    );
    expect(isCombination(broken)).toBe(false);
  });

  it("rejects anything that is not exactly three cards", () => {
    expect(isCombination([])).toBe(false);
    expect(isCombination([{ s: 0, c: 0, b: 0 }])).toBe(false);
  });
});

describe("combinationKey", () => {
  it("is order-independent", () => {
    expect(combinationKey([8, 2, 4])).toBe("2,4,8");
  });

  it("throws unless given exactly three indices", () => {
    expect(() => combinationKey([1, 2])).toThrow(TypeError);
  });
});

describe("findCombinations", () => {
  const cards: Card[] = [
    { s: 0, c: 0, b: 0 },
    { s: 1, c: 1, b: 1 },
    { s: 2, c: 2, b: 2 },
    { s: 0, c: 1, b: 2 },
  ];

  it("finds valid triples and respects exclusions", () => {
    const all = findCombinations(cards);
    expect(all.some((triple) => triple.join(",") === "0,1,2")).toBe(true);

    const filtered = findCombinations(cards, new Set(["0,1,2"]));
    expect(filtered.some((triple) => combinationKey(triple) === "0,1,2")).toBe(false);
  });
});

describe("combinationLevel", () => {
  it("counts all-different attributes", () => {
    // Level 1: only the background is all-different.
    expect(
      combinationLevel([
        { s: 0, c: 0, b: 0 },
        { s: 0, c: 0, b: 1 },
        { s: 0, c: 0, b: 2 },
      ]),
    ).toBe(1);

    // Level 2: shape all-same, color and background all-different.
    expect(
      combinationLevel([
        { s: 0, c: 0, b: 0 },
        { s: 0, c: 1, b: 1 },
        { s: 0, c: 2, b: 2 },
      ]),
    ).toBe(2);

    // Level 3: everything all-different.
    expect(
      combinationLevel([
        { s: 0, c: 0, b: 0 },
        { s: 1, c: 1, b: 1 },
        { s: 2, c: 2, b: 2 },
      ]),
    ).toBe(3);
  });

  it("throws for invalid combinations", () => {
    expect(() =>
      combinationLevel([
        { s: 0, c: 0, b: 0 },
        { s: 0, c: 1, b: 1 },
        { s: 1, c: 2, b: 2 },
      ]),
    ).toThrow();
  });

  it("throws for three identical cards", () => {
    const same: Card = { s: 1, c: 1, b: 1 };
    expect(() => combinationLevel([same, same, same])).toThrow();
  });
});

describe("explainInvalid", () => {
  it("names every mixed attribute", () => {
    // s is 2+1; c and b are all-different.
    const mixed = explainInvalid([
      { s: 0, c: 0, b: 0 },
      { s: 0, c: 1, b: 1 },
      { s: 1, c: 2, b: 2 },
    ]);
    expect(mixed.length).toBe(1);
    expect(mixed[0]!.attribute).toBe("s");
    expect(mixed[0]!.pattern).toBe("mixed");
  });

  it("returns an empty list for a valid combination", () => {
    expect(
      explainInvalid([
        { s: 0, c: 0, b: 0 },
        { s: 1, c: 1, b: 1 },
        { s: 2, c: 2, b: 2 },
      ]),
    ).toEqual([]);
  });
});
