# Kimi K3 / Claude Code Project Instructions

These instructions are for **Kimi K3 running inside the Claude Code harness**. The harness is the coding interface; the model is Kimi K3. Follow the repository's current source of truth rather than assuming a generic Claude Code project layout.

## 1. Start here every session

Before changing code:

1. Read this file completely.
2. Read `GAME_DESIGN_IMPROVEMENT.md` for approved product direction, scoring research, architecture guidance, scope boundaries, and acceptance criteria.
3. Read `README.md` and `HANDOFF_FOR_NEXT_LLM.md` for the currently implemented behavior.
4. Inspect the actual working tree, package scripts, source files, tests, and recent git history. These documents may lag behind the code.
5. Summarize the current state and the intended change briefly before making a broad or risky change. Do not ask for confirmation for routine, clearly requested implementation tasks.

Do not assume a planned feature exists just because it appears in a design document. Verify it in code.

## 2. Product direction and scope control

The product is an independent browser implementation of the Korean pattern-recognition card game **반짝 ✨ 결! 합!**.

The product owner approved these technology and scope decisions:

- React + TypeScript for the frontend.
- Keep Vite as the build tool.
- Keep CSS; organize it into reusable design tokens, global styles, and component-oriented conventions.
- Stage 1 progress persistence is local to the browser, behind a typed storage abstraction.
- Stage 1 is the core classic single-player revamp and foundations only.
- Stage 2 multiplayer and advanced modes are deferred until Stage 1 is accepted and the owner explicitly authorizes Stage 2.

### Stage 1 — permitted target

When the owner asks you to implement Stage 1 work, focus on:

- React + TypeScript migration while retaining Vite.
- Framework-independent, pure domain modules for cards, boards, combinations, sessions, difficulty, scoring, and progression.
- Difficulty classification and scoring simulations with tests.
- Fair solo scoring; avoid rewarding inactivity as a competitive victory.
- Minimal local mastery XP and personal statistics, separate from match score.
- Polished responsive solo UI, clear feedback, results, and settings.
- English and Korean localization, accessibility, and offline/local play.
- Unit, integration, and browser tests.

Prefer incremental, reviewable changes. Keep the game playable throughout the migration where practical.

### Stage 2 — do not implement during Stage 1

Do not implement multiplayer rooms, host/student roles, room codes, realtime networking, server/backend/database/auth/cloud save, synchronized claims, online rankings, or the advanced modes (Prism Contracts, Constellation Chain, Class Raid, Rival Duel, Ghost Board, quests, expanded cosmetics/achievements) unless the owner explicitly starts Stage 2.

Do not add mock networking or pretend local storage is authoritative for competitive multiplayer. It is not.

## 3. Invariant game rules

The current game has 27 unique cards: 3 shapes × 3 shape colors × 3 background colors. A board contains 9 distinct cards.

A valid combination contains exactly 3 distinct cards. For each of the three attributes independently, the values must be either all identical or all different. A 2+1 split on any attribute makes the combination invalid.

Preserve the game's recognizable visual identity and simple core rule. Do not silently change game rules, language support, or player experience. If a rule is ambiguous, inspect the current implementation and design brief, then state the assumption.

The original game's teacher/host options include total rounds, a selection time limit after a player calls **합!**, and a wrong-answer waiting/penalty interval. These are multiplayer/host concepts; do not turn them into a solo round countdown without explicit product direction.

## 4. Architecture and code quality

- Keep domain logic independent of React, the DOM, browser storage, and network APIs.
- Use TypeScript types at module boundaries; avoid `any` unless justified and contained.
- Keep UI components focused and reusable. Keep orchestration/state transitions out of presentation-only components.
- Use React state/reducer first. Do not introduce Redux or another state library without demonstrated need.
- Put browser persistence behind a typed repository/adapter. Include a schema version, runtime validation, and safe handling for missing, malformed, outdated, or unavailable storage.
- Make local-only persistence limitations clear in the UI/docs: progress belongs to this browser/device and is not cloud-synced.
- Keep English and Korean locale keys aligned. Add all user-visible copy to both catalogs; avoid hard-coded UI strings.
- Preserve keyboard access, visible focus, semantic controls, sufficient contrast, and responsive layouts.
- Avoid unnecessary dependencies, premature abstractions, speculative features, and unrelated refactors.
- Do not copy proprietary source code or assets from the reference site.

Suggested boundaries are described in the design brief. Adapt them to the actual codebase; do not create empty directories or layers without a real use.

## 5. Scoring and progression discipline

The design brief proposes difficulty levels based on the number of attributes that are all-different:

- Level 1: one all-different attribute and two all-same attributes.
- Level 2: two all-different attributes and one all-same attribute.
- Level 3: all three attributes all-different.

Treat this as a testable hypothesis for this three-attribute game, not a proven difficulty truth. Validate with simulations and playtesting before locking point values.

Keep match score, persistent mastery XP, and any future team/class progress as separate concepts. Do not award points merely for presence, clicks, or inactivity. Test against idle play, random guessing, repeated submissions, and other easy exploits. Avoid negative-score edge cases unless intentionally specified. Explain score changes clearly to the player.

Do not add scarcity bonuses or other difficulty multipliers without evidence. Track board set counts and solve outcomes first if needed.

## 6. Working method

For each task:

1. Identify the smallest coherent change that fulfills the request.
2. Inspect affected code and existing conventions before editing.
3. Implement the behavior, not just a visual mock-up.
4. Add or update tests for normal cases, edge cases, and regressions.
5. Run the relevant tests, then the full test suite and production build when feasible.
6. Review the diff for accidental scope creep, dead code, broken translations, accessibility regressions, and misleading documentation.
7. Report exactly what changed, commands/tests run and their results, and anything not completed.

Never claim tests passed unless you actually ran them. If a command fails because dependencies or the environment are unavailable, report that accurately and give the next useful step.

Use the package manager and scripts declared by the current `package.json`; do not assume scripts from this document. Do not rewrite lockfiles or upgrade dependencies without need.

## 7. Git and safety

- Do not discard user changes, reset branches, force-push, or rewrite history.
- Inspect `git status` before edits and before commits.
- Do not commit or push unless the owner explicitly asks.
- Never expose secrets, tokens, local environment values, or private user data in logs, code, commits, or responses.
- Do not add credentials or real API keys to the repository.
- Keep commits focused and use descriptive messages when asked to commit.
- If remote state conflicts with local state, inspect and reconcile; do not overwrite blindly.

## 8. Communication

Be direct and concise. Distinguish clearly between:
- implemented behavior,
- existing behavior,
- planned proposals,
- deferred Stage 2 ideas.

When a design choice materially affects fairness, accessibility, persistence, architecture, or future multiplayer compatibility, explain the trade-off and recommend a defensible default. Do not silently invent product decisions.

The owner may give task-specific instructions that supersede these defaults, but a task-specific request to implement one feature does not automatically authorize the entire deferred Stage 2 roadmap.
