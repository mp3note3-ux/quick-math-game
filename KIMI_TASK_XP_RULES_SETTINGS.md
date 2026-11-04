# Kimi K3 Task — Integrate Mastery XP, Hide Remaining-Set Count, Add Rules & Settings

**Prepared:** 2026-11-05  
**Target:** Kimi K3 running in the Claude Code harness  
**Repository:** https://github.com/mp3note3-ux/quick-math-game  
**Product reference:** `GAME_DESIGN_IMPROVEMENT.md` v3.0 remains the authoritative roadmap.

> This is a scoped implementation brief for the next owner-requested pass. It supplements `CLAUDE.md` and the v3.0 design roadmap; it does not replace or weaken either.

## 1. Goal

Improve the actual play experience so that:

1. Mastery XP feels like a natural part of finding sets and improving, not a separate progress widget that players can easily miss.
2. The exact number of undiscovered sets is not always visible. Players should have to judge when the board is clear, while retaining an optional, explicit way to reveal the count at a score cost.
3. Rules are available in a dedicated, easy-to-find Rules screen/tab rather than relying on the short introduction currently shown on the home screen.
4. Players can personalize useful aspects of the game through a real Settings screen, with preferences that actually work and persist.
5. The gameplay interface and shared navigation become clearer without changing the current home-screen design.

Do not start by building more game modes. Finish this focused player-experience pass first.

## 2. Inspect the implementation before changing it

Read `CLAUDE.md`, `GAME_DESIGN_IMPROVEMENT.md`, `HANDOFF_FOR_NEXT_LLM.md`, and `README.md`. Inspect the current working tree, recent commits, package scripts, relevant source files, and tests. Documentation can be stale; code is the source of truth.

Known baseline from commit `fc18caf` (re-check before relying on it):

- `src/features/game/GameScreen.tsx` always renders the result of `remainingCombinations(state).length` in the HUD. The same screen shows score feedback for a found set, but that feedback currently describes points, not the XP earned for the set.
- `src/domain/session.ts` already makes `declare-no-sets` a real claim: if sets remain it applies the wrong-declaration penalty and reports the remaining count; if none remain it completes the board and applies the clear bonus. With the count always visible, however, the claim is predictable and feels like a dressed-up Next Round button.
- Live Classic scoring in `src/domain/scoring.ts` is Level 1/2/3 = +1/+2/+3 points, wrong set = −1, incorrect No Sets declaration = −1, correct No Sets declaration = +3, with a score floor of 0. The values are still candidates pending human playtesting.
- `src/domain/progression.ts` awards 10/15/25 Mastery XP for Level 1/2/3 sets and +25 XP for a cleared board. Ranks are Novice (0), Spotter (100), Pattern Seeker (300), Set Finder (700), Combo Master (1500), and Grandmaster (3000).
- `src/app/App.tsx` persists XP at completed-board checkpoints, guarded against duplicate awards. The current unfinished board is not yet a saved checkpoint. Session stats are recorded separately at session end.
- `src/app/RankBar.tsx` is currently used on the home and results screens. It is not part of the active gameplay HUD.
- `src/features/settings/` currently contains only `LanguageSwitcher.tsx`. There is no full Settings screen.
- The Rules content is currently a short three-step `HOW_TO_STEPS` block in `src/features/home/HomeScreen.tsx`; there is no dedicated Rules screen.
- `App.tsx` currently switches between home and game/results. `Header.tsx` is shared by the home, game, and results screens and is the natural place to consider consistent top-level navigation.
- `StoredProfile` in `src/infrastructure/storage/schema.ts` is schema version 1 and currently stores the player name and mastery stats, but no general preferences.

Inspect the exact current types and flows before extending them. The list above is a starting map, not permission to assume the code has not changed.

## 3. Priority A — make Mastery XP part of the play loop

### Player-facing behavior

XP must be visible at the moments when players earn it, and the player must understand what it represents.

1. Add a compact Mastery indicator to the active gameplay interface. It should show the player's current rank and clear progress toward the next rank. Keep it visually related to the gameplay HUD, but visually distinct from Match Score. Do not add a large detached panel that competes with the board.
2. When a valid set is found, show both rewards together in localized feedback. For example: `+2 Points · +15 Mastery XP`. Keep Match Score and Mastery XP semantically distinct; never label XP as score.
3. Make clear whether current-board XP is pending or saved. The existing persistence model checkpoints a board when it is completed. Do not imply that unfinished-board XP has already been permanently saved. A compact `This board: +X XP` pending indicator is acceptable.
4. When a board is cleared, show a readable XP breakdown: XP from Level 1 sets, Level 2 sets, Level 3 sets, the +25 board-clear reward, and the total. Show the updated rank/progress after the checkpoint has been saved.
5. Keep the results summary, but make its session XP and lifetime Mastery progress easy to distinguish. Avoid repeating the same large rank panel in every location.
6. Add a subtle, accessible rank-up acknowledgement when a threshold is crossed. Respect reduced-motion preferences and do not use a long or obstructive animation.

### Implementation rules

- Reuse `xpForSets`, `XP_PER_LEVEL`, `XP_PER_BOARD_CLEARED`, `rankForXp`, and the existing rank names/thresholds unless the owner explicitly approves a balance change.
- The current per-board checkpoint model must remain idempotent. Reloading, revisiting a screen, replaying a result, or clicking Next Round twice must not duplicate XP.
- If you change when XP is persisted, first design and test a reliable idempotency key. Do not trade away the existing early-exit protection.
- The compact gameplay progress indicator may show saved XP plus a clearly labelled current-board preview, but must not double-count a board after its checkpoint is committed.
- Do not add login rewards, time/presence rewards, button-click rewards, an artificial currency, loot boxes, or an unrelated economy.
- Keep achievements, milestone collections, and unlockables on the v3.0 roadmap. This pass should establish a cohesive visible mastery loop and leave clean extension points; do not silently claim the wider achievement/unlock roadmap is complete.

### XP acceptance criteria

- A player can find the current rank and next-rank progress during a board without leaving gameplay.
- A correct-set feedback event communicates both point reward and XP reward, with the correct 10/15/25 amount for its level.
- A completed board clearly explains its XP total and the +25 clear bonus.
- The interface never describes uncheckpointed XP as already saved.
- Existing completed-board XP survives early exit and is never duplicated.
- English and Korean feedback are complete and natural.

## 4. Priority B — hide remaining sets by default and make information an explicit choice

### Approved interaction direction

The exact remaining-set count must be **hidden by default**. The player should decide when they believe no valid sets remain and use `No sets left!` as a genuine claim/verification action.

Add a secondary action near the `No sets left!` control:

- Before use: `Reveal remaining count (−1 point)` (localized).
- On use: deduct 1 point using the normal Classic score floor, reveal the exact number of undiscovered valid sets, and keep the number visible for the rest of that board.
- The reveal is available only once per board. It must not charge again on subsequent renders or clicks. A new board resets the revealed state.
- Do not reveal which cards form the remaining sets; reveal only the count.
- If the player is in the middle of selecting three cards, disable the reveal action rather than interrupting the selection.

The −1 reveal cost is the proposed first-pass value because it matches the current modest mistake penalty. Keep it in scoring configuration (not hard-coded in JSX), test it, and describe it in Rules. It is a balance candidate, not a reason to change the existing +1/+2/+3 set rewards. The current score floor of 0 still applies.

### Interaction with `No sets left!`

- Keep `No sets left!` as a claim, not a Next Round button. A correct claim should remain the only action that completes the board and awards the existing +3 clear declaration bonus.
- An incorrect claim continues to cost the existing −1 point and reports how many sets remain. Treat that feedback as the information the player has paid for: reveal the count for the remainder of the board, without charging a second reveal fee.
- A correct claim completes the board, triggers the existing +25 board-clear XP checkpoint, and displays the normal board-complete action.
- Do not auto-advance the board after the claim. Keep the explicit Next Round / Finish Game step.
- A player who chooses not to reveal the count should never see the exact count in the normal HUD. It may appear after an incorrect claim because that claim already incurred its penalty.

### State and tests

- Add a per-board state flag and reducer event for count reveal, or an equivalent implementation consistent with the existing reducer architecture.
- Reset the reveal flag in the same place that a new board resets found combinations and selection state.
- Ensure the reveal penalty is applied once, through the scoring/domain layer, and respects `scoreFloor`.
- Add reducer/unit tests for first reveal, repeat reveal, per-board reset, reveal during selection, wrong-claim disclosure without double charging, correct claim, and score-floor behavior.
- Add Playwright coverage proving that the HUD count is initially absent, appears after reveal, and remains absent on a fresh board until requested.

## 5. Priority C — add a dedicated Rules screen/tab

Create a full Rules screen with a dedicated navigation entry. A three-bullet summary is not enough for the complete rules now that scoring, XP, and information-reveal mechanics need explanation.

Include concise, well-organized sections:

1. **Goal and components:** 27 unique cards; 3 shapes, 3 shape colors, and 3 background colors; standard board of 9 distinct cards.
2. **How a set works:** exactly 3 distinct cards; for each attribute independently, values must be all identical or all different.
3. **What is not a set:** a 2+1 split on even one attribute invalidates the triple. Include a clear visual or card-based example if the current component system makes this practical.
4. **How a turn works:** call `Find a set!`, select three cards, read the result, and use `No sets left!` only when the player believes the board has no undiscovered sets.
5. **Remaining-count reveal:** hidden by default; optional one-time reveal costs 1 point for that board; an incorrect No Sets claim still costs its existing penalty and reveals the remaining count.
6. **Match Score:** Level 1/2/3 rewards are currently +1/+2/+3; incorrect set −1; incorrect No Sets claim −1; correct No Sets claim +3; score floor 0. Source values from the live scoring config rather than duplicating magic numbers.
7. **Mastery XP:** Level 1/2/3 award 10/15/25 XP; clearing a board awards +25 XP; XP is separate from Match Score and contributes to the six mastery ranks. Explain that completed-board XP is saved locally in this browser.
8. **Progress and privacy:** explain that mastery data is local to this browser/device and is not an online account or cloud leaderboard.

Use small examples/diagrams where they genuinely teach the rule. The screen should support scanning, keyboard navigation, mobile layouts, and EN/KO localization. Use the live config/rank constants as the source of numerical truth wherever feasible so the Rules screen cannot drift from gameplay.

## 6. Priority D — create a real Settings screen and useful player controls

Create a dedicated Settings screen reachable from top-level navigation. Settings must change the real experience, preview immediately where appropriate, and persist after reload.

### First useful settings set

Implement a curated first version rather than an unbounded editor:

- **General:** expose the existing English/Korean language choice here as well as retaining the current quick language switcher if useful.
- **Appearance:** Classic 16-bit theme and a high-contrast theme; card size (small/standard/large); UI/text scale (small/standard/large); scanline overlay on/off.
- **Accessibility:** reduced motion (respect system preference by default, with a manual override); strong focus/selection emphasis; make the high-contrast option work across all relevant screens.
- **Data:** show that progress is stored locally and show a useful save/storage status; provide a clearly labelled, styled confirmation flow for resetting mastery progress. Do not make reset a one-click destructive action.

Do not add audio controls unless an actual audio feature exists. Do not add hint controls or other switches that have no current behavior. Do not add an option that makes remaining-set count permanently visible for free; the in-game reveal remains an explicit scored choice.

### Persistence and architecture

- Extend the current typed/versioned profile storage rather than adding unrelated localStorage writes throughout components.
- Add typed preferences with safe defaults and runtime validation.
- Migrate existing schema-version-1 profiles without losing player name, mastery XP, rank progress, or stats. Bump the schema version deliberately and test migration from the currently deployed shape.
- Malformed preferences should fall back safely; a bad preference should not erase otherwise valid mastery data if the storage design can validate those parts independently.
- Apply preferences through a small context/provider or the existing app shell and CSS custom properties/data attributes. Keep pure `src/domain/` modules free of React, DOM, localStorage, and network dependencies.
- Keep locale selection compatible with the existing `I18nContext` and locale storage key. Avoid having two controls that disagree about the active language.
- Settings should remain usable while a game is in progress. Opening Rules or Settings and returning must preserve the board, score, selected cards, current round, and feedback state; it must not restart the session.
- Preferences such as theme, scale, card size, and motion must not alter score, XP, or ranking eligibility.
- Surface storage failures honestly using the existing save-warning pattern. Never claim a preference or progress reset was saved if persistence failed.

## 7. Navigation and visual cleanup

Add consistent top-level navigation for **Play**, **Rules**, and **Settings**. It should be available from the home, active-game, and results contexts, indicate the current section, and have a sensible mobile layout.

The Rules and Settings screens should share the existing 16-bit visual language and design tokens, but improve hierarchy and spacing. Clean up the active gameplay HUD so the board remains the visual focus, the hidden-count control is understandable, and the mastery indicator is visible without overwhelming the cards.

Preserve semantic buttons/labels, keyboard navigation, visible focus, sufficient contrast, screen-reader feedback, and mobile touch targets. All new user-facing copy must be added to both `src/i18n/locales/en.json` and `src/i18n/locales/ko.json`, with the existing locale parity tests passing.

### Explicit boundary: do not redesign the home screen

The home-screen visual redesign is a separate task for Claude. **Do not take on that redesign in this Kimi task.** Do not restructure or restyle `HomeScreen.tsx`, its title/hero, start form, existing content panels, home-rank layout, or the home-specific CSS.

Only make the smallest necessary wiring change to let the shared navigation open Rules/Settings from the home screen (for example, adding navigation callbacks to the existing Header usage). Keep the current home layout and visual treatment intact. Do not add a new home dashboard, new home sections, or a replacement home layout.

## 8. Scope guardrails

- Keep this a solo/browser-local task. Do not implement rooms, room codes, accounts, backend/auth, realtime sync, cloud saves, host/student roles, server-authoritative scoring, online rankings, class/team dashboards, or multiplayer fairness systems.
- Do not build new solo modes in this pass.
- Do not change the core 27-card / 3-attribute / 3-card set rule.
- Do not add a timer or punish a player for pausing, thinking, or leaving a solo session.
- Do not change the current difficulty-weighted score or XP amounts without a documented experiment and owner-facing explanation.
- Do not remove or mark complete the outstanding achievements, milestones, unlockables, solo modes, or other v3.0 roadmap requirements merely because this task does not implement them.
- Reuse the current React + TypeScript + Vite, reducer/domain, localization, CSS-token, Vitest, and Playwright patterns. Do not add dependencies without a clear need.

## 9. Verification requirements

Add/adjust tests as behavior is introduced. At minimum cover:

- Domain/reducer tests for count reveal and No Sets claim behavior, including one-time penalty and round reset.
- Tests that set rewards and XP rewards match Level 1/2/3 and that board-clear XP is not duplicated.
- Tests for compact rank/progress feedback, pending-versus-saved XP, board reward breakdown, and rank-up behavior.
- Profile schema migration from v1, defaults, invalid values, preference persistence, and storage failure.
- EN/KO key and placeholder parity.
- Playwright flows for Rules/Settings navigation from home/game/results, returning to an in-progress game without state loss, hidden count by default, paid reveal, and settings surviving reload.
- Keyboard and mobile viewport checks for the new navigation and screens.

Run the relevant focused tests, then `npm test`, `npm run build`, and `npm run test:e2e` when feasible. Use `npm run simulate` only if scoring balance or scoring logic is changed; the existing simulation has documented limitations and is not a substitute for human playtesting.

## 10. Documentation and final report

After implementation, update the relevant status in `GAME_DESIGN_IMPROVEMENT.md`, `HANDOFF_FOR_NEXT_LLM.md`, and `README.md` where necessary. Preserve the v3.0 roadmap and clearly distinguish shipped behavior from remaining work. Do not edit unrelated documentation just for appearance.

Your final report must state:

1. What changed for XP visibility/integration.
2. How remaining-set count now works, including the reveal cost and No Sets behavior.
3. What Rules and Settings screens/navigation were added.
4. Exactly what was and was not changed in `HomeScreen.tsx`.
5. How settings are stored/migrated and what controls are actually functional.
6. Files changed, tests/commands run, and their real outcomes.
7. Remaining gaps, especially achievements/milestones/unlocks and any settings deferred.

Do not say a feature is complete unless it is implemented, usable, localized, persisted where required, and covered by tests.