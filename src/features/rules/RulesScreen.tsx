import { useEffect, useRef, type CSSProperties } from "react";
import { Header, type NavTarget } from "../../app/Header";
import { useI18n } from "../../app/I18nContext";
import { formatDelta } from "../../app/format";
import { BOARD_SIZE, DECK_SIZE, type Card } from "../../domain/cards";
import { XP_PER_BOARD_CLEARED, XP_PER_LEVEL, MASTERY_RANKS } from "../../domain/progression";
import { rankNameKey } from "../../app/RankBar";
import type { ScoringConfig } from "../../domain/scoring";
import { SHAPE_CLASSES, cardVisualStyle } from "../game/cardTheme";

interface RulesScreenProps {
  /** Live scoring config — the Rules screen reads its numbers from here. */
  config: ScoringConfig;
  onNavigate: (target: NavTarget) => void;
  onHome: () => void;
}

/** Non-interactive mini card used in rule examples. */
function ExampleCard({ card }: { card: Card }) {
  return (
    <span
      className="game-card example-card"
      data-bg={card.b}
      style={cardVisualStyle(card) as CSSProperties}
      aria-hidden="true"
    >
      <span className="shape-wrap">
        <span className={`card-shape ${SHAPE_CLASSES[card.s]!}`} />
      </span>
    </span>
  );
}

/** A row of three example cards with a localized caption. */
function ExampleRow({ cards, caption }: { cards: [Card, Card, Card]; caption: string }) {
  return (
    <figure className="rule-example">
      <div className="rule-example-cards">
        {cards.map((card, index) => (
          <ExampleCard key={index} card={card} />
        ))}
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

/**
 * Full game rules: the goal, what makes a set, how turns work, the
 * remaining-count reveal, match scoring, and mastery XP. All numeric values
 * are sourced from the live scoring config and progression constants so this
 * screen cannot drift from actual gameplay.
 */
export function RulesScreen({ config, onNavigate, onHome }: RulesScreenProps) {
  const { t } = useI18n();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // A valid set: same shape; three different shape colors; three different
  // backgrounds (Level 2). An invalid triple: shape is 2+1 (mixed).
  const validExample: [Card, Card, Card] = [
    { s: 0, c: 0, b: 0 },
    { s: 0, c: 1, b: 1 },
    { s: 0, c: 2, b: 2 },
  ];
  const invalidExample: [Card, Card, Card] = [
    { s: 0, c: 0, b: 0 },
    { s: 0, c: 1, b: 1 },
    { s: 1, c: 2, b: 2 },
  ];

  const rankList = MASTERY_RANKS.map((rank) => ({
    name: t(rankNameKey(rank.id)),
    xp: rank.minXp,
  }));

  return (
    <div className="screen">
      <Header currentNav="rules" onNavigate={onNavigate} onHome={onHome} />
      <main className="rules-page">
        <h1 ref={headingRef} tabIndex={-1} className="page-heading">
          {t("rulesTitle")}
        </h1>

        <section className="window rule-section" aria-labelledby="rules-goal">
          <h2 className="window-title" id="rules-goal">
            {t("rulesGoalTitle")}
          </h2>
          <p>{t("rulesGoalBody", { deck: DECK_SIZE, board: BOARD_SIZE })}</p>
        </section>

        <section className="window rule-section" aria-labelledby="rules-set">
          <h2 className="window-title" id="rules-set">
            {t("rulesSetTitle")}
          </h2>
          <p>{t("rulesSetBody")}</p>
          <ExampleRow cards={validExample} caption={t("rulesSetExampleValid")} />
        </section>

        <section className="window rule-section" aria-labelledby="rules-not-set">
          <h2 className="window-title" id="rules-not-set">
            {t("rulesNotSetTitle")}
          </h2>
          <p>{t("rulesNotSetBody")}</p>
          <ExampleRow cards={invalidExample} caption={t("rulesSetExampleInvalid")} />
        </section>

        <section className="window rule-section" aria-labelledby="rules-turn">
          <h2 className="window-title" id="rules-turn">
            {t("rulesTurnTitle")}
          </h2>
          <p>{t("rulesTurnBody")}</p>
        </section>

        <section className="window rule-section" aria-labelledby="rules-reveal">
          <h2 className="window-title" id="rules-reveal">
            {t("rulesRevealTitle")}
          </h2>
          <p>
            {t("rulesRevealBody", { cost: formatDelta(config.revealRemainingCost) })}
          </p>
        </section>

        <section className="window rule-section" aria-labelledby="rules-scoring">
          <h2 className="window-title" id="rules-scoring">
            {t("rulesScoringTitle")}
          </h2>
          <ul className="rule-list">
            <li>
              {t("rulesScoringSet", {
                level: 1,
                delta: formatDelta(config.levelRewards[0]!),
              })}
            </li>
            <li>
              {t("rulesScoringSet", {
                level: 2,
                delta: formatDelta(config.levelRewards[1]!),
              })}
            </li>
            <li>
              {t("rulesScoringSet", {
                level: 3,
                delta: formatDelta(config.levelRewards[2]!),
              })}
            </li>
            <li>{t("rulesScoringWrongSet", { delta: formatDelta(config.wrongSetPenalty) })}</li>
            <li>
              {t("rulesScoringNoSetsWrong", { delta: formatDelta(config.wrongNoSetsPenalty) })}
            </li>
            <li>{t("rulesScoringNoSetsRight", { delta: formatDelta(config.noSetsBonus) })}</li>
            <li>{t("rulesScoringFloor")}</li>
          </ul>
        </section>

        <section className="window rule-section" aria-labelledby="rules-mastery">
          <h2 className="window-title" id="rules-mastery">
            {t("rulesMasteryTitle")}
          </h2>
          <p>
            {t("rulesMasteryBody", {
              xp1: XP_PER_LEVEL[0]!,
              xp2: XP_PER_LEVEL[1]!,
              xp3: XP_PER_LEVEL[2]!,
              clear: XP_PER_BOARD_CLEARED,
            })}
          </p>
          <ul className="rule-list rule-ranks">
            {rankList.map((rank) => (
              <li key={rank.name}>{t("rulesRankEntry", { rank: rank.name, xp: rank.xp })}</li>
            ))}
          </ul>
        </section>

        <section className="window rule-section" aria-labelledby="rules-privacy">
          <h2 className="window-title" id="rules-privacy">
            {t("rulesPrivacyTitle")}
          </h2>
          <p>{t("rulesPrivacyBody")}</p>
        </section>
      </main>
    </div>
  );
}
