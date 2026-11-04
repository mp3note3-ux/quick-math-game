import { useEffect, useMemo, useRef, type CSSProperties, type Dispatch } from "react";
import { Header } from "../../app/Header";
import { useI18n } from "../../app/I18nContext";
import { formatDelta } from "../../app/format";
import type { AttributeKey, Card } from "../../domain/cards";
import { xpForSets, XP_PER_BOARD_CLEARED } from "../../domain/progression";
import {
  remainingCombinations,
  type FeedbackMessage,
  type SessionEvent,
  type SessionState,
} from "../../domain/session";
import type { CatalogKey } from "../../i18n/index";

const SHAPE_CLASSES = ["circle", "triangle", "square"] as const;
const SHAPE_KEYS: readonly CatalogKey[] = ["shapeCircle", "shapeTriangle", "shapeSquare"];
const SHAPE_COLORS = ["#F07872", "#62A9E8", "#F0C75E"] as const;
const SHAPE_COLOR_KEYS: readonly CatalogKey[] = ["colorCoral", "colorBlue", "colorYellow"];
const BACKGROUNDS = ["#F5F7FB", "#A8B4C5", "#343C4B"] as const;
const BACKGROUND_KEYS: readonly CatalogKey[] = ["backgroundLight", "backgroundSlate", "backgroundDark"];

const ATTRIBUTE_NAME_KEYS: Record<AttributeKey, CatalogKey> = {
  s: "attributeShape",
  c: "attributeShapeColor",
  b: "attributeBackground",
};

interface GameScreenProps {
  state: SessionState;
  dispatch: Dispatch<SessionEvent>;
  playerName: string;
  onQuit: () => void;
  onHome: () => void;
}

function HudCell({ label, value, className = "" }: { label?: string; value: string | number; className?: string }) {
  return (
    <div className={`hud-cell ${className}`}>
      {label ? <span className="hud-label">{label}</span> : null}
      <strong className="hud-value">{value}</strong>
    </div>
  );
}

function GameCard({
  card,
  index,
  selected,
  disabled,
  onToggle,
}: {
  card: Card;
  index: number;
  selected: boolean;
  disabled: boolean;
  onToggle: (index: number) => void;
}) {
  const { t } = useI18n();
  const ariaLabel = t("cardAriaLabel", {
    number: index + 1,
    shape: t(SHAPE_KEYS[card.s]!),
    shapeColor: t(SHAPE_COLOR_KEYS[card.c]!),
    background: t(BACKGROUND_KEYS[card.b]!),
  });
  const style = {
    "--card-background": BACKGROUNDS[card.b],
    "--shape-color": SHAPE_COLORS[card.c],
  } as CSSProperties;

  return (
    <button
      className={`game-card ${selected ? "is-selected" : ""}`}
      type="button"
      data-card-index={index}
      data-bg={card.b}
      aria-label={ariaLabel}
      aria-pressed={selected}
      disabled={disabled}
      style={style}
      onClick={() => onToggle(index)}
    >
      <span className="card-number">{index + 1}</span>
      <span className="shape-wrap" aria-hidden="true">
        <span className={`card-shape ${SHAPE_CLASSES[card.s]!}`} />
      </span>
    </button>
  );
}

function feedbackText(
  t: (key: CatalogKey, variables?: Record<string, string | number>) => string,
  feedback: FeedbackMessage,
): string {
  switch (feedback.kind) {
    case "correct-set":
      return t("feedbackCorrect", { level: feedback.level ?? 1, delta: formatDelta(feedback.delta) });
    case "wrong-set": {
      const mixed = feedback.mixed ?? [];
      if (mixed.length > 0) {
        const reasons = mixed
          .map((entry) =>
            t("mixedAttributePattern", { attribute: t(ATTRIBUTE_NAME_KEYS[entry.attribute]) }),
          )
          .join(" · ");
        return t("feedbackWrongReason", { reasons, delta: formatDelta(feedback.delta) });
      }
      return t("feedbackWrong", { delta: formatDelta(feedback.delta) });
    }
    case "duplicate-set":
      return t("feedbackDuplicate");
    case "no-sets-wrong":
      return t("feedbackSetsRemain", {
        count: feedback.remaining ?? 0,
        delta: formatDelta(feedback.delta),
      });
    case "no-sets-correct":
      return t("feedbackRoundComplete", { delta: formatDelta(feedback.delta) });
    case "need-three":
      return t("feedbackNeedThree");
  }
}

function dialogKind(state: SessionState): "info" | "success" | "error" | "warning" {
  if (state.selecting || state.feedback === null) return "info";
  switch (state.feedback.kind) {
    case "correct-set":
    case "no-sets-correct":
      return "success";
    case "wrong-set":
    case "no-sets-wrong":
      return "error";
    case "need-three":
      return "warning";
    default:
      return "info";
  }
}

export function GameScreen({ state, dispatch, playerName, onQuit, onHome }: GameScreenProps) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);

  const remaining = useMemo(() => remainingCombinations(state).length, [state]);
  const cardsDisabled = state.phase !== "playing" || !state.selecting;

  // XP earned on the board just cleared (shown on the round-complete panel).
  const roundSets = state.roundSetCounts[state.round - 1] ?? ([0, 0, 0] as [number, number, number]);
  const roundXp = xpForSets(roundSets) + XP_PER_BOARD_CLEARED;

  // Focus the dialogue box when a new round starts so keyboard and
  // screen-reader users land on the current prompt.
  useEffect(() => {
    dialogRef.current?.focus();
  }, [state.round]);

  const dialogText = state.selecting
    ? t("selectionProgress", { count: state.selection.length })
    : state.feedback !== null
      ? feedbackText(t, state.feedback)
      : t("boardInstruction");

  return (
    <div className="screen">
      <Header showQuit onQuit={onQuit} onHome={onHome} />
      <main>
        <section className="hud window" aria-label={t("boardTitle")}>
          <HudCell value={t("roundLabel", { current: state.round, total: state.totalRounds })} className="hud-round" />
          <HudCell label={t("scoreLabel")} value={state.score} className="hud-score" />
          <HudCell label={t("foundSetsLabel")} value={state.foundKeys.length} />
          <HudCell label={t("remainingSetsLabel")} value={remaining} />
          <HudCell label={t("playerNameLabel")} value={playerName} />
        </section>

        <div className="play-layout">
          <section className="window" aria-label={t("boardTitle")}>
            <div className="card-grid">
              {state.board.map((card, index) => (
                <GameCard
                  key={`${card.s}-${card.c}-${card.b}`}
                  card={card}
                  index={index}
                  selected={state.selection.includes(index)}
                  disabled={cardsDisabled}
                  onToggle={(cardIndex) => dispatch({ type: "toggle-card", index: cardIndex })}
                />
              ))}
            </div>

            <div
              className={`dialog dialog-${dialogKind(state)}`}
              role="status"
              aria-live="polite"
              tabIndex={-1}
              ref={dialogRef}
            >
              {dialogText}
            </div>

            {state.phase === "round-complete" ? (
              <div className="round-complete">
                <div>
                  <h3>{t("roundCompleteTitle")}</h3>
                  <p>{t("roundCompleteBody")}</p>
                  <p className="xp-line">{t("xpEarnedThisBoard", { xp: roundXp })}</p>
                </div>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => dispatch({ type: "next-round" })}
                >
                  {state.round === state.totalRounds ? t("finishGame") : t("nextRound")}
                </button>
              </div>
            ) : (
              <div className="game-controls">
                <button
                  className={`button button-primary ${state.selecting ? "" : "is-blink"}`}
                  type="button"
                  disabled={state.selecting}
                  onClick={() => dispatch({ type: "start-selection" })}
                >
                  {t("callSet")}
                </button>
                <button
                  className="button"
                  type="button"
                  disabled={!state.selecting}
                  onClick={() => dispatch({ type: "cancel-selection" })}
                >
                  {t("cancelSelection")}
                </button>
                <button
                  className="button button-danger"
                  type="button"
                  onClick={() => dispatch({ type: "declare-no-sets" })}
                >
                  {t("callNoSets")}
                </button>
              </div>
            )}
          </section>

          <aside className="window" aria-label={t("foundSetsLabel")}>
            <h2 className="window-title">{t("foundSetsLabel")}</h2>
            <div className="found-list">
              {state.foundKeys.length === 0 ? (
                <p className="empty-state">{t("foundNone")}</p>
              ) : (
                state.foundKeys.map((key) => (
                  <span className="found-chip" key={key}>
                    {key
                      .split(",")
                      .map((index) => Number(index) + 1)
                      .join("-")}
                  </span>
                ))
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
