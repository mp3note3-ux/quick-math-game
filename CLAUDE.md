# Kimi K3 / Claude Code Project Instructions

These instructions are for **Kimi K3 running inside the Claude Code harness**. The harness is the coding interface; the model is Kimi K3.

## 1. Start every session by inspecting the current project

Before changing code:

1. Read this file.
2. Read `GAME_DESIGN_IMPROVEMENT.md` for the current product priorities and the separate single-player/multiplayer roadmaps.
3. Read `README.md` and `HANDOFF_FOR_NEXT_LLM.md` for current implementation status.
4. Inspect the actual working tree, package scripts, source files, tests, and recent git history. Documentation can lag behind code.
5. Run relevant existing checks before broad changes when feasible.

Never assume a feature exists because it is described in a proposal. Verify the implementation. Be clear about what is implemented versus planned.

## 2. Product direction — solo experience is now the immediate priority

The product is an independent browser implementation of the three-attribute pattern-recognition game **반짝 ✨ 결! 합!**.

Approved technical foundation:
- React + TypeScript, strict mode.
- Vite.
- CSS organized into design tokens, global styles, and component styles.
- Framework-independent pure domain logic.
- Local browser persistence for the current single-player product, behind typed/versioned storage adapters.
- English and Korean localization.
- Vitest and Playwright coverage, following existing project conventions.

The previous Stage 1 completed the technical foundation. The owner has clarified that the next work must create a noticeably richer player experience. The immediate roadmap is **single-player content, scoring, meaningful mastery progression, GUI Settings, and quality-of-life**.

Do not treat all advanced/optional modes as multiplayer-only. Modes such as Practice/Academy, Sprint/Time Attack, Prism Contracts, Endurance, Daily Challenge, Constellation Chain, and Ghost Run are candidates for **solo implementation now**. Refer to the design brief for order and scope.

### Multiplayer-only deferral

Only online/multiplayer infrastructure and competitive classroom features remain deferred until explicitly authorized:
- Rooms, room codes, host/student roles, presence, realtime sync, server/backend/database/auth/cloud persistence.
- Server-authoritative claim order, scoring, timers, cooldowns, reconnects, online rankings and class/team results.
- Class Raid, Rival Duel, multiplayer Ghost Board, teacher dashboard.

The concern that inactive players may outrank active players belongs primarily to multiplayer ranking/eligibility. Do not impose competitive inactivity penalties on solo players. Solo players may pause, think, or leave without being framed as cheaters. Solo scoring should reward meaningful play and create satisfying challenge, not solve a nonexistent opponent exploit.

## 3. Core game rules

- 27 unique cards: 3 shapes × 3 shape colors × 3 background colors.
- Standard board: 9 distinct cards.
- A valid combination has exactly 3 distinct cards.
- For each of the three attributes independently, values must be all identical or all different.
- A 2+1 attribute split makes a triple invalid.

Preserve this rule unless the owner explicitly approves a variant. Keep the game recognizable and understandable.

The original host game includes a post-**합!** selection timer and a wrong-claim cooldown. Those are multiplayer/host controls. Do not mistake them for a solo countdown. Solo Sprint may have its own explicit time limit and rules.

## 4. Next player-facing work

The design brief is the detailed specification. The key priorities are:

1. **Scoring redesign:** difficulty-aware rewards, a clear score breakdown, board-clear and carefully tested mode bonuses, mode-sensitive mistake consequences, and localized feedback.
2. **Meaningful mastery:** difficulty-aware XP, mastery ranks and next-rank progress, milestones/achievements, personal bests, and progress awarded/persisted at verified board checkpoints so early exit does not erase earned progress.
3. **GUI Settings:** a first-class accessible settings screen from home and during solo play, with live preview and persistence.
4. **Solo content:** deliver complete modes, not menu placeholders. Recommended starting order is Practice/Academy, Sprint/Time Attack, then Prism Contracts, followed by Endurance, Daily Challenge, and Constellation Chain.
5. **Quality-of-life:** pause/resume where appropriate, replay/same-board practice, mode-specific records, clearer results, hints, useful feedback, accessibility, responsive controls, and visible storage status/errors.

### GUI Settings requirements

Settings should be player-facing and allow users to change preferences without editing files or code. Initial categories can include:
- General/language.
- Appearance: a small curated set of themes, card size/style, UI/text scale, spacing/layout.
- Accessibility: high contrast, color-vision-friendly palette, reduced motion, disabling scanlines/flashing, visible selection emphasis, keyboard help.
- Feedback/hints.
- Supported solo gameplay defaults and mode preferences.
- Audio controls only for audio features that actually exist.
- Data: local-save status, reset preferences, and carefully confirmed progress export/import/reset where implemented.

Preferences must preview appropriately, persist locally with validation/versioning, and be localized in English and Korean. Appearance/accessibility settings must never alter score eligibility. Keep the first version curated and useful; do not build an unbounded theme editor.

## 5. Scoring and XP discipline

The current repository has a configurable scoring module, a structural difficulty level (number of all-different attributes), and a basic local XP/stat foundation. These are **not finished player-facing systems**.

Historically observed defaults are flat +1 for any correct set, -1 for an incorrect set, and +3 for a correct no-sets declaration. Verify current code before changing these. The proposed difficulty rewards and XP values in the design brief are candidates, not final balance decisions.

Rules:
- Test Level 1/2/3 rewards; do not assume the classification is equivalent to measured human difficulty.
- The current scoring simulation has limitations described in the design brief. Improve it before using it to lock balance values.
- Simulations are hypotheses; human playtesting is required.
- Separate solo Match Score from persistent Mastery XP and future multiplayer results/team progress.
- Avoid opaque or excessive multipliers. Each point change must be explainable.
- Mistake consequences should vary by solo mode: Practice should be safe for learning; Sprint may use time/chain costs; Endurance may use lives; Classic may use a modest cost.
- Correct board-clear reward must not encourage skipping difficult sets.
- XP should be earned for verified skill outcomes and not lost when a player exits after a saved board checkpoint.
- Make saves idempotent: reload/retry must not duplicate XP. Prevent trivial replay/seed farming without punishing legitimate practice.
- Do not award XP for opening the app, waiting, or button spam.
- Do not let a solo pause cause competitive penalties.

Do not silently change scoring defaults until the relevant experiment, tests, and product decision are documented.

## 6. Architecture and quality

- Keep `src/domain/` independent of React, DOM, localStorage, and network APIs.
- Keep settings preferences and UI concerns outside pure game-rule modules.
- Use typed, versioned local repositories with runtime validation and migration paths. Handle malformed values, blocked storage, quota errors, and failed saves visibly.
- Persist verified XP/stat checkpoints exactly once.
- Keep mode scoring rules explicit and comparable records scoped by mode/ruleset/settings where needed.
- Keep EN/KO locale keys and placeholders aligned; add every visible string to both catalogs.
- Preserve accessibility: semantic controls, keyboard navigation, visible focus, sufficient contrast, useful screen-reader feedback, reduced motion, and mobile touch targets.
- Use React state/reducer first; do not introduce Redux or a new dependency without a clear need.
- Avoid premature abstractions, empty folders, unrelated refactors, mock networking, and unnecessary dependencies.
- Do not copy proprietary source code or assets from the reference site.

Use the existing architecture where it fits. Suggested new boundaries in the design brief are guidance, not mandatory directory creation.

## 7. Development workflow

For each task:

1. Identify the smallest coherent player-facing change.
2. Inspect affected code and conventions.
3. Implement a complete user-visible behavior, not just a screen or placeholder.
4. Add tests for normal cases, edge cases, persistence, and regressions.
5. Run relevant tests, then `npm test`, `npm run build`, and `npm run test:e2e` when feasible.
6. Review the diff for EN/KO parity, accessibility, responsive behavior, storage safety, and scope creep.
7. Report exactly what changed, what commands ran, their results, and anything incomplete.

Do not claim tests passed unless run. Use package scripts from the current `package.json`.

## 8. Git and safety

- Inspect `git status` before and after work.
- Do not discard user changes, reset branches, force-push, or rewrite history.
- Do not commit or push unless the owner explicitly asks.
- Never expose secrets, tokens, local environment values, or personal data.
- Keep commits focused and descriptive when asked.
- Reconcile remote/local conflicts; never overwrite blindly.

## 9. Communication

Be direct. Separate implemented behavior, existing limitations, recommended design, and deferred multiplayer work. Do not describe a technical foundation as a finished gameplay feature. Do not ask the owner to repeat decisions already present in the design brief. A request to build a solo mode or Settings GUI does not authorize multiplayer infrastructure.
