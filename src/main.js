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

function header({ showQuit = false } = {}) {
  return `
    <header class="topbar">
      <a class="brand" href="#" data-action="home" aria-label="${t("appName")} ${t("home")}">
        <span class="brand-mark" aria-hidden="true">✦</span>
        <span>${t("appName")}</span>
      </a>
      <div class="topbar-actions">
        ${languageSwitcher()}
        ${showQuit ? `<button class="button button-quiet button-small" type="button" data-action="quit">${t("quit")}</button>` : ""}
      </div>
    </header>
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
  return `
    <div class="page-shell">
      ${header()}
      <main>
        <section class="hero">
          <p class="eyebrow">${t("homeEyebrow")}</p>
          <h1>${t("homeTitle")}</h1>
          <p class="hero-copy">${t("homeSubtitle")}</p>
        </section>

        <section class="mode-grid" aria-label="${t("appName")}">
          <article class="mode-card mode-card-featured">
            <div class="mode-icon" aria-hidden="true">✦</div>
            <div>
              <p class="card-kicker">${t("singlePlayerTitle")}</p>
              <h2>${t("singlePlayerTitle")}</h2>
              <p class="muted-copy">${t("singlePlayerDescription")}</p>
            </div>
            <form id="start-form" class="start-form">
              <label for="player-name">${t("playerNameLabel")}</label>
              <input id="player-name" name="playerName" maxlength="18" autocomplete="nickname"
                placeholder="${t("playerNamePlaceholder")}" value="${escapeHtml(state.playerName)}" required />
              <button class="button button-primary button-wide" type="submit">
                ${t("startSinglePlayer")} <span aria-hidden="true">→</span>
              </button>
            </form>
          </article>

          <article class="mode-card mode-card-muted">
            <div class="mode-icon mode-icon-muted" aria-hidden="true">◎</div>
            <div class="mode-heading-row">
              <div>
                <p class="card-kicker">${t("multiplayerTitle")}</p>
                <h2>${t("multiplayerTitle")}</h2>
              </div>
              <span class="status-pill">${t("comingSoon")}</span>
            </div>
            <p class="muted-copy">${t("multiplayerDescription")}</p>
            <p class="notice-copy">${t("multiplayerNotReady")}</p>
            <button class="button button-disabled button-wide" type="button" disabled>
              ${t("multiplayerTitle")}
            </button>
          </article>
        </section>

        <section class="how-to panel">
          <div class="section-heading">
            <p class="eyebrow">${t("howToTitle")}</p>
            <h2>${t("howToTitle")}</h2>
          </div>
          <div class="steps-grid">
            <article class="step">
              <span class="step-number">01</span>
              <h3>${t("howToStepOneTitle")}</h3>
              <p>${t("howToStepOneBody")}</p>
            </article>
            <article class="step">
              <span class="step-number">02</span>
              <h3>${t("howToStepTwoTitle")}</h3>
              <p>${t("howToStepTwoBody")}</p>
            </article>
            <article class="step">
              <span class="step-number">03</span>
              <h3>${t("howToStepThreeTitle")}</h3>
              <p>${t("howToStepThreeBody")}</p>
            </article>
          </div>
          <div class="rule-note">
            <span aria-hidden="true">ⓘ</span>
            <div>
              <strong>${t("ruleExampleTitle")}</strong>
              <p>${t("ruleExampleBody")}</p>
            </div>
          </div>
        </section>
      </main>
      <footer class="site-footer">${t("footerNote")}</footer>
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
      <span class="card-shape ${shapeKey.replace("shape", "").toLowerCase()}" aria-hidden="true"></span>
    </button>
  `;
}

function foundMarkup() {
  if (state.found.size === 0) return `<p class="empty-state">${t("foundNone")}</p>`;
  return [...state.found].map((key) => `
    <span class="found-chip">[ ${key.split(",").map((index) => Number(index) + 1).join(", ")} ]</span>
  `).join("");
}

function renderGame() {
  const remaining = remainingCombinations().length;
  const selectionMessage = state.selecting
    ? t("selectionProgress", { count: state.selection.length })
    : t("selectionReady");

  return `
    <div class="page-shell page-shell-game">
      ${header({ showQuit: true })}
      <main class="game-main">
        <section class="game-heading">
          <div>
            <p class="eyebrow">${t("boardTitle")}</p>
            <h1>${t("roundLabel", { current: state.round, total: TOTAL_ROUNDS })}</h1>
          </div>
          <div class="score-display">
            <span>${t("scoreLabel")}</span>
            <strong>${state.score}</strong>
            <small>${t("pointsLabel")}</small>
          </div>
        </section>

        <section class="game-stats" aria-label="${t("boardTitle")}">
          <div class="stat-card">
            <span>${t("foundSetsLabel")}</span>
            <strong>${state.found.size}</strong>
          </div>
          <div class="stat-card">
            <span>${t("remainingSetsLabel")}</span>
            <strong>${remaining}</strong>
          </div>
          <div class="stat-card stat-player">
            <span>${t("playerNameLabel")}</span>
            <strong>${escapeHtml(state.playerName)}</strong>
          </div>
        </section>

        <section class="play-layout">
          <div class="board-panel panel">
            <div class="board-header">
              <div>
                <h2>${t("boardTitle")}</h2>
                <p>${t("boardInstruction")}</p>
              </div>
              <span class="round-badge">${state.round} / ${TOTAL_ROUNDS}</span>
            </div>

            <div class="card-grid" aria-label="${t("boardTitle")}">
              ${state.board.map(cardMarkup).join("")}
            </div>

            <div class="selection-status" aria-live="polite">${selectionMessage}</div>

            <div class="game-controls">
              <button class="button button-primary" type="button" data-action="start-selection"
                ${state.selecting || state.roundComplete ? "disabled" : ""}>
                ${t("callSet")}
              </button>
              <button class="button button-secondary" type="button" data-action="cancel-selection"
                ${!state.selecting || state.roundComplete ? "disabled" : ""}>
                ${t("cancelSelection")}
              </button>
              <button class="button button-danger" type="button" data-action="call-no-sets"
                ${state.roundComplete ? "disabled" : ""}>
                ${t("callNoSets")}
              </button>
            </div>

            ${state.feedback ? `<p class="feedback feedback-${state.feedbackType}" role="status">${state.feedback}</p>` : ""}

            ${state.roundComplete ? `
              <div class="round-complete">
                <div>
                  <h3>${t("roundCompleteTitle")}</h3>
                  <p>${t("roundCompleteBody")}</p>
                </div>
                <button class="button button-primary" type="button" data-action="next-round">
                  ${state.round === TOTAL_ROUNDS ? t("finishGame") : t("nextRound")} →
                </button>
              </div>
            ` : ""}
          </div>

          <aside class="found-panel panel">
            <div class="found-heading">
              <h2>${t("foundSetsLabel")}</h2>
              <span class="count-badge">${state.found.size}</span>
            </div>
            <div class="found-list">${foundMarkup()}</div>
            <div class="found-summary">
              <span>${t("remainingSetsLabel")}</span>
              <strong>${remaining}</strong>
            </div>
          </aside>
        </section>
      </main>
      <footer class="site-footer">${t("footerNote")}</footer>
    </div>
  `;
}

function renderResults() {
  return `
    <div class="page-shell">
      ${header()}
      <main class="results-main panel">
        <div class="results-icon" aria-hidden="true">✦</div>
        <p class="eyebrow">${t("resultsTitle")}</p>
        <h1>${t("resultsSubtitle", { name: escapeHtml(state.playerName) })}</h1>
        <div class="final-score">
          <span>${t("finalScore")}</span>
          <strong>${state.score}</strong>
          <small>${t("pointsLabel")}</small>
        </div>
        <div class="results-stats">
          <div class="stat-card">
            <span>${t("roundsCompleted")}</span>
            <strong>${state.roundsCompleted} / ${TOTAL_ROUNDS}</strong>
          </div>
          <div class="stat-card">
            <span>${t("totalSetsFound")}</span>
            <strong>${state.totalSetsFound}</strong>
          </div>
        </div>
        <div class="results-actions">
          <button class="button button-primary" type="button" data-action="play-again">${t("playAgain")}</button>
          <button class="button button-secondary" type="button" data-action="home">${t("returnHome")}</button>
        </div>
      </main>
      <footer class="site-footer">${t("footerNote")}</footer>
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
