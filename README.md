# Combination Game

An original, English-first recreation of a three-attribute combination card game, with a built-in English/Korean language switcher and a 16-bit console interface.

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

## Visual style (16-bit)

The interface borrows from SNES/Mega Drive-era games, mainly the JRPG menu systems of Final Fantasy VI and Chrono Trigger:

- **Windows:** blue-to-navy gradient panels with a light inner frame, dark outer outline and stepped (notched) corners, drawn with `box-shadow` only.
- **Palette:** one small set of CSS variables in `src/styles.css`; gold is reserved for the active/primary thing.
- **Type:** Press Start 2P for labels, numbers and buttons; DotGothic16 for body text and for all Korean text. White text with a 1px hard shadow.
- **Cursor:** a stepped pointing-hand style arrow on menu items and on selected cards.
- **Dialogue box:** one dark box at the bottom of the board carries both the selection prompt and the result of the last action.
- **HUD:** one top bar holds round, score, found, remaining and player name.
- **Pixel details:** stepped shapes with hard outlines, 2-tone bevels, a checker dither on card edges, hard offset shadows, `steps()` blink animations and a faint scanline overlay (delete the `body::after` block to remove it).
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
