# Combination Game

An original, English-first recreation of a three-attribute combination card game, with a built-in English/Korean language switcher and a 16-bit console interface. Built with React, TypeScript and Vite.

## Current status

Stage 1 solo revamp plus the XP / Rules / Settings player-experience pass:

- Three rounds per session; nine cards per round from a 27-card deck.
- Valid sets require each attribute to be either all the same or all different.
- Pure, framework-independent domain modules (`src/domain/`): cards, combinations, session, scoring, progression, preferences — all unit-tested with Vitest.
- Difficulty classification per set (level = number of all-different attributes) with deterministic scoring **simulations** (`npm run simulate` → `docs/scoring-simulation.md`). Scoring values live in one config (`src/domain/scoring.ts`): Level 1/2/3 sets are +1/+2/+3, wrong set −1, wrong "No sets left!" −1, correct "No sets left!" +3, reveal cost −1, score floor 0 (design-brief candidates, pending human playtesting).
- **Mastery XP in the play loop:** Level 1/2/3 sets award 10/15/25 XP and clearing a board awards +25 XP. Feedback shows points and XP together, the gameplay HUD has a compact rank strip with a pending "this board" XP chip, cleared boards show a full XP breakdown, and rank-ups are acknowledged. XP is checkpointed per completed board (idempotent — reloads cannot double-award) and survives early exit.
- **Hidden remaining-set count:** the HUD shows "?" by default. Once per board the player can reveal the exact count for −1 point; a wrong "No sets left!" claim applies its −1 penalty and reveals the count without a second charge.
- **Rules screen** covering the goal, set rule, turn flow, reveal mechanic, live scoring values, mastery XP, ranks, and local-progress privacy.
- **Settings screen** with working, persisted preferences: language, classic/high-contrast theme, card size, UI/text scale, scanlines, reduced motion (system/on/off), strong focus, local-storage status, and a two-step mastery reset. Preferences are cosmetic only and never change scoring.
- **Consistent top navigation** (Play / Rules / Settings) across home, game, and results; opening Rules or Settings mid-game preserves the in-progress board exactly.
- Fair solo scoring: duplicates never score twice, inactivity earns nothing, and sessions with no verified sets are marked unranked.
- Local mastery XP and personal stats, separate from match score, persisted in this browser only (typed storage adapter, schema v2 with v1 migration, and safe handling of malformed/outdated/blocked storage).
- English default with Korean from the language switcher; catalogs are key-parity-checked at build and test time.
- Browser end-to-end tests with Playwright (desktop + mobile viewports).

Multiplayer rooms, host/student roles, server-side synchronization, cloud persistence and rankings remain deferred Stage 2 work and are **not** implemented. Additional solo modes (Practice, Sprint, and beyond), achievements, milestones, and unlockables remain on the v3.0 roadmap and are **not** implemented.

## Visual style (16-bit)

The interface borrows from SNES/Mega Drive-era games, mainly the JRPG menu systems of Final Fantasy VI and Chrono Trigger:

- **Windows:** blue-to-navy gradient panels with a light inner frame, dark outer outline and stepped (notched) corners, drawn with `box-shadow` only.
- **Palette:** one small set of CSS variables in `src/styles/tokens.css`; gold is reserved for the active/primary thing.
- **Type:** Press Start 2P for labels, numbers and buttons; DotGothic16 for body text and for all Korean text. White text with a 1px hard shadow.
- **Cursor:** a stepped pointing-hand style arrow on menu items and on selected cards.
- **Dialogue box:** one dark box at the bottom of the board carries both the selection prompt and the result of the last action.
- **HUD:** one top bar holds round, score, found, remaining and player name.
- **Pixel details:** stepped shapes with hard outlines, 2-tone bevels, a checker dither on card edges, hard offset shadows, `steps()` blink animations and a faint scanline overlay (delete the `body::after` block in `src/styles/global.css` to remove it).
- **Motion:** blink/nudge only, disabled under `prefers-reduced-motion`.

Fonts are loaded from Google Fonts in `index.html`; the CSS falls back to the system monospace font offline.

## Requirements

- Node.js 20 or later
- npm

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Append `?seed=42` (any integer) for deterministic boards — used by the browser tests and handy for debugging.

## Check the project

```bash
npm test            # Vitest: domain, storage, i18n, simulation guards
npm run build       # type-check (tsc) + production build
npm run test:e2e    # Playwright browser tests (needs: npx playwright install chromium)
npm run simulate    # write docs/scoring-simulation.md (scoring evidence)
```

## Languages

Translations live in `src/i18n/locales/`:
- `en.json` — English (default)
- `ko.json` — Korean

The translation layer is separated from UI components, and the Korean catalog is type-checked against the English one so missing keys fail the build. To add another language later, add a locale JSON file with the same keys, import it in `src/i18n/index.ts`, and register its locale code.

## Project layout

```text
src/
  app/            # App shell, i18n provider, header + top nav, rank bar, helpers
  domain/         # pure game rules: cards, combinations, session, scoring,
                  # progression, preferences, seeded rng, simulation
                  # (no React/DOM/storage)
  features/       # home / game / results / rules / settings screens
  i18n/           # typed locale manager + en/ko catalogs
  infrastructure/ # storage: typed localStorage repository + profile schema (v2)
  styles/         # tokens.css, global.css, components.css
tests/e2e/        # Playwright browser tests
```

## Original implementation

This project is an independent implementation. It does not copy the original website's source code or proprietary assets.
