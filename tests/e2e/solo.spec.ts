import { expect, test, type Page } from "@playwright/test";
import type { Card } from "../../src/domain/cards";
import { combinationLevel, findCombinations, isCombination } from "../../src/domain/combinations";
import { PROFILE_STORAGE_KEY } from "../../src/infrastructure/storage/schema";

const SEED = 42;

interface DebugState {
  board: Card[];
  score: number;
  foundKeys: string[];
}

/**
 * The app runs with ?seed=<n>, so boards are deterministic, and exposes the
 * session state through window.__COMBINATION_GAME__ for test inspection.
 */
async function readDebugState(page: Page): Promise<DebugState> {
  return page.evaluate(() => {
    const hook = window.__COMBINATION_GAME__;
    if (!hook) throw new Error("debug hook missing — app must run with ?seed=");
    return hook.getState() as unknown as DebugState;
  });
}

async function boardCards(page: Page): Promise<Card[]> {
  return (await readDebugState(page)).board;
}

/** A triple on the current board that is NOT a valid combination. */
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

async function clickCard(page: Page, index: number) {
  await page.locator(`[data-card-index="${index}"]`).click();
}

async function playTriple(page: Page, triple: number[]) {
  await page.getByRole("button", { name: "Find a set!" }).click();
  for (const index of triple) await clickCard(page, index);
}

async function dialog(page: Page) {
  return page.locator(".dialog");
}

async function startGame(page: Page, name = "Tester") {
  await page.goto(`/?seed=${SEED}`);
  await page.getByLabel("Player name").fill(name);
  await page.getByRole("button", { name: "Play solo" }).click();
  await expect(page.locator(".card-grid .game-card")).toHaveCount(9);
}

// Each test runs in a fresh, isolated browser context, so localStorage starts
// empty. Do NOT clear it via addInitScript here: init scripts re-run on every
// load, including mid-test reloads, which would wipe the persisted locale and
// profile that several tests rely on.
test("defaults to English", async ({ page }) => {
  await page.goto(`/?seed=${SEED}`);
  await expect(page).toHaveTitle("Combination Game");
  await expect(page.getByRole("button", { name: "Play solo" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("Korean switch applies immediately and persists across reload", async ({ page }) => {
  await page.goto(`/?seed=${SEED}`);
  await page.getByRole("button", { name: "한국어" }).click();
  await expect(page.getByRole("button", { name: "혼자 플레이" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");

  await page.reload();
  await expect(page.getByRole("button", { name: "혼자 플레이" })).toBeVisible();
});

test("requires a player name", async ({ page }) => {
  await page.goto(`/?seed=${SEED}`);
  await page.getByRole("button", { name: "Play solo" }).click();
  await expect(page.locator(".card-grid")).toHaveCount(0);
  const validation = await page.getByLabel("Player name").evaluate(
    (input: HTMLInputElement) => input.validationMessage,
  );
  expect(validation).toBe("Please enter a player name.");
});

test("correct set scores its level-weighted reward and records the set", async ({ page }) => {
  await startGame(page);
  const board = await boardCards(page);
  const triple = findCombinations(board)[0];
  if (!triple) {
    test.skip(true, "seeded board has no set — pick another seed");
    return;
  }

  await playTriple(page, triple);
  // Score equals the found set's difficulty-weighted reward (1/2/3 for Lv1/2/3).
  const level = combinationLevel(triple.map((index) => board[index]!));
  expect((await readDebugState(page)).score).toBe(level);
  await expect(await dialog(page)).toContainText(`+${level}`);
  // Feedback shows BOTH rewards: match points and mastery XP (10/15/25).
  const xp = [10, 15, 25][level - 1]!;
  await expect(await dialog(page)).toContainText(`+${xp}`);
  await expect(await dialog(page)).toContainText("Mastery XP");
  await expect(page.locator(".found-chip")).toHaveCount(1);
});

test("wrong triple explains the mixed attribute and cannot drop score below zero", async ({ page }) => {
  await startGame(page);
  const board = await boardCards(page);
  await playTriple(page, invalidTriple(board));

  // The penalty is applied but the Classic score floor keeps the score at 0.
  await expect(await dialog(page)).toContainText("−1");
  await expect(await dialog(page)).toContainText("two alike and one different");
  expect((await readDebugState(page)).score).toBe(0);
});

test("duplicate set does not score twice", async ({ page }) => {
  await startGame(page);
  const board = await boardCards(page);
  const triple = findCombinations(board)[0];
  if (!triple) {
    test.skip(true, "seeded board has no set — pick another seed");
    return;
  }

  await playTriple(page, triple);
  const level = combinationLevel(triple.map((index) => board[index]!));
  await playTriple(page, triple);
  await expect(await dialog(page)).toContainText("already found");
  expect((await readDebugState(page)).score).toBe(level);
});

test("wrong no-sets declaration costs −1 and reports remaining sets", async ({ page }) => {
  await startGame(page);
  const board = await boardCards(page);
  const remaining = findCombinations(board).length;
  test.skip(remaining === 0, "seeded board has no sets — pick another seed");

  await page.getByRole("button", { name: "No sets left!" }).click();
  await expect(await dialog(page)).toContainText(`${remaining} undiscovered`);
  // Wrong declaration is penalized, but the score floor keeps it at 0.
  expect((await readDebugState(page)).score).toBe(0);
});

test("full three-round session reaches results and persists mastery", async ({ page }) => {
  test.setTimeout(120_000);
  await startGame(page);

  for (let round = 0; round < 3; round += 1) {
    const board = await boardCards(page);
    const triples = findCombinations(board);
    for (const triple of triples) {
      await playTriple(page, triple);
    }
    await page.getByRole("button", { name: "No sets left!" }).click();
    await expect(page.getByRole("heading", { name: "Round complete!" })).toBeVisible();

    const isFinalRound = round === 2;
    await page
      .getByRole("button", { name: isFinalRound ? "See results" : "Next round" })
      .click();
  }

  await expect(page.getByRole("heading", { name: /Nice work, Tester/ })).toBeVisible();
  await expect(page.locator(".final-score")).toBeVisible();
  await expect(page.getByText("Mastery XP")).toBeVisible();
  await expect(page.getByText(/saved in this browser only/)).toBeVisible();

  // Progress must survive a reload (browser-local persistence).
  const stored = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    PROFILE_STORAGE_KEY,
  );
  expect(stored).not.toBeNull();
  const profile = JSON.parse(stored!) as {
    playerName: string;
    mastery: { xp: number; totalSetsFound: number; sessionsCompleted: number };
  };
  expect(profile.playerName).toBe("Tester");
  expect(profile.mastery.totalSetsFound).toBeGreaterThan(0);
  expect(profile.mastery.xp).toBeGreaterThan(0);
  expect(profile.mastery.sessionsCompleted).toBe(1);
});

test("clearing one board keeps verified XP even when the session is abandoned", async ({ page }) => {
  test.setTimeout(120_000);
  await startGame(page);

  // Clear board 1 fully, but do NOT advance — quit before the session ends.
  const board = await boardCards(page);
  for (const triple of findCombinations(board)) {
    await playTriple(page, triple);
  }
  await page.getByRole("button", { name: "No sets left!" }).click();
  await expect(page.getByRole("heading", { name: "Round complete!" })).toBeVisible();

  // The board's XP is checkpointed immediately, before any session finish.
  const stored = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    PROFILE_STORAGE_KEY,
  );
  expect(stored).not.toBeNull();
  const profile = JSON.parse(stored!) as {
    mastery: { xp: number; boardsCleared: number; sessionsCompleted: number };
  };
  expect(profile.mastery.xp).toBeGreaterThan(0);
  expect(profile.mastery.boardsCleared).toBe(1);
  // The session was abandoned, so it is not counted as completed.
  expect(profile.mastery.sessionsCompleted).toBe(0);
});

test("quit game asks for a styled confirmation and cancel keeps playing", async ({ page }) => {
  await startGame(page);

  await page.getByRole("button", { name: "Quit game" }).click();
  const quitDialog = page.getByRole("alertdialog");
  await expect(quitDialog).toBeVisible();
  await expect(quitDialog).toContainText("Leave this game and return home?");

  await quitDialog.getByRole("button", { name: "Keep playing" }).click();
  await expect(quitDialog).toHaveCount(0);
  await expect(page.locator(".card-grid .game-card")).toHaveCount(9);

  await page.getByRole("button", { name: "Quit game" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Leave game" }).click();
  await expect(page.getByRole("button", { name: "Play solo" })).toBeVisible();
});

test("malformed stored profile falls back to defaults without breaking", async ({ page }) => {
  await page.addInitScript(
    (key) => window.localStorage.setItem(key, "{definitely not json"),
    PROFILE_STORAGE_KEY,
  );
  await page.goto(`/?seed=${SEED}`);
  await expect(page.getByRole("button", { name: "Play solo" })).toBeVisible();
  await expect(page.getByLabel("Player name")).toHaveValue("");
});

test("legacy player name is adopted into the profile", async ({ page }) => {
  await page.addInitScript(
    () => window.localStorage.setItem("combination-game-player-name", "Legacy"),
  );
  await page.goto(`/?seed=${SEED}`);
  await expect(page.getByLabel("Player name")).toHaveValue("Legacy");
});

test("remaining-set count is hidden by default, revealed once for 1 point, hidden again next board", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await startGame(page);
  const board = await boardCards(page);
  const remaining = findCombinations(board).length;
  test.skip(remaining === 0, "seeded board has no sets — pick another seed");

  // Hidden by default: the HUD shows "?" and no exact count anywhere.
  const remainingCell = page.locator(".hud-remaining .hud-value");
  await expect(remainingCell).toHaveText("?");
  await expect(page.locator(".hud")).not.toContainText(`${remaining} undiscovered`);

  // Find one set so the score can actually pay the 1-point reveal cost.
  const first = findCombinations(board)[0]!;
  const level = combinationLevel(first.map((index) => board[index]!));
  await playTriple(page, first);

  // Pay the reveal cost: score drops by exactly 1 and the count appears.
  await page.getByRole("button", { name: /Reveal remaining/ }).click();
  expect((await readDebugState(page)).score).toBe(level - 1);
  await expect(remainingCell).toHaveText(String(remaining - 1));

  // The reveal is a one-time purchase: the button becomes a disabled readout.
  await expect(page.getByRole("button", { name: /Reveal remaining/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Remaining:/ })).toBeDisabled();
  expect((await readDebugState(page)).score).toBe(level - 1);

  // Finish board 1 and advance: the fresh board hides the count again.
  for (const triple of findCombinations(board).slice(1)) {
    await playTriple(page, triple);
  }
  await page.getByRole("button", { name: "No sets left!" }).click();
  await expect(page.getByRole("heading", { name: "Round complete!" })).toBeVisible();
  await page.getByRole("button", { name: "Next round" }).click();
  await expect(page.locator(".hud-remaining .hud-value")).toHaveText("?");
});

test("a wrong no-sets claim reveals the count without a second charge", async ({ page }) => {
  await startGame(page);
  const board = await boardCards(page);
  const remaining = findCombinations(board).length;
  test.skip(remaining === 0, "seeded board has no sets — pick another seed");

  await page.getByRole("button", { name: "No sets left!" }).click();
  // The penalty was applied (floored at 0) and the count is now visible.
  await expect(page.locator(".hud-remaining .hud-value")).toHaveText(String(remaining));
  // The paid reveal is used up: no second reveal fee exists.
  await expect(page.getByRole("button", { name: /Reveal remaining/ })).toHaveCount(0);
});

test("navigation: Rules and Settings from home and back, Korean localized", async ({ page }) => {
  await page.goto(`/?seed=${SEED}`);

  await page.getByRole("button", { name: "Rules" }).click();
  await expect(page.getByRole("heading", { name: "Rules" })).toBeVisible();
  await expect(page.getByText("Goal and components")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mastery XP" })).toBeVisible();

  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Play solo" })).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByText("Local storage is working")).toBeVisible();

  // Korean applies to the new screens too (use the header switcher; the
  // Settings language control shows the same active locale).
  await page.getByRole("banner").getByRole("button", { name: "한국어" }).click();
  await expect(page.getByRole("heading", { name: "설정" })).toBeVisible();
  await page.getByRole("button", { name: "규칙" }).click();
  await expect(page.getByRole("heading", { name: "게임 규칙" })).toBeVisible();
});

test("opening Settings mid-game and returning preserves the board and score", async ({ page }) => {
  await startGame(page);
  const board = await boardCards(page);
  const triple = findCombinations(board)[0];
  if (!triple) {
    test.skip(true, "seeded board has no set — pick another seed");
    return;
  }
  await playTriple(page, triple);
  const scoreBefore = (await readDebugState(page)).score;

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.getByRole("button", { name: "Play" }).click();

  // Same session continues: score kept, found set kept, board kept.
  expect((await readDebugState(page)).score).toBe(scoreBefore);
  await expect(page.locator(".found-chip")).toHaveCount(1);
  await expect(page.locator(".card-grid .game-card")).toHaveCount(9);
});

test("settings apply immediately and persist across reload", async ({ page }) => {
  await page.goto(`/?seed=${SEED}`);
  await page.getByRole("button", { name: "Settings" }).click();

  await page.getByRole("button", { name: "High contrast" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "high-contrast");
  await page.getByRole("button", { name: "Large", exact: true }).first().click();
  await expect(page.locator("html")).toHaveAttribute("data-card-size", "large");
  await page.getByRole("button", { name: "Off", exact: true }).first().click();
  await expect(page.locator("html")).toHaveClass(/no-scanlines/);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "high-contrast");
  await expect(page.locator("html")).toHaveAttribute("data-card-size", "large");
  await expect(page.locator("html")).toHaveClass(/no-scanlines/);
});

test("resetting mastery requires confirmation and erases progress", async ({ page }) => {
  test.setTimeout(120_000);
  await startGame(page);

  // Earn some real XP first.
  const board = await boardCards(page);
  const triple = findCombinations(board)[0];
  if (!triple) {
    test.skip(true, "seeded board has no set — pick another seed");
    return;
  }
  await playTriple(page, triple);

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Reset mastery progress" }).click();
  // Two-step flow: the destructive button only appears inside the confirm.
  await page.getByRole("button", { name: "Yes, erase progress" }).click();

  const stored = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    PROFILE_STORAGE_KEY,
  );
  const profile = JSON.parse(stored!) as { mastery: { xp: number; totalSetsFound: number } };
  expect(profile.mastery.xp).toBe(0);
  expect(profile.mastery.totalSetsFound).toBe(0);
});
