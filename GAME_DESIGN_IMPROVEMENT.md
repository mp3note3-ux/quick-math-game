# Quick Math Game — Game Design Improvement Brief

**Version:** 2.0 (repository copy)  
**Prepared:** 2026-11-04  
**Repository:** https://github.com/mp3note3-ux/quick-math-game  
**Reference:** https://sub-teacher.com/API/combinationgame/combinationgame.html

> This is the product/design handoff, not evidence that proposed features are implemented. Always inspect the current code before coding. Proposed scoring and XP values are hypotheses until simulated and playtested. Stage 2 requires explicit owner authorization.

## 1. Approved product and technology decisions

The owner has approved:

| Area | Decision |
|---|---|
| Frontend | React |
| Application language | TypeScript |
| Build tool | Keep Vite |
| Styling | Keep CSS; organize design tokens, global styles, and component conventions |
| Stage 1 persistence | Local browser storage behind a typed adapter |
| Stage 1 scope | Core classic solo-game revamp and foundations |
| Stage 2 | Multiplayer and advanced modes, deferred to a separate phase |

### Stage 1 — approved scope

1. Migrate the UI to React + TypeScript + Vite.
2. Separate cards, boards, combinations, session state, difficulty, scoring, and progression into pure, testable domain modules.
3. Add difficulty classification and simulate candidate scoring models.
4. Make solo scoring fair; inactivity must not become an automatic competitive win.
5. Add minimal local mastery XP and personal stats, separate from match score.
6. Improve the classic solo UI, results, feedback, settings, and responsive behavior.
7. Preserve English/Korean localization, accessibility, and local/offline play.
8. Add unit, integration, browser tests, and scoring simulations.

Stage 1 acceptance requires end-to-end solo play on desktop/mobile; tested validation, difficulty, scoring, round transitions, and persistence; no obvious idle/guessing exploit; aligned English/Korean catalogs; robust handling of malformed/outdated local data; and no server dependency.

### Stage 2 — explicitly deferred

Only after Stage 1 is accepted and the owner authorizes Stage 2:
- Teacher/host rooms, room codes, student joining, presence, shared boards, realtime multiplayer.
- Server-authoritative claims, selection timers, validation, scores, cooldowns, reconnects, and online persistence.
- Original host settings: total rounds, time allowed after a player calls **합!**, and wrong-answer waiting time.
- Candidate modes: Prism Contracts, Constellation Chain, Class Raid, Rival Duel, Ghost Board, personal quests, expanded achievements/cosmetics, profiles, and shared leaderboards.

Do not implement mock networking, backend, accounts, cloud saves, or advanced modes in Stage 1. Stage 1 may define clean interfaces/result types for future use, but must remain fully playable locally. Local storage is not secure or authoritative for competitive multiplayer; Stage 2 must validate on the server.

## 2. Core game identity and rules

The game is a fast visual pattern-recognition experience inspired by the Korean classroom game **반짝 ✨ 결! 합!**. Preserve its simple rule, simultaneous search, commitment moment (**합!**), and high-stakes declaration (**결!**). Avoid turning it into a generic points/badges app.

- Deck: 3 shapes × 3 shape colors × 3 background colors = 27 unique cards.
- Board: 9 distinct cards.
- A valid set contains exactly 3 distinct cards.
- For EACH of the three attributes, the values across the three cards must be either all identical or all different.
- Any 2+1 split on an attribute makes the triple invalid.

Do not silently change this invariant. New modes, if later approved, should layer around it unless the owner explicitly approves a variant.

### Timing distinction

The original host flow includes total rounds, a selection timer that starts after a player calls **합!**, and a wrong-answer penalty waiting interval/cooldown. The post-claim timer is not a general round countdown. These are deferred multiplayer features; do not substitute a solo round countdown.

## 3. Repository baseline — verify before coding

At the time of the earlier inspection, the repository was a Vite vanilla JS/HTML/CSS single-player prototype with:

```text
.github/workflows/ci.yml
HANDOFF_FOR_NEXT_LLM.md
README.md
index.html
package.json
src/game/engine.js
src/game/engine.test.js
src/i18n/index.js
src/i18n/locales/en.json
src/i18n/locales/ko.json
src/main.js
src/styles.css
```

Previously observed solo behavior:
- Three rounds per session.
- Correct new set: +1.
- Incorrect selection: -1.
- Correct declaration that no undiscovered sets remain (**결!**): +3 and round completion.
- Incorrect **결!**: -1.
- Inactivity: 0.
- Player presses “Find a set!” to enable selection; selecting the third card submits the triple.
- Duplicate discoveries do not score twice.

Previously absent: multiplayer rooms, host/student roles, room codes, realtime sync, claim timer/cooldown enforcement, accounts, cloud save, database, online rankings, persistent XP, achievements, cosmetics, and advanced modes. No solo timer was present in the inspected baseline.

Likely responsibilities at that time:
- `src/main.js`: UI, session/controller, rounds, scoring.
- `src/game/engine.js`: deck/board generation and combination validation.
- `src/game/engine.test.js`: core rule tests.
- `src/i18n/locales/en.json` and `ko.json`: translations.

This is a historical snapshot, not a substitute for inspecting the latest branch and working tree.

## 4. Problems to solve

### Inactivity can be rational

With +1 for a correct answer and -1 for an incorrect answer, a guess with 40% success probability has expected value:

`EV = (0.40 × 1) + (0.60 × -1) = -0.20`

A cautious player may rationally do nothing and retain 0. If zero is near the class median, the leaderboard can reward avoidance.

Design goal: reward verified skill and meaningful contribution, not mere presence, clicks, or button-spamming. A player with no verified contribution should not automatically win because active players made mistakes. Consider an explicit unranked/no-verified-contribution status or a carefully tested eligibility rule; do not impose a harsh quota without considering beginners and opportunity.

### Points lack durable purpose

Match score resets and provides little reason to improve or return. A larger counter alone will not solve this. Separate immediate match performance from longer-term mastery and future class/team contribution.

### All valid sets have equal value

The prototype awards +1 for every new valid set. Investigate difficulty-sensitive rewards without claiming a scientifically established ratio.

### Feedback and goals are shallow

Explain incorrect attribute patterns concisely. Stage 1 can add clear score explanations and a small personal mastery summary. Complex quests/contracts belong to Stage 2.

## 5. Difficulty hypothesis

Adapt the SET research idea of set level to this three-attribute game by counting attributes that are all-different:

| Level | Attribute pattern | Interpretation |
|---|---|---|
| 1 | One all-different, two all-same | Lower proposed difficulty |
| 2 | Two all-different, one all-same | Medium proposed difficulty |
| 3 | Three all-different | Higher proposed difficulty |

For three distinct cards, an attribute cannot be a 0-all-different pattern while still satisfying the set rule; each valid attribute is either all-same or all-different. This classification is a testable hypothesis for this variant, not a proven difficulty scale. Nyamsuren & Taatgen (2013) studied the original four-attribute SET task; do not overgeneralize their findings.

Candidate point models to simulate:
- +1 / +2 / +3 for levels 1 / 2 / 3.
- +1 / +2 / +4 for levels 1 / 2 / 3.

Compare solve times, board distributions, reward inflation, player skill gaps, and whether the higher level is actually harder in this implementation. Do not lock values before simulation and playtesting. Board scarcity may affect difficulty; first log set counts and solve outcomes rather than adding scarcity bonuses prematurely.

## 6. Scoring and progression principles

Keep these separate:
1. **Match Score:** competitive score for the current session.
2. **Mastery XP:** persistent local progress for verified skill and improvement.
3. **Class/Team Progress:** possible future cooperative contribution (Stage 2).

Principles:
- No points merely for presence, time elapsed, clicks, or inactivity.
- Test idle play, random guessing, repeat submissions, duplicate discoveries, and other exploits.
- Make score changes and penalties transparent.
- Consider a zero floor for match score; test the implications rather than assuming.
- Avoid excessive punishment that discourages experimentation.
- Do not allow inactive/no-contribution players to be presented as a verified winner by default.
- Keep XP separate from match score; don't build a large economy in Stage 1.
- No scarcity multiplier until supported by data.
- A correct **결!** bonus should be evaluated alongside difficulty-weighted set rewards, not assumed unchanged.

## 7. Architecture guidance

Suggested boundaries (adapt to the real repository; do not create empty folders or speculative infrastructure):

- `app/`: app bootstrap and top-level providers.
- `components/`: reusable presentational UI.
- `features/classic-game/`: classic solo screens and interactions.
- `features/scoring/`: score explanations and UI.
- `features/progression/`: local mastery display.
- `features/settings/`: settings and language controls.
- `domain/cards/`, `domain/combinations/`, `domain/game-session/`, `domain/scoring/`, `domain/progression/`: framework-independent rules and state transitions.
- `infrastructure/storage/`: typed local persistence adapter.
- `i18n/locales/`: English and Korean catalogs.
- `styles/`: tokens, global styles, component conventions.
- tests: unit, integration, browser/e2e.

Use React state/reducer initially; add Redux only if actual complexity warrants it. Domain modules must not import React, DOM APIs, localStorage, or networking.

Local persistence should use a typed repository interface, schema version, runtime validation, and safe handling for missing, malformed, outdated, or unavailable storage. Explain that progress is browser/device-specific and is not cloud-synced. Keep English and Korean translation keys aligned; do not hard-code user-facing text.

Vitest and Playwright are recommended candidates, not locked requirements. Follow the actual package scripts and existing conventions.

## 8. Testing and acceptance

Test at minimum:
- 27-card deck uniqueness and valid card attributes.
- Board size and card uniqueness.
- All-same/all-different acceptance and 2+1 rejection for every attribute.
- Difficulty level calculation.
- Duplicate prevention and selection order independence.
- Session transitions, round completion, and **결!** validation.
- Scoring model simulations, score floor/eligibility, idle and guessing strategies.
- XP/stat separation from match score.
- Storage schema validation, migrations, malformed values, and unavailable/quota errors.
- English/Korean key parity and complete visible copy.
- Keyboard access, visible focus, responsive layouts, and color-independent cues.
- Full solo play without server/network.

Stage 1 is accepted only when classic solo play works end-to-end on desktop/mobile; domain behavior and persistence are tested; no obvious scoring exploit remains; translations align; local progress safely survives reloads; and no server is required.

## 9. Roadmap

### Stage 0 — baseline
Inspect current branch/worktree, run existing tests/build, record current behavior, and preserve regression coverage.

### Stage 1 — core revamp
React + TypeScript migration; pure domain engine; difficulty/scoring experiments; fair solo outcomes; minimal local mastery and versioned storage; redesigned solo UI/results; English/Korean and accessibility; unit/integration/browser tests; acceptance gate.

### Stage 2 — separate future phase
Select backend/realtime architecture (Node.js + Socket.IO is only a candidate); implement rooms, roles, presence, shared board, server-authoritative claims/timers/scoring/cooldowns/reconnects; then prioritize advanced modes and online progression. Do not start until Stage 1 is accepted and the owner explicitly authorizes it.

## 10. Open decisions

Stage 1 decisions to resolve through evidence and owner review:
- Final level rewards: +1/+2/+3, +1/+2/+4, or another model?
- Should incorrect solo claims subtract points, end a streak, or use another modest consequence?
- Should match score be floored at zero?
- What eligibility rule prevents inactivity from winning?
- Should correct **결!** retain +3 with difficulty-weighted rewards?
- XP per verified outcome and useful student-facing personal stats?
- How much attribute-level explanation should appear immediately?

Stage 2 decisions:
- Exact post-claim timer and wrong-answer cooldown behavior/defaults.
- Backend/realtime architecture.
- Who chooses contracts and how Class Raid teams work.
- Who can declare **결!** and under what conditions.
- Advanced mode priority, age range, privacy, and teacher reporting needs.

Already decided; do not ask again unless the owner reopens them: React, TypeScript, Vite, CSS, local browser persistence for Stage 1, core-only Stage 1, separate deferred Stage 2.

## 11. First Stage 1 implementation sequence

When implementation is explicitly requested:
1. Inspect latest repository and run existing checks.
2. Establish React + TypeScript + Vite structure.
3. Migrate English/Korean localization.
4. Port the 27-card model, board generation, and validation to pure TypeScript.
5. Add set-level calculation and deterministic scoring simulations.
6. Define fair solo outcomes for inactivity, errors, duplicates, and **결!**.
7. Add minimal local mastery data and versioned storage adapter.
8. Redesign solo UI, feedback, results, and personal stats.
9. Add domain, persistence, integration, and browser tests.

Explicit exclusions: multiplayer, room codes, host/student roles, networking, server/database/auth/cloud saves, online leaderboards, post-claim multiplayer timers/cooldowns, advanced modes/contracts/quests, and a full achievement/cosmetics economy.

## 12. Research and references

Research informs hypotheses; it does not guarantee results in this specific game.

### Cognitive/game research
1. Nyamsuren, E. & Taatgen, N. A. (2013), “Set as an Instance of a Real-World Visual-Cognitive Task,” *Cognitive Science*. https://doi.org/10.1111/cogs.12001
2. Jacob, M. & Hochstein, S. (2008), SET recognition and perceptual/cognitive processes. https://doi.org/10.3758/PP.70.7.1165
3. Hunicke, R., LeBlanc, M. & Zubek, R. (2004), MDA framework. https://www.cs.northwestern.edu/~hunicke/MDA.pdf
4. Sweetser, P. & Wyeth, P. (2005), GameFlow. https://doi.org/10.1145/1077246.1077253
5. Sailer, M. et al. (2017), game elements and motivation. https://doi.org/10.1016/j.chb.2016.12.033
6. Sid Meier (2012), Interesting Decisions, GDC. https://www.gdcvault.com/play/1015756/Do-Say-The-Right-Thing
7. Park, S. & Kim, S. (2022), points and gameful experiences. https://doi.org/10.2196/35907
8. Li, C. et al. (2024), education leaderboards systematic review (higher education context; avoid overgeneralizing). https://doi.org/10.1111/jcal.13077
9. Johnson, C. I. & Marraffino, M. D. (2021), feedback principle. https://doi.org/10.1017/9781108894333.042

### Related games — study mechanics, do not copy
- Dobble: https://www.asmodee.co.uk/pages/games/dobble
- Ghost Blitz: https://www.zoch-verlag.com/zoch_en/brands/geistesblitz/geistesblitz-601129800-en.html
- Jungle Speed rules: https://images-cdn.asmodee.us/filer_public/06/2a/062a9b3a-c7ee-4e3a-a2ba-d48bdec1b938/js01_rules.pdf
- Anomia: https://www.anomiapress.com/pages/how-to-play
- The Mind rules: https://themindcafe.sg/wp-content/uploads/2019/06/The-Mind.pdf
- Halli Galli: https://store.401games.ca/products/halli-galli
- Qwirkle: https://qwirklegame.com/rules

### Technology references
- React: https://react.dev/learn
- TypeScript: https://www.typescriptlang.org/docs/handbook/intro.html
- Vite: https://vite.dev/guide/
- CSS: https://developer.mozilla.org/en-US/docs/Web/CSS
- Vitest: https://vitest.dev/guide/
- Playwright: https://playwright.dev/docs/intro
- Phaser (reference only; not recommended for current DOM-based scope): https://docs.phaser.io/

### Project references
- Repository: https://github.com/mp3note3-ux/quick-math-game
- Current handoff: https://github.com/mp3note3-ux/quick-math-game/blob/main/HANDOFF_FOR_NEXT_LLM.md
- Game controller: https://github.com/mp3note3-ux/quick-math-game/blob/main/src/main.js
- Game engine: https://github.com/mp3note3-ux/quick-math-game/blob/main/src/game/engine.js
- Original reference game: https://sub-teacher.com/API/combinationgame/combinationgame.html

## 13. Design north star

Make players want to find the next combination because they are curious, challenged, and improving — not merely because a counter goes up. Stage 1 should make the classic game feel complete without premature networking or optional modes. Stage 2 should reuse Stage 1's tested rules rather than duplicate them.
