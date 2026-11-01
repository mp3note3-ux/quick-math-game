import test from "node:test";
import assert from "node:assert/strict";
import {
  combinationKey,
  createBoard,
  createDeck,
  findCombinations,
  isCombination,
} from "./engine.js";

test("createDeck returns all 27 unique cards", () => {
  const deck = createDeck();
  assert.equal(deck.length, 27);
  assert.equal(new Set(deck.map((card) => [card.s, card.c, card.b].join("-"))).size, 27);
});

test("createBoard returns nine distinct cards", () => {
  const board = createBoard(() => 0.42);
  assert.equal(board.length, 9);
  assert.equal(new Set(board.map((card) => [card.s, card.c, card.b].join("-"))).size, 9);
});

test("isCombination accepts all-same and all-different attributes", () => {
  assert.equal(isCombination([
    { s: 0, c: 1, b: 2 },
    { s: 0, c: 1, b: 0 },
    { s: 0, c: 1, b: 1 },
  ]), true);

  assert.equal(isCombination([
    { s: 0, c: 0, b: 0 },
    { s: 1, c: 1, b: 1 },
    { s: 2, c: 2, b: 2 },
  ]), true);
});

test("isCombination rejects a mixed attribute", () => {
  assert.equal(isCombination([
    { s: 0, c: 0, b: 0 },
    { s: 0, c: 1, b: 1 },
    { s: 1, c: 2, b: 2 },
  ]), false);
});

test("findCombinations does not return excluded combinations", () => {
  const cards = [
    { s: 0, c: 0, b: 0 },
    { s: 1, c: 1, b: 1 },
    { s: 2, c: 2, b: 2 },
    { s: 0, c: 1, b: 2 },
  ];
  const all = findCombinations(cards);
  assert.ok(all.some((triple) => triple.join(",") === "0,1,2"));

  const filtered = findCombinations(cards, new Set(["0,1,2"]));
  assert.ok(!filtered.some((triple) => combinationKey(triple) === "0,1,2"));
});

test("combinationKey is order-independent", () => {
  assert.equal(combinationKey([8, 2, 4]), "2,4,8");
});
