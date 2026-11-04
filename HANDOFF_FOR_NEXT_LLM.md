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
│   ├── app/                  # App shell, header + top nav, rank bar, locale provider, helpers
│   ├── domain/               # Pure game rules and tests
│   │   ├── cards.ts
│   │   ├── combinations.ts
│   │   ├── session.ts
│   │   ├── scoring.ts
│   │   ├── progression.ts
│   │   ├── preferences.ts
│   │   ├── rng.ts
│   │   └── simulation/
│   ├── features/
│   │   ├── home/
│   │   ├── game/             # GameScreen + shared card visual theme
│   │   ├── results/
│   │   ├── rules/            # Dedicated Rules screen
│   │   └── settings/         # Settings screen + language switcher
│   ├── i18n/                  # Typed EN/KO catalogs and parity tests
│   ├── infrastructure/storage/
│   │   ├── schema.ts          # Profile schema v2 (v1 migrates automatically)
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
Verify `src/domain/scoring.ts`; current defaults (`DEFAULT_SCORING_CONFIG`):
- Correct set: +1/+2/+3 for Level 1/2/3 (difficulty-weighted, design-brief candidate).
- Wrong set: -1.
- Incorrect “No sets left!”: -1.
- Correct “No sets left!”: +3.
- Remaining-count reveal: -1 (once per board).
- Score floor: 0.

The module supports per-level rewards; the weighted `[1,2,3]` candidate is live in the actual game. These remain playtesting candidates, not locked balance.

### Current XP and persistence
Current values (`src/domain/progression.ts`):
- Level 1/2/3 set: 10/15/25 XP (difficulty-weighted).
- Cleared board: +25 XP.
- Six named ranks: Novice 0, Spotter 100, Pattern Seeker 300, Set Finder 700, Combo Master 1500, Grandmaster 3000.
- Lifetime totals, level breakdown, boards cleared, sessions completed, best score.

XP is checkpointed **per completed board** (keyed by round number; idempotent — replay/reload cannot double-award), so early exit keeps verified progress. Session bookkeeping (sessions played/completed, best score) is recorded once at session finish and never re-awards XP. XP is visible during play: combined points+XP feedback per set, a compact rank strip with a pending per-board XP chip in the HUD, a per-board XP breakdown at round complete, and a subtle rank-up note. Achievements, milestones, and unlockables remain roadmap items — not implemented.

### Current remaining-set count
The exact remaining-set count is **hidden by default** (HUD shows “?”). A per-board reveal action costs −1 point (from scoring config, floored at 0), reveals the count for the rest of that board, and cannot be charged twice. A wrong “No sets left!” claim applies its existing −1 penalty and reveals the count without a second charge. New boards reset the hidden state.

### Current settings
There is a full GUI **Settings screen** (reachable from the shared top navigation, including mid-game without losing board state): language, classic/high-contrast theme, card size, UI/text scale, scanline toggle, reduced motion (system/on/off), strong focus/selection emphasis, local-storage status, and a two-step mastery-progress reset. Preferences are typed/validated (`src/domain/preferences.ts`), stored in the v2 profile schema (v1 profiles migrate automatically), applied as data attributes/classes on the document root, and are cosmetic only — they never change score, XP, or ranking. No audio controls exist because no audio feature exists.

### Current simulation caveat
`docs/scoring-simulation.md` compares flat and weighted candidate models, but should NOT be treated as decisive balance evidence:
- The realistic bot's find rate is not level-sensitive.
- Random streams are not guaranteed to produce equivalent paired decisions for each bot/scenario.
- It models one board rather than full sessions/modes.
- It does not measure real human solve-time/accuracy.

Improve the simulation and run human playtests before choosing final weights.

## 6. Immediate product roadmap — solo first

Refer to `GAME_DESIGN_IMPROVEMENT.md` for full requirements and acceptance criteria.

### Milestone 1: better scoring + meaningful mastery — substantially shipped
Shipped: difficulty-weighted rewards `[1,2,3]` live, difficulty-aware XP `[10,15,25]` + +25 clear, six ranks, per-board idempotent checkpoints, per-level stats and result breakdowns, XP integrated into gameplay feedback/HUD, hidden remaining count with paid reveal.
Remaining: human playtesting to validate the level→difficulty hypothesis and lock values; mode-sensitive mistake rules; milestones/achievements/personal bests beyond the basics; simulation improvements before any rebalance.

### Milestone 2: GUI Settings — first version shipped
Shipped: Settings screen reachable from home and during solo play with live preview, persistence, v1→v2 migration, EN/KO, accessible controls — language, classic/high-contrast themes, card size, UI/text scale, scanlines, reduced motion, strong focus, storage status, two-step mastery reset. Dedicated Rules screen and Play/Rules/Settings navigation are also shipped.
Remaining: color-vision-friendly palette option, spacing/layout controls, feedback/hint preferences, solo gameplay defaults, export/import.

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

Stage 1 plus the XP/Rules/Settings pass are in place — difficulty-weighted scoring, visible checkpointed mastery XP, hidden remaining-set count with a paid reveal, a full Rules screen, and a working Settings screen are shipped — and the next product work is **complete solo modes (Practice, Sprint, and beyond), achievements/milestones, and playtest-driven balance before any multiplayer implementation.**
