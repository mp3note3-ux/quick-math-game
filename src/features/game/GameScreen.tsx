import { useEffect, useMemo, useRef, type CSSProperties, type Dispatch } from "react";
import { Header, type NavTarget } from "../../app/Header";
import { useI18n } from "../../app/I18nContext";
import { formatDelta } from "../../app/format";
import { RankBar, rankNameKey } from "../../app/RankBar";
import type { Card } from "../../domain/cards";
import {
  XP_PER_BOARD_CLEARED,
  XP_PER_LEVEL,
  xpForSets,
  type PersonalStats,
} from "../../domain/progression";
import {
  remainingCombinations,
  type FeedbackMessage,
  type SessionEvent,
  type SessionState,
} from "../../domain/session";
import type { CatalogKey } from "../../i18n/index";
import {
  ATTRIBUTE_NAME_KEYS,
  BACKGROUND_KEYS,
  SHAPE_CLASSES,
  SHAPE_COLOR_KEYS,
  SHAPE_KEYS,
  cardVisualStyle,
} from "./cardTheme";

interface GameScreenProps {
  state: SessionState;
  dispatch: Dispatch<SessionEvent>;
  playerName: string;
  /** Persistent mastery stats (already include checkpointed boards). */
  stats: PersonalStats;
  /** Rank id reached by the latest checkpoint, when it crossed a threshold. */
  rankUpId: string | null;
  onQuit: () => void;
  onHome: () => void;
  onNavigate: (target: NavTarget) => void;
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

  return (
    <button
      className={`game-card ${selected ? "is-selected" : ""}`}
      type="button"
      data-card-index={index}
      data-bg={card.b}
      aria-label={ariaLabel}
      aria-pressed={selected}
      disabled={disabled}
      style={cardVisualStyle(card) as CSSProperties}
      onClick={() => onToggle(index)}
    >
      <span className="card-number">{index + 1}</span>
      <span className="shape-wrap" aria-hidden="true">
        <span className={`card-shape ${SHAPE_CLASSES[card.s]!}`} />
      </span>
    </button>
  );
}

/** XP granted for one set of the given level (1-based), from the shared table. */
function xpForLevel(level: number): number {
  return XP_PER_LEVEL[level - 1] ?? XP_PER_LEVEL[0];
}

function feedbackText(
  t: (key: CatalogKey, variables?: Record<string, string | number>) => string,
  feedback: FeedbackMessage,
): string {
  switch (feedback.kind) {
    case "correct-set": {
      const level = feedback.level ?? 1;
      // Show both rewards together: match points AND mastery XP for the set.
      return t("feedbackCorrectXp", {
        level,
        delta: formatDelta(feedback.delta),
        xp: xpForLevel(level),
      });
    }
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
    case "reveal-remaining":
      return t("feedbackReveal", {
        count: feedback.remaining ?? 0,
        delta: formatDelta(feedback.delta),
      });
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
    case "reveal-remaining":
      return "warning";
    default:
      return "info";
  }
}

/**
 * Per-board XP breakdown shown when a board is cleared: each level's set
 * count × its XP, the clear bonus, and the total. All values come from the
 * shared progression constants so the panel cannot drift from the rules.
 */
function BoardXpBreakdown({ sets }: { sets: [number, number, number] }) {
  const { t } = useI18n();
  const rows = sets.map((count, index) => ({
    level: index + 1,
    count,
    xpEach: XP_PER_LEVEL[index]!,
    total: count * XP_PER_LEVEL[index]!,
  }));
  const total = xpForSets(sets) + XP_PER_BOARD_CLEARED;

  return (
    <div className="xp-breakdown">
      <h4>{t("xpBreakdownTitle")}</h4>
      <dl>
        {rows.map((row) => (
          <div className="xp-breakdown-row" key={row.level}>
            <dt>{t("masteryLevelLabel", { level: row.level })}</dt>
            <dd>
              {t("xpBreakdownLevel", {
                count: row.count,
                xp: row.xpEach,
                total: row.total,
              })}
            </dd>
          </div>
        ))}
        <div className="xp-breakdown-row">
          <dt>{t("xpBreakdownClearLabel")}</dt>
          <dd>{t("xpBreakdownClear", { xp: XP_PER_BOARD_CLEARED })}</dd>
        </div>
        <div className="xp-breakdown-row xp-breakdown-total">
          <dt>{t("xpBreakdownTotalLabel")}</dt>
          <dd>{t("xpBreakdownTotal", { xp: total })}</dd>
        </div>
      </dl>
    </div>
  );
}

export function GameScreen({
  state,
  dispatch,
  playerName,
  stats,
  rankUpId,
  onQuit,
  onHome,
  onNavigate,
}: GameScreenProps) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);

  const remaining = useMemo(() => remainingCombinations(state).length, [state]);
  const cardsDisabled = state.phase !== "playing" || !state.selecting;

  // XP earned on the current board so far (pending — saved only when the
  // board is completed; the +25 clear bonus is added at the checkpoint).
  const boardSets = state.roundSetCounts[state.round - 1] ?? ([0, 0, 0] as [number, number, number]);
  const boardXpPending = xpForSets(boardSets);

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

  const revealCost = formatDelta(state.config.revealRemainingCost);

  return (
    <div className="screen">
      <Header
        showQuit
        onQuit={onQuit}
        onHome={onHome}
        currentNav="play"
        onNavigate={onNavigate}
      />
      <main>
        <section className="hud window" aria-label={t("boardTitle")}>
          <HudCell value={t("roundLabel", { current: state.round, total: state.totalRounds })} className="hud-round" />
          <HudCell label={t("scoreLabel")} value={state.score} className="hud-score" />
          <HudCell label={t("foundSetsLabel")} value={state.foundKeys.length} />
          <HudCell
            label={t("remainingSetsLabel")}
            value={state.countRevealed ? remaining : t("remainingSetsHidden")}
            className="hud-remaining"
          />
          <HudCell label={t("playerNameLabel")} value={playerName} />
          <div className="hud-mastery">
            <RankBar xp={stats.xp} variant="compact" />
            <span className="xp-pending">{t("boardXpPending", { xp: boardXpPending })}</span>
          </div>
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
                  {rankUpId !== null ? (
                    <p className="rank-up" role="status">
                      {t("rankUpBody", { rank: t(rankNameKey(rankUpId)) })}
                    </p>
                  ) : null}
                  <BoardXpBreakdown sets={boardSets} />
                  <p className="xp-saved-note">{t("xpSavedNote")}</p>
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
                  className="button button-reveal"
                  type="button"
                  disabled={state.countRevealed || state.selecting}
                  onClick={() => dispatch({ type: "reveal-remaining" })}
                >
                  {state.countRevealed
                    ? t("revealRemainingUsed", { count: remaining })
                    : t("revealRemainingLabel", { cost: revealCost })}
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
