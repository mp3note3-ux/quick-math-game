# AI Handoff: Combination Game

## 1. Project identity

- Repository: https://github.com/mp3note3-ux/quick-math-game
- Default branch: `main`
- App: browser-based single-page game
- Frontend: Vite 6, React 19, strict TypeScript, CSS
- Tests: Vitest and Playwright
- Languages: English (default) and Korean
- Current package version: 0.2.0

This document describes the known baseline. Always inspect current source and git status before implementation.

## 2. Product direction — important owner clarification

The React/TypeScript Stage 1 established a technical foundation, but it did not deliver a substantially new solo experience. The owner has clarified that **single-player content, scoring, meaningful progression, a GUI Settings screen, and quality-of-life are now the immediate product priorities**.

Read these first:
- `CLAUDE.md`: coding instructions for Kimi K3 through the Claude Code harness.
- `GAME_DESIGN_IMPROVEMENT.md`: full product brief, current gaps, solo and multiplayer tracks, settings, scoring/XP proposals, and implementation sequence.

Do NOT treat all advanced modes as multiplayer-only. Practice/Academy, Sprint/Time Attack, Prism Contracts, Endurance, Daily Challenge, Constellation Chain, and Ghost Run are solo-first candidates.

The idle-player ranking concern is primarily a multiplayer problem. Do not punish a solo player for pausing, thinking, or leaving a game. Multiplayer fairness/eligibility belongs to its own later track.

## 3. Current code architecture

```text
.
├── .github/workflows/ci.yml
├── docs/scoring-simulation.md
├── index.html
├── package.json
├── playwright.config.ts
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── app/                  # App shell, header, locale provider, helpers
│   ├── domain/               # Pure game rules and tests
│   │   ├── cards.ts
│   │   ├── combinations.ts
│   │   ├── session.ts
│   │   ├── scoring.ts
│   │   ├── progression.ts
│   │   ├── rng.ts
│   │   └── simulation/
│   ├── features/
│   │   ├── home/
│   │   ├── game/
│   │   ├── results/
│   │   └── settings/          # Currently language switcher only
│   ├── i18n/                  # Typed EN/KO catalogs and parity tests
│   ├── infrastructure/storage/
│   │   ├── schema.ts
│   │   ├── repository.ts
│   │   └── storage.test.ts
│   └── styles/                # tokens.css, global.css, components.css
└── tests/e2e/solo.spec.ts
```

## 4. Existing rules

There are 27 unique cards (3 shapes × 3 shape colors × 3 background colors). The standard board has 9 distinct cards. A valid set has exactly 3 distinct cards, with each attribute independently all-same or all-different. Any 2+1 split invalidates the triple.

Difficulty level currently means the number of all-different attributes:
- Level 1: one all-different, two all-same.
- Level 2: two all-different, one all-same.
- Level 3: all three all-different.

This is a structural hypothesis, not a proven human difficulty scale.

## 5. Current implementation — do not overstate it

### Implemented technical foundation
- React + TypeScript + Vite migration.
- Pure domain modules and tests.
- Configurable score model and combination difficulty classification.
- Initial scoring simulations and a generated report.
- Basic local mastery XP/stat model.
- Typed/versioned localStorage profile repository.
- EN/KO catalogs with key/placeholder parity checks.
- 16-bit/JRPG-inspired interface.
- Playwright solo flow tests and GitHub Actions CI.

### Current solo content
The actual player-facing game is still essentially one three-round Classic flow. There are no complete alternative solo modes yet.

### Current live scoring
Verify `src/domain/scoring.ts`; last inspected defaults were:
- Correct set: +1 at every difficulty level.
- Wrong set: -1.
- Incorrect “No sets left!”: -1.
- Correct “No sets left!”: +3.

The module supports per-level rewards, but the actual default remains flat `[1,1,1]`. Difficulty classification exists; difficulty-weighted rewards have NOT been enabled in the live game.

### Current XP and persistence
Last inspected values:
- 10 XP per verified set.
- 25 XP per cleared board.
- Lifetime totals, level breakdown, boards cleared, sessions completed, best score.

This is a basic XP/stat foundation, not a complete progression experience. It has no mastery rank/level, next-rank progress bar, unlock loop, or meaningful milestone path. The app records XP at session completion, so a player who exits before finishing the full session can lose already verified progress from that session.

### Current settings
There is an English/Korean language switcher. There is NOT a full GUI Settings screen. Appearance, theme, card size, UI scale, accessibility, motion, feedback, audio (if supported), solo defaults, and data controls are not yet exposed through a settings interface.

### Current simulation caveat
`docs/scoring-simulation.md` compares flat and weighted candidate models, but should NOT be treated as decisive balance evidence:
- The realistic bot's find rate is not level-sensitive.
- Random streams are not guaranteed to produce equivalent paired decisions for each bot/scenario.
- It models one board rather than full sessions/modes.
- It does not measure real human solve-time/accuracy.

Improve the simulation and run human playtests before choosing final weights.

## 6. Immediate product roadmap — solo first

Refer to `GAME_DESIGN_IMPROVEMENT.md` for full requirements and acceptance criteria.

### Milestone 1: better scoring + meaningful mastery
- Test Level 1/2/3 reward models and score breakdown.
- Revisit wrong-answer and board-clear rewards by mode.
- Make Practice safe for mistakes; use mode-appropriate consequences elsewhere.
- Design difficulty-aware XP, mastery ranks, XP progress, and meaningful milestones.
- Save verified progression at board checkpoints exactly once, so early exit does not erase completed work.
- Display per-level stats, XP awarded, personal bests, and result breakdowns.

### Milestone 2: GUI Settings
Add a real Settings screen reachable from home and during solo play:
- General/language.
- Appearance themes, card style/size, UI/text scale, board spacing.
- Accessibility: high contrast, color-vision-friendly palette, reduced motion, disable scanlines/flashing, keyboard help.
- Feedback and hint preferences.
- Supported solo gameplay defaults.
- Audio controls only for audio features that exist.
- Local data/save status, reset controls, and carefully guarded export/import if implemented.
Settings should have live preview, local persistence, runtime validation, versioning/migration, English/Korean localization, and accessible controls. Accessibility preferences must never alter scoring.

### Milestone 3: solo game modes
Recommended order:
1. Practice / Academy.
2. Time Attack / Sprint.
3. Prism Contracts.
4. Endurance / Survival.
5. Daily Challenge.
6. Constellation Chain.
7. Ghost Run, personal quests, and expanded milestones/unlocks.

Each mode must be a complete playable loop with onboarding, defined rules, scoring/reward behavior, results, personal records, persistence where applicable, and tests. Do not add menu placeholders and call the mode complete.

## 7. Later separate track — multiplayer

Multiplayer remains deferred until the owner explicitly prioritizes it:
- Rooms, room codes, host/student roles, lobby, presence, realtime state.
- Server-authoritative claim order, board validation, scores, post-`합!` selection timer, wrong-answer cooldown, reconnect handling.
- Multiplayer eligibility/ranking so inactive players cannot win simply because active players made mistakes.
- Teacher controls, class/team results, online leaderboards, accounts/cloud save, privacy and data-retention decisions.
- Multiplayer forms of Class Raid, Rival Duel, shared Ghost Board, teacher dashboard.

The original host's post-claim timer is not a solo round countdown. Solo Sprint may independently include a timer with its own rules. Do not add fake networking or treat localStorage as authoritative for online scores.

## 8. Technical quality rules

- Keep `src/domain/` free from React, DOM, localStorage, and network imports.
- Keep settings/UI preferences outside core domain rules.
- Use typed, versioned repositories, runtime validation, and migration paths.
- Save verified progression checkpoints idempotently; avoid duplicate XP on reload/retry.
- Surface local save failures instead of claiming data was saved when it was not.
- Keep English and Korean keys/placeholders aligned.
- Maintain keyboard access, visible focus, readable contrast, reduced motion, and mobile touch targets.
- Use existing React reducer/state approach; do not add Redux or unnecessary dependencies.
- Do not copy proprietary source or assets from the original game.

## 9. Commands and verification

```bash
npm install
npm run dev
npm test
npm run build
npm run simulate
npm run test:e2e
```

Before claiming a task is complete, run relevant tests and build. For player-facing changes, run Playwright tests as well. Add tests for scoring rules, progression checkpoint idempotency, settings preview/persistence/migrations, mode flows, EN/KO parity, keyboard use, and mobile layout as appropriate.

## 10. Current status in one sentence

The technical Stage 1 foundation is in place, but the immediate product work is still ahead: **make solo scoring rewarding, turn basic XP into meaningful mastery, add GUI Settings, and ship complete solo modes before returning to multiplayer implementation.**
