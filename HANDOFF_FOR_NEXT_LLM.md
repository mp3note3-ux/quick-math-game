# AI Handoff: Combination Game

## 1. Project identity

- Repository: https://github.com/mp3note3-ux/quick-math-game
- Package name: `combination-game-replica`
- Current version: `0.1.0`
- Default branch: `main`
- Application type: browser-based single-page game
- Frontend tooling: Vite 6, native JavaScript ES modules, HTML, CSS
- Node requirement: Node.js 20 or later
- Primary UI language: English
- Additional UI language: Korean

This document is written in English. The codebase currently contains Korean translation values in its Korean locale catalog; do not remove that locale unless the project owner explicitly changes the language requirement.

## 2. Project goal

Build an independent implementation of a three-attribute combination card game. The intended longer-term product includes:

1. English-first user interface.
2. Korean language option, with architecture that can accept more languages later.
3. Single-player mode.
4. Multiplayer rooms with room codes.
5. Host and student/player roles.
6. Synchronized game state across different devices.
7. Scores, round results, rankings and possibly game history.

Only the English/Korean UI foundation and a local single-player game are implemented. The online multiplayer product is NOT implemented yet.

## 3. Current repository structure

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml
├── .gitignore
├── README.md
├── index.html
├── package.json
└── src/
    ├── game/
    │   ├── engine.js
    │   └── engine.test.js
    ├── i18n/
    │   ├── index.js
    │   └── locales/
    │       ├── en.json
    │       └── ko.json
    ├── main.js
    └── styles.css
```

## 4. What each file does

### `index.html`
The minimal HTML document Vite serves. It provides the `#app` mount element and loads `src/main.js` as a JavaScript module. The document starts with English metadata.

### `package.json`
Defines the npm project and commands:

- `npm run dev`: start the local Vite development server.
- `npm run build`: create an optimized production build in `dist/`.
- `npm run preview`: serve the production build locally.
- `npm test`: run the Node built-in test suite for the game engine.

Vite is a development dependency. A fresh clone must run `npm install` before these scripts can use Vite.

### `src/game/engine.js`
Contains the game rules without depending on the browser UI.

Card model:
- `s`: shape value, one of 0, 1, 2.
- `c`: shape-color value, one of 0, 1, 2.
- `b`: background value, one of 0, 1, 2.

There are 3 × 3 × 3 = 27 unique possible cards. `createDeck()` generates them. `shuffle()` randomizes a copy of an array. `createBoard()` selects nine cards from the shuffled deck.

A valid set contains exactly three cards. For EACH attribute independently, its three values must be either:
- all equal, OR
- all different.

A mixed pattern such as 0, 0, 1 is invalid for that attribute.

Main exports:
- `createDeck()`
- `shuffle(items, random)`
- `createBoard(random)`
- `isCombination(cards)`
- `combinationKey(indices)`
- `findCombinations(cards, excludedKeys)`

`findCombinations` checks all triples on the board and can exclude combinations already discovered. `combinationKey` sorts three card indices to make the key independent of selection order.

### `src/game/engine.test.js`
Uses Node's built-in `node:test` and `node:assert/strict`. It tests deck uniqueness, board size/uniqueness, valid and invalid set rules, exclusion of previously found sets, and order-independent combination keys.

### `src/i18n/index.js`
A small localization manager. It imports the English and Korean JSON catalogs, uses English as the fallback, interpolates placeholders such as `{count}`, saves the selected locale in localStorage, updates the document's `lang` attribute, and calls a callback so the UI can re-render.

Supported locales are currently `en` and `ko`. To add another locale, add a JSON catalog, import it here, register its locale code, and ensure the new catalog contains the same keys.

### `src/i18n/locales/en.json` and `ko.json`
Text catalogs for the interface. They currently contain 79 corresponding keys each. All new visible UI copy should be added to both catalogs. Avoid hard-coding user-facing strings in UI logic.

### `src/main.js`
The current application controller and UI renderer. It:
- Imports the stylesheet, game engine and localization manager.
- Holds the current screen and session state.
- Renders the home screen, game screen and results screen.
- Renders the English/Korean language switcher.
- Handles player-name input and stores the last name locally.
- Starts three rounds of single-player play.
- Handles selecting cards and submitting a three-card set.
- Updates score and feedback.
- Calculates how many undiscovered valid sets remain.
- Handles the player's declaration that no sets remain.
- Shows the results screen and allows replay or return home.

The UI uses event delegation from the root `#app` element. Buttons/cards carry `data-action`, `data-card-index`, or `data-language` attributes.

Important current game flow:
1. Player enters a name and starts a solo game.
2. A board of nine random distinct cards is created.
3. Player presses the “Find a set!” control to enable card selection.
4. Player selects three cards. The third click submits the selection automatically.
5. A correct new set adds 1 point and is recorded.
6. An incorrect set subtracts 1 point.
7. A previously found set does not change the score.
8. Player presses “No sets left!” to claim that all undiscovered sets have been found.
9. If none remain, the round ends and awards 3 bonus points. Otherwise, 1 point is deducted and the round continues.
10. After three completed rounds, the results screen appears.

### `src/styles.css`
Contains the full visual design and responsive layout for desktop and mobile. It styles the home, game and results screens, cards, controls, score panels, feedback and language switcher. It imports DM Sans and Noto Sans KR from Google Fonts; if offline use is important, consider local/system font fallbacks or self-hosting fonts.

### `.github/workflows/ci.yml`
GitHub Actions workflow runs on pushes and pull requests targeting `main`. It checks out the repository, sets up Node.js 20, installs dependencies, runs `npm test`, and runs `npm run build`.

### `.gitignore`
Excludes local dependencies, build output, Vite cache, OS metadata and environment files.

## 5. What is finished

- [x] Vite project scaffold and npm scripts.
- [x] English-first UI.
- [x] English and Korean locale catalogs with matching key sets.
- [x] Language switcher.
- [x] Persist language choice in browser localStorage.
- [x] Player-name entry and local persistence.
- [x] 27-card attribute deck.
- [x] Random nine-card board.
- [x] Core all-same/all-different set validation.
- [x] Search for all valid triples on a board.
- [x] Track found sets and prevent scoring the same set twice.
- [x] Three-round solo session.
- [x] Basic score and feedback rules.
- [x] Results screen and replay.
- [x] Unit tests for core engine behavior.
- [x] GitHub Actions test/build workflow.
- [x] Responsive CSS for smaller screens.

## 6. What is NOT finished

### Multiplayer — not implemented
The home screen displays a disabled “Coming soon” multiplayer card. There is no room creation, joining, room code, player list, host role, student role, live game state, WebSocket connection, database, or server API.

Do not tell users that online multiplayer works.

### Backend and persistence — not implemented
There is no backend service or database. Player names and language preferences are stored in localStorage only. Game scores and match history are not saved to a shared server.

### Other planned features — not implemented
- Host dashboard and controls.
- Student join/waiting screen.
- Room lifecycle and room code validation.
- Server-authoritative scoring and anti-cheat validation.
- Real-time synchronization and reconnect handling.
- Multiplayer turn/claim rules.
- Global or room rankings/leaderboards.
- Match history and achievements.
- User accounts or authentication.
- Production hosting/deployment configuration.
- Automated browser/UI end-to-end tests.
- Dedicated accessibility audit and full keyboard-only gameplay review.

### Product/game-rule decisions still need confirmation
The current solo mode awards +1 for a correct set, -1 for an incorrect set, and +3 for correctly declaring no remaining sets. Confirm these scoring values against the intended game rules before building multiplayer around them.

The current board is nine cards selected randomly from a 27-card deck. It does not yet implement any special board-generation constraints beyond card uniqueness.

The current interface auto-submits after the third card is clicked. This is a solo-mode interaction choice; multiplayer may need a separate explicit “Hap!” call/claim sequence and server validation.

There is no timer in the current game.

## 7. Local setup and troubleshooting

From the repository folder in PowerShell:

```powershell
npm install
npm run dev
```

Open the local URL Vite prints, usually `http://localhost:5173/`.

Run tests and production build:

```powershell
npm test
npm run build
```

If PowerShell says `vite is not recognized`, dependencies have not been installed correctly. Run:

```powershell
npm install --include=dev
```

Then retry `npm run build`.

If installation still fails, inspect Node/npm versions with:

```powershell
node --version
npm --version
```

Use Node.js 20 or later. Do not install Vite globally as the first fix; the project should use its local dependency.

To update a local clone after GitHub changes:

```powershell
git pull origin main
npm install
```

## 8. Recommended implementation roadmap

### Phase 1 — stabilize solo gameplay
1. Run tests and build on a clean clone.
2. Test all UI flows in a real browser at desktop and mobile widths.
3. Confirm scoring, round-completion, and no-set declaration rules with the product owner.
4. Add deterministic game scenarios and tests for score/round transitions.
5. Add a timer only if the intended rules require one.
6. Improve keyboard interaction, focus handling and screen-reader feedback.

### Phase 2 — define multiplayer architecture before coding it
1. Write a multiplayer requirements/specification document.
2. Decide whether to use Supabase Realtime, Firebase, or a custom Node/WebSocket server.
3. Define room states, player roles, host permissions and game lifecycle.
4. Define the authoritative server-side game state and scoring rules.
5. Define what happens when a host disconnects or a player reconnects.
6. Never trust client-submitted scores or claims; validate them on the server.

### Phase 3 — implement multiplayer
Suggested conceptual modules:
- `src/multiplayer/rooms.js`: client room operations.
- `src/multiplayer/players.js`: player presence and roles.
- `src/multiplayer/synchronization.js`: subscribe/publish game state.
- Backend/server functions: create/join/leave room, start round, submit claim, validate set, finish round.

These files do not exist yet. Add them only when the backend architecture is chosen.

### Phase 4 — rankings and release
1. Persist match results.
2. Add room and global leaderboards if required.
3. Add deployment and environment configuration.
4. Test multi-device sessions and failure/reconnect cases.
5. Publish a production build.

## 9. Guidance for the next LLM

- Start by reading this document and then inspect the actual repository files. This handoff describes the current known state; the repository is authoritative if it differs.
- Do not assume that multiplayer, a backend, room APIs, authentication, or cloud persistence already exist.
- Do not rewrite the working game engine without a clear reason. Preserve and extend its pure-function design.
- Keep all new user-facing text in locale JSON catalogs. Maintain identical keys across English and Korean.
- English remains the default language.
- Use accessible semantic HTML, labels, focus states and responsive design.
- Keep game rules separate from UI rendering and from backend/network code.
- Add tests for game-rule changes and run both `npm test` and `npm run build` after changes.
- Do not claim a feature is complete until it has been implemented and verified.
- Do not add secrets or service credentials to committed source files. Use environment variables and an example environment file where appropriate.
- Ask the project owner only for decisions that materially affect architecture or game rules. For routine implementation details, choose a maintainable default and explain it.

## 10. Current status in one sentence

This repository is a tested, English-first, English/Korean browser-based single-player prototype with a clean game-rules module; online multiplayer, backend services, shared persistence and leaderboards remain future work.
