# Combination Game

An original, English-first recreation of a three-attribute combination card game, with a built-in English/Korean language switcher.

## Current status

The first version includes a playable local single-player game:
- Three rounds per session.
- Nine cards per round, drawn from a 27-card deck.
- Valid sets require each attribute to be either all the same or all different.
- Duplicate sets are tracked and cannot score twice.
- Correct sets award +1 point; an incorrect selection costs 1 point.
- Correctly declaring that no undiscovered sets remain awards a +3 round bonus.
- English is the default language; Korean is available from the language switcher.
- The selected language is saved in the browser.

Multiplayer rooms, host/student roles, server-side synchronization, persistence and rankings are planned but are not represented as working features in this first version.

## Requirements

- Node.js 20 or later
- npm

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Check the project

```bash
npm test
npm run build
```

## Languages

Translations live in `src/i18n/locales/`:
- `en.json` — English (default)
- `ko.json` — Korean

The translation layer is separated from UI components. To add another language later, add a locale JSON file, import it in `src/i18n/index.js`, and register its locale code.

## Project layout

```text
src/
  game/
    engine.js
    engine.test.js
  i18n/
    index.js
    locales/
      en.json
      ko.json
  main.js
  styles.css
```

## Original implementation

This project is an independent implementation. It does not copy the original website's source code or proprietary assets.
