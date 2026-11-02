import "./styles.css";
import { createBoard, findCombinations, isCombination, combinationKey } from "./game/engine.js";
import { createI18n } from "./i18n/index.js";

const TOTAL_ROUNDS = 3;
const root = document.querySelector("#app");
const i18n = createI18n(() => render());

const SHAPES = ["shapeCircle", "shapeTriangle", "shapeSquare"];
const SHAPE_COLORS = ["#F07872", "#62A9E8", "#F0C75E"];
const SHAPE_COLOR_KEYS = ["colorCoral", "colorBlue", "colorYellow"];
const BACKGROUNDS = ["#F5F7FB", "#A8B4C5", "#343C4B"];
const BACKGROUND_KEYS = ["backgroundLight", "backgroundSlate", "backgroundDark"];

const state = {
  screen: "home",
  playerName: safeStoredName(),
  round: 1,
  score: 0,
  board: [],
  found: new Set(),
  selection: [],
  selecting: false,
  roundComplete: false,
  roundsCompleted: 0,
  totalSetsFound: 0,
  feedback: "",
  feedbackType: "info",
};

function safeStoredName() {
  try {
    return localStorage.getItem("combination-game-player-name") || "";
  } catch {
    return "";
  }
}

function savePlayerName(name) {
  try {
    localStorage.setItem("combination-game-player-name", name);
  } catch {
    // The current session can continue without persistent storage.
  }
}

function t(key, variables) {
  return i18n.t(key, variables);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function languageSwitcher() {
  const locale = i18n.getLocale();
  return `
    <div class="language-switcher" role="group" aria-label="${t("language")}">
      <button class="language-option ${locale === "en" ? "is-active" : ""}" type="button"
        data-language="en" aria-pressed="${locale === "en"}">EN</button>
      <button class="language-option ${locale === "ko" ? "is-active" : ""}" type="button"
        data-language="ko" aria-pressed="${locale === "ko"}">한국어</button>
    </div>
  `;
}

// The title screen already shows the game name as a logo, so it hides the brand link.
function header({ showQuit = false, showBrand = true } = {}) {
  return `
    <header class="topbar ${showBrand ? "" : "topbar-end"}">
      ${showBrand ? `
        <a class="brand" href="#" data-action="home" aria-label="${t("appName")} ${t("home")}">
          <span class="brand-mark" aria-hidden="true">♦</span>
          <span>${t("appName")}</span>
        </a>` : ""}
      <div class="topbar-actions">
        ${languageSwitcher()}
        ${showQuit ? `<button class="button button-small" type="button" data-action="quit">${t("quit")}</button>` : ""}
      </div>
    </header>
  `;
}

function hudCell(label, value, className = "") {
  return `
    <div class="hud-cell ${className}">
      ${label ? `<span class="hud-label">${label}</span>` : ""}
      <strong class="hud-value">${value}</strong>
    </div>
  `;
}

function render() {
  document.documentElement.lang = i18n.getLocale();
  document.title = t("appName");
  document.querySelector('meta[name="description"]')?.setAttribute("content", t("metaDescription"));
  if (state.screen === "game") {
    root.innerHTML = renderGame();
  } else if (state.screen === "results") {
    root.innerHTML = renderResults();
  } else {
    root.innerHTML = renderHome();
  }
}

function renderHome() {
  const steps = [1, 2, 3].map((n) => `
    <li>
      <span class="num">${n}</span>
      <div>
        <strong>${t(`howToStep${["One", "Two", "Three"][n - 1]}Title`)}</strong>
        <p>${t(`howToStep${["One", "Two", "Three"][n - 1]}Body`)}</p>
      </div>
    </li>
  `).join("");

  return `
    <div class="screen">
      ${header({ showBrand: false })}
      <main>
        <section class="title-logo">
          <h1>${t("appName")}</h1>
          <p>${t("tagline")}</p>
        </section>

        <div class="title-grid">
          <section class="window" aria-label="${t("singlePlayerTitle")}">
            <form id="start-form">
              <div class="name-field">
                <label for="player-name">${t("playerNameLabel")}</label>
                <input id="player-name" name="playerName" maxlength="18" autocomplete="nickname"
                  placeholder="${t("playerNamePlaceholder")}" value="${escapeHtml(state.playerName)}" required />
              </div>
              <button class="menu-item menu-item-primary" type="submit">${t("startSinglePlayer")}</button>
            </form>
            <button class="menu-item" type="button" disabled title="${escapeHtml(t("multiplayerNotReady"))}">
              <span>${t("multiplayerTitle")}</span>
              <span class="tag">${t("comingSoon")}</span>
            </button>
          </section>

          <section class="window" aria-label="${t("howToTitle")}">
            <h2 class="window-title">${t("howToTitle")}</h2>
            <ol class="rules">${steps}</ol>
          </section>
        </div>
      </main>
    </div>
  `;
}

function currentCombinations() {
  return findCombinations(state.board);
}

function remainingCombinations() {
  return findCombinations(state.board, state.found);
}

function cardMarkup(card, index) {
  const selected = state.selection.includes(index);
  const shapeKey = SHAPES[card.s];
  const shapeColor = SHAPE_COLORS[card.c];
  const background = BACKGROUNDS[card.b];
  const ariaLabel = t("cardAriaLabel", {
    number: index + 1,
    shape: t(shapeKey),
    shapeColor: t(SHAPE_COLOR_KEYS[card.c]),
    background: t(BACKGROUND_KEYS[card.b]),
  });

  return `
    <button class="game-card ${selected ? "is-selected" : ""}" type="button"
      data-card-index="${index}" aria-label="${escapeHtml(ariaLabel)}"
      aria-pressed="${selected}" ${state.roundComplete || !state.selecting ? "disabled" : ""}
      style="--card-background:${background};--shape-color:${shapeColor}">
      <span class="card-number">${index + 1}</span>
      <span class="shape-wrap" aria-hidden="true">
        <span class="card-shape ${shapeKey.replace("shape", "").toLowerCase()}"></span>
      </span>
    </button>
  `;
}

function foundMarkup() {
  if (state.found.size === 0) return `<p class="empty-state">${t("foundNone")}</p>`;
  return [...state.found].map((key) => `
    <span class="found-chip">${key.split(",").map((index) => Number(index) + 1).join("-")}</span>
  `).join("");
}

function renderGame() {
  const remaining = remainingCombinations().length;

  // One dialogue box for both the selection prompt and the result of the last action.
  const dialogText = state.selecting
    ? t("selectionProgress", { count: state.selection.length })
    : state.feedback || t("boardInstruction");
  const dialogType = state.selecting || !state.feedback ? "info" : state.feedbackType;

  const controls = state.roundComplete ? `
    <div class="round-complete">
      <div>
        <h3>${t("roundCompleteTitle")}</h3>
        <p>${t("roundCompleteBody")}</p>
      </div>
      <button class="button button-primary" type="button" data-action="next-round">
        ${state.round === TOTAL_ROUNDS ? t("finishGame") : t("nextRound")}
      </button>
    </div>
  ` : `
    <div class="game-controls">
      <button class="button button-primary ${state.selecting ? "" : "is-blink"}" type="button" data-action="start-selection"
        ${state.selecting ? "disabled" : ""}>
        ${t("callSet")}
      </button>
      <button class="button" type="button" data-action="cancel-selection" ${state.selecting ? "" : "disabled"}>
        ${t("cancelSelection")}
      </button>
      <button class="button button-danger" type="button" data-action="call-no-sets">
        ${t("callNoSets")}
      </button>
    </div>
  `;

  return `
    <div class="screen">
      ${header({ showQuit: true })}
      <main>
        <section class="hud window" aria-label="${t("boardTitle")}">
          ${hudCell("", t("roundLabel", { current: state.round, total: TOTAL_ROUNDS }), "hud-round")}
          ${hudCell(t("scoreLabel"), state.score, "hud-score")}
          ${hudCell(t("foundSetsLabel"), state.found.size)}
          ${hudCell(t("remainingSetsLabel"), remaining)}
          ${hudCell(t("playerNameLabel"), escapeHtml(state.playerName))}
        </section>

        <div class="play-layout">
          <section class="window" aria-label="${t("boardTitle")}">
            <div class="card-grid">
              ${state.board.map(cardMarkup).join("")}
            </div>
            <div class="dialog dialog-${dialogType}" role="status" aria-live="polite">${dialogText}</div>
            ${controls}
          </section>

          <aside class="window" aria-label="${t("foundSetsLabel")}">
            <h2 class="window-title">${t("foundSetsLabel")}</h2>
            <div class="found-list">${foundMarkup()}</div>
          </aside>
        </div>
      </main>
    </div>
  `;
}

function renderResults() {
  return `
    <div class="screen">
      ${header()}
      <main class="results window">
        <p class="window-title">${t("resultsTitle")}</p>
        <h1>${t("resultsSubtitle", { name: escapeHtml(state.playerName) })}</h1>
        <div class="final-score">
          <span>${t("finalScore")}</span>
          <strong>${state.score}</strong>
          <small>${t("pointsLabel")}</small>
        </div>
        <div class="results-stats">
          ${hudCell(t("roundsCompleted"), `${state.roundsCompleted} / ${TOTAL_ROUNDS}`)}
          ${hudCell(t("totalSetsFound"), state.totalSetsFound)}
        </div>
        <div class="results-actions">
          <button class="button button-primary" type="button" data-action="play-again">${t("playAgain")}</button>
          <button class="button" type="button" data-action="home">${t("returnHome")}</button>
        </div>
      </main>
    </div>
  `;
}

function beginRound(roundNumber) {
  state.screen = "game";
  state.round = roundNumber;
  state.board = createBoard();
  state.found = new Set();
  state.selection = [];
  state.selecting = false;
  state.roundComplete = false;
  state.feedback = "";
  state.feedbackType = "info";
  render();
}

function startGame() {
  const input = root.querySelector("#player-name");
  const name = input?.value.trim() || "";
  if (!name) {
    input?.setCustomValidity(t("playerNameRequired"));
    input?.reportValidity();
    return;
  }

  state.playerName = name;
  savePlayerName(name);
  state.score = 0;
  state.roundsCompleted = 0;
  state.totalSetsFound = 0;
  beginRound(1);
}

function submitSelection() {
  if (state.selection.length !== 3) {
    state.feedback = t("feedbackNeedThree");
    state.feedbackType = "warning";
    render();
    return;
  }

  const key = combinationKey(state.selection);
  if (state.found.has(key)) {
    state.feedback = t("feedbackDuplicate");
    state.feedbackType = "info";
  } else if (isCombination(state.selection.map((index) => state.board[index]))) {
    state.found.add(key);
    state.score += 1;
    state.totalSetsFound += 1;
    state.feedback = t("feedbackCorrect");
    state.feedbackType = "success";
  } else {
    state.score -= 1;
    state.feedback = t("feedbackWrong");
    state.feedbackType = "error";
  }

  state.selection = [];
  state.selecting = false;
  render();
}

function callNoSets() {
  const remaining = remainingCombinations().length;
  if (remaining > 0) {
    state.score -= 1;
    state.feedback = t("feedbackSetsRemain", { count: remaining });
    state.feedbackType = "error";
    render();
    return;
  }

  state.score += 3;
  state.roundsCompleted += 1;
  state.roundComplete = true;
  state.selecting = false;
  state.selection = [];
  state.feedback = t("feedbackRoundComplete");
  state.feedbackType = "success";
  render();
}

function nextRound() {
  if (state.round >= TOTAL_ROUNDS) {
    state.screen = "results";
    render();
    return;
  }
  beginRound(state.round + 1);
}

function quitGame() {
  if (!window.confirm(t("confirmQuit"))) return;
  state.screen = "home";
  state.feedback = "";
  render();
}

root.addEventListener("click", (event) => {
  const languageButton = event.target.closest("[data-language]");
  if (languageButton) {
    i18n.setLocale(languageButton.dataset.language);
    return;
  }

  const cardButton = event.target.closest("[data-card-index]");
  if (cardButton && state.screen === "game") {
    if (!state.selecting || state.roundComplete) return;
    const index = Number(cardButton.dataset.cardIndex);
    if (state.selection.includes(index)) {
      state.selection = state.selection.filter((item) => item !== index);
    } else if (state.selection.length < 3) {
      state.selection = [...state.selection, index];
    }
    if (state.selection.length === 3) {
      submitSelection();
    } else {
      render();
    }
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;

  switch (actionButton.dataset.action) {
    case "home":
      event.preventDefault();
      state.screen = "home";
      render();
      break;
    case "start-selection":
      state.selecting = true;
      state.selection = [];
      state.feedback = "";
      render();
      break;
    case "cancel-selection":
      state.selecting = false;
      state.selection = [];
      state.feedback = "";
      render();
      break;
    case "call-no-sets":
      callNoSets();
      break;
    case "next-round":
      nextRound();
      break;
    case "play-again":
      state.score = 0;
      state.roundsCompleted = 0;
      state.totalSetsFound = 0;
      beginRound(1);
      break;
    case "quit":
      quitGame();
      break;
    default:
      break;
  }
});

root.addEventListener("submit", (event) => {
  if (event.target.id !== "start-form") return;
  event.preventDefault();
  startGame();
});

root.addEventListener("input", (event) => {
  if (event.target.id === "player-name") {
    event.target.setCustomValidity("");
    state.playerName = event.target.value;
  }
});

render();
