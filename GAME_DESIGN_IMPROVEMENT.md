# Quick Math Game — Product & Game Design Roadmap

**Version:** 3.0  
**Updated:** 2026-11-04  
**Repository:** https://github.com/mp3note3-ux/quick-math-game  
**Original game reference:** https://sub-teacher.com/API/combinationgame/combinationgame.html

> **Revision note:** Version 3.0 is the updated and currently authoritative product plan. It supersedes the earlier Version 2.0 brief. The main change is a product-priority correction: the immediate roadmap now focuses on expanding and improving single-player gameplay (scoring, meaningful XP/mastery, GUI Settings, new solo modes, and quality-of-life). Multiplayer-specific ranking fairness, rooms, claim timers, and server-authoritative features are separated into a later track. The React/TypeScript/Vite technical foundation from Stage 1 remains the approved baseline; the new plan builds on it rather than replacing that technology decision.

### Revision history

| Version | Purpose |
|---|---|
| 2.0 | Initial staged plan after the React/TypeScript/Vite and local-persistence decisions; emphasized core solo foundation and deferred multiplayer/advanced work. |
| 3.0 | Updated product roadmap following Stage 1: explicitly prioritizes a richer solo experience, real scoring and mastery progression, a GUI Settings screen, solo content/modes, and quality-of-life; separates multiplayer implementation and its fairness requirements. |

> This document separates the product into two distinct tracks: **single-player gameplay and quality-of-life**, which is the immediate product priority, and **multiplayer**, which is a later online implementation. It distinguishes existing code from proposed features. Scoring weights and progression rates below are design candidates, not final balance decisions.

## 1. Product direction — the key clarification

The React/TypeScript Stage 1 was primarily a **technical foundation milestone**. It improved maintainability, testability, and future development, but it did not substantially change the experience a person gets when they sit down to play. That is an honest limitation of the milestone.

The next product work should change what players can do, why they want to keep playing, and how they can make the experience comfortable for themselves.

The owner has clarified three important priorities:

1. **Single-player needs substantially more content.** It should feel like a complete game with multiple ways to play, practice, improve, and replay.
2. **The scoring system and XP system need real design work.** A configurable score engine and a small XP counter are foundations, not finished reward systems.
3. **Players need a graphical Settings interface.** People should be able to change the appearance, accessibility, sound, and supported gameplay preferences without editing files or asking an AI coding assistant.

The earlier concern about inactive players finishing above active players is primarily a **multiplayer ranking/fairness problem**. It should not dictate the feel of solo play. A person playing alone should be free to pause, think, practice, or walk away without being treated as a competitor exploiting a leaderboard. Solo scoring should instead make skill, challenge, and progress satisfying.

### Priority order

| Priority | Track | Goal |
|---|---|---|
| 1 | Single-player scoring | Make a correct and difficult set feel meaningfully rewarding; make mistakes fair and understandable |
| 2 | Solo mastery progression | Turn XP into visible, persistent progress and meaningful milestones |
| 3 | GUI Settings | Let players personalize the interface and supported solo preferences |
| 4 | Solo content | Add practice, time-based, objective-based, and replayable challenges |
| 5 | Multiplayer foundation/product | Later add rooms, teacher/host controls, live claims, fairness, and online rankings |

Do not start multiplayer merely because the technical architecture can support it. First make the solo game worth returning to.

## 2. Existing game rules — preserve the core

This is an independent implementation of the three-attribute pattern-recognition game **반짝 ✨ 결! 합!**.

- Deck: 3 shapes × 3 shape colors × 3 background colors = 27 unique cards.
- Standard board: 9 distinct cards.
- A valid set contains exactly 3 distinct cards.
- For EACH of the three attributes, the values across the three cards must be either all identical or all different.
- A 2+1 split on any attribute makes the triple invalid.

Keep this rule simple and teach it clearly. New modes should create variety through goals, pacing, constraints, feedback, and progression rather than changing the underlying combination rule without an explicit game-design reason.

The original classroom flow uses **합!** as a claim/commit moment and **결!** to declare that no valid sets remain. The existing solo prototype has a “Find a set!” selection-start action and a “No sets left!” declaration. Do not assume the solo interaction must remain identical in every new mode.

## 3. Repository status — what is actually implemented now

The current repository has a good technical base:

- React 19, strict TypeScript, Vite.
- Pure domain modules for cards, combinations, session state, difficulty, scoring, progression, and seeded randomness.
- Vitest unit/simulation tests and Playwright browser tests.
- English and Korean locale catalogs with key/placeholder parity checks.
- Local browser profile storage behind a typed repository and schema validation.
- A 16-bit console/JRPG-inspired visual presentation.

### Current player-facing experience

The current game is still essentially one three-round classic solo flow. The home, board, and result screens exist, but there are no substantial alternative solo modes yet.

### Current scoring — important: still the prototype values

The live default in \`src/domain/scoring.ts\` is:

| Event | Current score change |
|---|---:|
| Correct Level 1 set | +1 |
| Correct Level 2 set | +1 |
| Correct Level 3 set | +1 |
| Incorrect set | -1 |
| Incorrect “No sets left!” declaration | -1 |
| Correct “No sets left!” declaration | +3 |

The code can accept a reward per difficulty level, but the defaults remain \`[1, 1, 1]\`. Difficulty is calculated and shown in feedback, but it does not yet affect match score. Therefore, difficulty-sensitive scoring is **not implemented in the actual experience**.

### Current XP — foundation only, not a complete progression system

The current code awards:
- 10 XP per verified set.
- 25 XP per cleared board.
- Lifetime totals for sets found, sets by level, boards cleared, sessions completed, and best score.

XP is separate from match score and stored locally. However:
- XP is flat; finding a Level 3 set is worth the same XP as Level 1.
- There is no player level/rank, XP progress bar, next milestone, unlock path, or quest loop.
- The app records progression when the entire session reaches its finished state. Verified work from a session abandoned before completion can be lost.
- Results show a small mastery summary, but mastery is not yet a meaningful part of the play loop.

Do not describe this as a fully implemented progression system. It is a working persistence and statistics foundation.

### Current Settings — language control only

The app has an English/Korean language switcher. It does **not** yet have a proper graphical Settings screen for themes, UI scale, card appearance, motion, accessibility preferences, sound, or solo gameplay preferences.

### Current solo content

Not currently implemented:
- Guided practice/training curriculum.
- Time Attack / Sprint.
- Endurance / Survival.
- Daily Challenge.
- Prism Contracts.
- Constellation Chain.
- Solo personal quests and achievement milestones.
- Player-facing difficulty selection or challenge progression.
- Full Settings GUI and saved appearance preferences.

### Existing testing status

The latest observed GitHub Actions run for the Stage 1 migration passed unit/simulation tests, production build, and Playwright browser tests. That confirms the code is building and the tested flows work; it does not prove that new scoring is balanced or that the solo game has enough content.

## 4. Track A — single-player game (immediate priority)

Single-player should be treated as a complete product track with its own content roadmap, reward loop, settings, and quality bar. It does not need a server.

### A1. Rework match scoring so skill feels rewarding

The purpose of solo match score is to make the current challenge satisfying, communicate performance, and let players beat their own records. It is not to solve multiplayer inactivity or classroom leaderboard fairness.

#### Difficulty levels

The existing difficulty hypothesis counts the number of all-different attributes in a valid combination:

| Level | Pattern | Initial interpretation |
|---|---|---|
| 1 | One all-different attribute; two all-same | Lower proposed complexity |
| 2 | Two all-different attributes; one all-same | Medium proposed complexity |
| 3 | Three all-different attributes | Higher proposed complexity |

This is a structural classification, not proof that every Level 3 set takes longer to find. Human playtesting must measure solve time and accuracy. Board position, visual grouping, number of alternatives, familiarity, and player skill also affect difficulty.

#### Proposed score model

Use a score breakdown instead of one opaque total:

\`Board score = unique set points + completion bonus + mode bonuses - mode penalties\`

Candidate base rewards to test:
- Level 1: 10 points.
- Level 2: 20 points.
- Level 3: 30 points.

The same ratio can be tested using smaller values \`[1, 2, 3]\`; the important question is the reward relationship, not whether the UI displays 3 or 30. Keep \`[1, 2, 4]\` as an alternative in simulation, not as a presumed improvement.

Potential additions, to test independently:
- **Board-clear bonus:** a clear, understandable reward for finding every undiscovered set on a board.
- **Chain/streak bonus:** a modest reward for successive correct discoveries; reset or reduce it after an error. It should reward sustained recognition without dominating base points.
- **Mode-specific performance bonus:** time or accuracy rewards only in modes designed around those skills.
- **Personal bests:** compare like-for-like mode, difficulty, and settings. Do not compare a relaxed Practice run with a timed Sprint score.

Avoid piling on multipliers before the base rewards work. A player should be able to understand exactly why a score changed.

#### Mistakes should be mode-sensitive

Do not force one penalty rule on every solo experience:
- **Practice:** no match-score penalty; explain the attribute pattern and allow another attempt.
- **Classic:** use a modest, clearly explained cost for an incorrect claim, and consider a zero floor. A miss should not make the rest of the session feel pointless.
- **Sprint:** a wrong attempt may cost a small amount of time or break a chain, rather than using an arbitrary large point deduction.
- **Endurance:** a mistake may consume a life/heart. This creates a clear risk/reward decision.
- **Daily/Contract challenges:** define the consequence in the challenge rules so each attempt is understandable and comparable.

Inactivity or pausing in solo play should not cause a score penalty. A solo game has no opponent to exploit.

#### Correct “No sets left!” reward

A correct declaration completes the board and should feel significant. Re-evaluate the current flat +3 bonus in relation to the new base rewards. The completion reward should not make the player better off ignoring difficult sets and rushing to declare. Test a flat clear bonus, a bonus linked to the total set points available, and a clean-board/perfect-board bonus as separate variants.

#### Scoring acceptance criteria

- Different levels have visibly different base rewards after the difficulty hypothesis is validated.
- Each score event has localized feedback and a score breakdown.
- Duplicate sets never score twice.
- Practice mistakes do not punish learning.
- Classic penalties cannot create hopelessly negative sessions; test a zero floor.
- Optional mode bonuses do not make records incomparable.
- Automated simulations are supplemented by real human playtests.
- Do not finalize values using the current simulation alone; see Section 8.

### A2. Build a meaningful solo mastery and XP system

XP should make long-term improvement visible. A value that only appears on the results screen is not enough.

#### XP design principles

1. XP is separate from match score and can never be lost because of a mistake.
2. XP is earned for verified play, not opening the app, waiting, or repeatedly clicking.
3. Difficulty should influence XP once the level reward model is playtested.
4. Award and persist XP at safe checkpoints (for example, after each completed board), not only after the full three-round session. A player who quits after two boards should retain the verified progress from those boards.
5. Saving must be idempotent: refreshing, replaying a result screen, or retrying a save must not award the same board twice.
6. Keep progress local and clearly explain that it is browser/device-specific unless cloud accounts are separately authorized later.

#### Proposed XP sources

Candidate values to simulate and playtest:
- Level 1 set: 10 XP.
- Level 2 set: 15 XP.
- Level 3 set: 25 XP.
- Board cleared: additional completion XP.
- First-time mode milestones and meaningful personal achievements: one-time XP only.

These are starting proposals, not final values. Avoid awarding XP repeatedly for replaying an easy seeded board in a way that makes mastery meaningless. Consider reduced/replay XP or separate practice rewards, but do not punish players for practicing.

#### Player-facing progression

Add:
- A named mastery rank/level.
- An XP bar showing current progress and the next rank threshold.
- A clear “you earned X XP” summary after a board and session.
- Progress by difficulty level, not only a lifetime total.
- Personal bests for each mode and relevant difficulty.
- Achievement/milestone cards for meaningful accomplishments.
- Unlocks that expand expression or solo content: card backs, board themes, visual effects, sound packs, profile titles, or optional challenge sets. Unlocks must be cosmetic or content access, never competitive power.
- A personal activity/history view that remains useful without an online account.

The exact rank names, threshold curve, unlock list, and XP values require a small balancing pass. Do not build a sprawling economy, loot boxes, currencies, or daily login rewards.

### A3. Add solo gameplay content

The current three-round Classic mode should remain easy to find, but it should no longer be the only meaningful way to play.

#### Recommended solo modes

| Mode | Core loop | Why it adds value | Priority |
|---|---|---|---|
| **Classic** | Clear a sequence of standard boards; score by set difficulty and board completion | Improved main mode and personal best | P0 |
| **Practice / Academy** | Untimed exercises, attribute-focused lessons, optional hints, explanations after mistakes | Teaches the rule and supports beginners | P1 |
| **Time Attack / Sprint** | Find as many valid sets as possible before a selected time limit | Adds urgency, replayability, and score chasing | P1 |
| **Prism Contracts** | Each board has an objective, such as finding a target number of Level 2/3 sets or clearing without mistakes | Gives each run a specific purpose | P1 |
| **Endurance / Survival** | Continue across boards; mistakes consume limited hearts/lives; challenge escalates gradually | Creates risk management and a longer session | P2 |
| **Daily Challenge** | A deterministic challenge seed for a given date, with a personal result and streak | Gives a fresh reason to return | P2 |
| **Constellation Chain** | Find sets in sequence to build and preserve a chain; chain rewards encourage flow | Rewards sustained pattern recognition | P2 |
| **Ghost Run** | Replay or race against a saved personal-best trace on the same seeded board | Makes personal improvement tangible | P3 |

P0/P1/P2/P3 are recommended delivery order, not separate technical architecture stages. Solo modes are not deferred just because their names appeared in earlier lists of “advanced modes.”

#### Practice / Academy content

Break learning into short, optional lessons:
- One attribute at a time: shape, shape color, background.
- Recognize all-same versus all-different.
- Identify why a 2+1 pattern fails.
- Compare Level 1, 2, and 3 examples.
- Guided board scan: explain an example, then let the player solve.
- Optional hints that teach rather than reveal the answer immediately.

The player must be able to disable hints and play without assistance. Practice should reward learning and completion without treating mistakes as failure.

#### Prism Contracts — solo first

Examples of contracts:
- Find at least one Level 3 set.
- Find two sets with different difficulty levels.
- Clear the board without a wrong claim.
- Find every set that has three different shape colors.
- Complete the board using no hints.
- Find a specified number of sets within a selected time.

Contracts should be short, clearly worded, generated only when the board can satisfy them, and validated before a challenge begins. Avoid objectives that are impossible on the generated board.

#### Daily Challenge — no server required for the first version

Use a deterministic seed derived from a stable date (prefer a clearly documented timezone such as UTC) and a versioned board-generation algorithm. This can provide the same daily board to players without an account or server. Store local completion and best result. If global ranking is added later, the server must validate the daily seed and submission.

### A4. Add a real GUI Settings screen

Settings is a first-class player feature, not a developer-only configuration file. Add a Settings entry from the home screen and a reachable in-game menu/pause path. Use an accessible, responsive graphical interface with live preview.

#### Proposed Settings sections

| Section | User controls |
|---|---|
| **General** | Language (English/Korean), sound-effects toggle, default landing/mode preference |
| **Appearance** | Theme/palette, card face/style, card size, board spacing, UI scale, font size, compact/comfortable layout |
| **Accessibility** | High contrast, color-vision-friendly palette, reduced motion, disable scanlines/flashing, larger text, keyboard navigation/help, clear selection outline |
| **Feedback** | Concise/detailed explanations, show/hide optional hints in Practice, confirmation before declaring no sets, score pop-up/detail preferences |
| **Gameplay** | Default solo mode, solo time-limit presets where relevant, optional tutorial prompts, selection interaction preferences |
| **Audio** | Sound-effect volume/mute; music controls only if music is introduced |
| **Data** | Show local-save status, export/import local progress where practical, reset settings, reset all local progress with confirmation |

#### Visual customization guidelines

- Offer a small, coherent set of supported themes (for example, the current 16-bit theme plus a clean high-contrast theme). Do not create an unbounded theme editor in the first release.
- Keep card attributes distinguishable in every theme. Never rely on color alone; preserve shape differences, labels/accessible names, and clear card outlines.
- Allow larger cards and text for readability, especially on mobile.
- Allow motion/scanline effects to be reduced or disabled; honor system \`prefers-reduced-motion\`.
- Preview visual choices immediately. Provide “Apply” only if a setting genuinely needs a commit step; otherwise auto-save and provide a visible saved state.
- Include “Reset this section” and “Restore defaults”.
- Keep settings controls keyboard-accessible and localized in English and Korean.

#### Settings persistence and boundaries

- Persist preferences locally through a typed, versioned settings model and repository.
- Validate settings at runtime; invalid or obsolete values must fall back safely.
- Keep settings separate from session score and mastery XP data where practical.
- Display a clear warning that settings and progress are local to this browser/device.
- Appearance and accessibility preferences must never alter score eligibility.
- Mode-specific rule modifiers must be visible before a run and should create a separate personal-best category. Do not silently change the default scoring rules.
- Competitive multiplayer may later restrict gameplay-affecting settings while preserving accessibility settings.

### A5. Solo quality-of-life improvements

These improvements should be planned alongside the new modes:

- Pause/resume in modes where a pause is fair; pausing must not create a multiplayer advantage because this applies to solo modes.
- Clear restart/replay and “same board” options for practice.
- Results broken down by Level 1/2/3, correct sets, mistakes, board clears, time, streak, and XP.
- Record and compare best result by mode, difficulty, and ruleset.
- Show the current objective and progress during the run.
- Provide helpful onboarding and a concise rules reference.
- Improve mobile touch targets and card readability.
- Keep focus visible and screen-reader announcements useful without reading the whole board every render.
- Keep animations responsive and respect reduced-motion settings.
- Add sound effects only if they improve feedback; provide mute/volume settings.
- Make local save failures visible and offer a recovery/export path where possible.

## 5. Track B — multiplayer and classroom play (later, separate implementation)

The inactivity/idle-player ranking concern belongs here. Multiplayer has opponents, shared rounds, and competitive/classroom results; it must have fair participation rules and a server-authoritative source of truth.

### B1. Rooms and roles

- Create/join room with a short room code.
- Teacher/host and student/player roles.
- Waiting room, ready status, roster, late join policy, reconnect and disconnect handling.
- Host configures total rounds and game variant.
- Server owns the room state; client state is a display/input layer.

### B2. Claim flow and timing

Preserve the original distinction:
- A player calls **합!** to claim the right to submit a set.
- The selection timer begins after the claim, not at the start of the whole round.
- A wrong claim may trigger a configured waiting interval/cooldown.
- A player calls **결!** when they believe no valid sets remain.
- Host configures round count, post-claim selection time, and wrong-answer cooldown.

Do not turn the original post-claim selection timer into a general solo-round countdown. Solo Time Attack has its own explicitly designed timer and rules.

### B3. Multiplayer fairness and rankings

Design and test:
- No-verified-contribution players should not become winners simply because active players made mistakes.
- Eligibility should account for actual opportunities and session format; a fixed quota may be unfair to beginners or players who joined late.
- Server validates claim order, selected cards, board version, duplicate submissions, timer expiry, penalties, scoring, cooldown, and final result.
- Define tie handling, simultaneous claims, disconnect/reconnect, late join, and interrupted matches.
- Separate individual match score, team/class contribution, and long-term mastery.
- Do not trust localStorage, client timestamps, or client-submitted scores for online competition.

The solo game does not need these competitive idle-player rules. It should not punish someone for thinking or pausing.

### B4. Multiplayer modes and shared features

| Feature | Multiplayer form |
|---|---|
| Prism Contracts | Shared/individual contract objectives with server-validated completion |
| Constellation Chain | Team chain or competitive streak race |
| Rival Duel | Head-to-head claim/solve contest |
| Class Raid | Cooperative team objective with shared progress |
| Ghost Board | Race against another player's validated run or class record |
| Teacher dashboard | Session setup, roster, progress, results, and classroom controls |
| Leaderboards | Room/class rankings with clear eligibility and anti-abuse rules |

A feature name appearing here does not mean its solo variant is deferred. Prism Contracts and Constellation Chain are planned as solo-first features in Track A.

### B5. Online infrastructure

Only when multiplayer is explicitly scheduled:
- Choose backend/realtime stack (Node.js + Socket.IO is a candidate, not a commitment).
- Implement authenticated or room-scoped identities appropriate to the intended classroom privacy model.
- Authoritative room/session engine, rate limits, reconnect handling, audit logs, and server-side scoring.
- Define data retention, student privacy, teacher access, and deletion policies before adding accounts or storing identifiable student data.

No mock networking or simulated “online” UI should be presented as a working multiplayer feature.

## 6. Shared design systems and progression boundaries

Keep three concepts separate:

1. **Solo Match Score:** score for the current mode/run.
2. **Personal Mastery:** local XP, ranks, achievements, personal bests, and unlocked cosmetics/content.
3. **Multiplayer Result/Team Progress:** server-validated competitive and cooperative results, introduced later.

Do not use solo XP as a substitute for multiplayer ranking, and do not make competitive points the only reason to play.

## 7. Recommended implementation sequence

### Milestone 0 — completed foundation

React/TypeScript/Vite migration, pure domain modules, tests, local storage foundation, EN/KO parity, difficulty classification, and configurable scoring code are present. This milestone improved development quality but did not deliver a significantly different solo experience.

### Milestone 1 — solo scoring and progression (first player-facing release)

1. Improve difficulty-aware scoring experiments using a better simulation and human playtest.
2. Decide Classic base rewards, board-clear bonus, mistake consequence, and score floor.
3. Show per-level scoring and a clear score breakdown.
4. Redesign XP to reward difficulty and verified outcomes.
5. Persist verified progress at board checkpoints, safely and idempotently.
6. Add mastery ranks, XP progress bar, milestones, and useful personal bests.
7. Update results and in-run feedback.

### Milestone 2 — Settings GUI and solo polish

1. Add a first-class Settings screen.
2. Add live-preview appearance themes, UI/card scale, spacing, text scale, and accessibility controls.
3. Add feedback, audio, and supported solo gameplay preferences.
4. Persist settings with validation/versioning and reset/export safeguards.
5. Add tests for live preview, persistence, migrations, localization, keyboard use, and mobile layout.

Milestones 1 and 2 can be developed in parallel after the current codebase is reviewed.

### Milestone 3 — solo content expansion

Recommended order:
1. Practice / Academy.
2. Time Attack / Sprint.
3. Prism Contracts.
4. Endurance / Survival.
5. Daily Challenge.
6. Constellation Chain.
7. Ghost Run, personal quests, expanded achievements, and cosmetic unlocks.

Ship one complete mode at a time with onboarding, scoring, results, personal records, and tests. Do not add a mode as a menu button without a complete playable loop.

### Milestone 4 — multiplayer discovery and implementation

Only after solo gameplay is satisfying and the owner explicitly authorizes the online track. Begin with requirements/privacy/design, then rooms and authoritative claims, then rankings/team modes. Reuse the tested domain rules, but implement online session authority on the server.

## 8. Scoring simulation and evidence requirements

The current \`docs/scoring-simulation.md\` is a useful first report, but it is not enough to finalize rewards.

Known limitations in the current simulation:
- The realistic bot uses the same find probability for every set level, so it cannot test whether Level 3 is harder or slower than Level 1.
- Random-number streams are reused across bots/scenarios in a way that does not guarantee identical player decisions for paired comparisons.
- It evaluates one board at a time, not full sessions or the new solo modes.
- It does not model human solve-time distributions, hint use, learning, fatigue, or mode-specific mistake rules.

Improve it by:
1. Giving bots level-sensitive detection probabilities and solve-time distributions, with parameters clearly labeled as hypotheses.
2. Giving each board/bot/scenario a deterministic but independent random stream; paired comparisons must actually use comparable decisions.
3. Simulating full three-board sessions and each relevant scoring rule.
4. Reporting score distributions, clear rates, mistake rates, XP progression, mode completion, personal-record behavior, and edge cases.
5. Testing random guessing, repeated submissions, quitting/restarting for XP farming, and easy-board farming.
6. Running human playtests and collecting anonymized aggregate accuracy/time observations before locking difficulty multipliers.

Use simulations to reject bad ideas and understand trade-offs, not to claim that a simulated bot represents real students.

## 9. Acceptance criteria — next single-player release

A release should not be called a meaningful solo upgrade merely because more abstractions or settings data types exist. It should deliver observable changes to play.

### Scoring and progression
- Levels 1/2/3 have tested, meaningfully differentiated rewards or a documented reason not to weight them.
- Correct-set, mistake, streak, and board-clear outcomes are clearly explained.
- Practice is safe for learning; challenge modes have clear risk/reward rules.
- XP is meaningful, visible during and after play, and not lost when a player exits after a verified board.
- Mastery rank/next progress and at least a first set of milestones are visible.
- Records are comparable only within the same mode/ruleset.

### Settings
- Settings can be opened from home and during solo play.
- Appearance/accessibility changes preview immediately and persist after reload.
- High contrast, readable scaling, and reduced motion work on desktop and mobile.
- All controls are keyboard accessible and localized in English and Korean.
- Invalid settings fall back safely; reset is clear and confirmable.

### Content
- At least two additional solo modes beyond Classic ship as complete experiences, beginning with Practice and Sprint or another owner-approved choice.
- Each mode has a tutorial/instruction, real gameplay loop, score/result, personal record, and tests.
- Daily/contract challenges never generate impossible objectives.

### Reliability
- Unit, integration, and Playwright tests cover the new experience.
- CI succeeds.
- Local save errors are not silently presented as successful saves.
- No server/account/network is required for solo play.

## 10. Decisions and proposals

### Product direction already clarified
- Single-player experience is the immediate priority.
- Idle-player fairness/ranking is primarily a multiplayer concern, not a reason to punish solo inactivity.
- The scoring and XP systems are not considered finished just because their domain modules exist.
- A player-facing GUI Settings experience is required.
- Multiplayer remains a separate, later track.

### Proposed defaults to test, not assume
- Match score base rewards: compare \`[10, 20, 30]\` (or normalized \`[1, 2, 3]\`) with \`[10, 20, 40]\`.
- Classic score floor: test a floor of zero if mistakes still subtract score.
- Practice wrong-answer penalty: zero.
- XP: compare difficulty-weighted values such as \`[10, 15, 25]\`, plus board-clear XP.
- XP save point: after each verified board, with idempotency.
- Settings: live preview and auto-save for simple preferences, with clear reset controls.
- First new solo modes: Practice / Academy and Time Attack / Sprint.

### Still open for playtesting/owner review
- Exact per-level score and XP values.
- Classic wrong-claim penalty and board-clear bonus.
- Whether and how streak bonuses should scale.
- Endurance lives/mistake rules and Sprint time presets.
- Mastery rank names, thresholds, and unlock rewards.
- Final appearance themes and which settings are worth exposing initially.
- Daily challenge timezone and seed versioning.
- Which solo modes ship in the first content release.

### Multiplayer-only decisions
- Exact post-**합!** selection window and wrong-answer cooldown.
- Room roles, claim priority, tie handling, eligibility, ranking, and team contribution.
- Backend/realtime stack, identity/privacy, retention, teacher controls, and online leaderboards.

## 11. Architecture guidance for the current codebase

Keep the existing strengths:
- Domain rules and scoring stay framework-independent and deterministic.
- React owns presentation and screen-level state; do not add a state library without need.
- Keep UI settings and visual preferences outside pure game-rule modules.
- Use typed, versioned local repositories with runtime validation and migration paths.
- Persist each verified progression checkpoint exactly once.
- Keep match-score rules configurable by mode, not as a pile of hard-coded constants.
- Keep English and Korean catalogs aligned; all new player-facing copy belongs in both.
- Keep UI settings accessible and previewable; CSS custom properties/tokens are a natural way to apply appearance preferences.
- No backend/network dependency for the single-player track.
- Do not implement fake multiplayer or move solo modes into the multiplayer backlog just because they were once listed as “advanced”.

Potential module boundaries, only when useful:
- \`features/settings/\`: Settings page, sections, controls, live preview.
- \`domain/settings/\`: setting types/defaults/validation where they are pure.
- \`infrastructure/storage/\`: settings/profile repositories and migrations.
- \`features/modes/\`: mode selection and each solo mode flow.
- \`domain/scoring/\`: rulesets, score events, breakdowns.
- \`domain/progression/\`: XP events, mastery thresholds, achievements.
- \`domain/challenges/\`: contract objective generation/validation and daily seeds.

## 12. References

Research supports design hypotheses; it does not prove a difficulty multiplier for this exact three-attribute game.

### Game/cognition research
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

### Technical references
- React: https://react.dev/learn
- TypeScript: https://www.typescriptlang.org/docs/handbook/intro.html
- Vite: https://vite.dev/guide/
- Vitest: https://vitest.dev/guide/
- Playwright: https://playwright.dev/docs/intro

### Project references
- Repository: https://github.com/mp3note3-ux/quick-math-game
- Instructions: https://github.com/mp3note3-ux/quick-math-game/blob/main/CLAUDE.md
- Handoff: https://github.com/mp3note3-ux/quick-math-game/blob/main/HANDOFF_FOR_NEXT_LLM.md
- Original game: https://sub-teacher.com/API/combinationgame/combinationgame.html

## 13. Design north star

**Make the solo game enjoyable even when nobody else is online.** Players should have reasons to practice, chase a personal best, complete a challenge, unlock a new visual style, or improve their mastery. Multiplayer should later add the excitement of claiming a set before another player — not be the only place where the game becomes interesting.
