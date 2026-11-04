/**
 * Scoring simulation runner (Node-only). Usage: `npm run simulate`.
 *
 * Sweeps candidate scoring configs x player strategies over the SAME seeded
 * boards (paired comparison) and writes a Markdown report to
 * docs/scoring-simulation.md for the owner's scoring decision.
 *
 * This does NOT lock any values — it produces evidence for the open
 * decisions listed in GAME_DESIGN_IMPROVEMENT.md §10.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createBoard, type Card } from "../cards";
import { mulberry32 } from "../rng";
import { DEFAULT_SCORING_CONFIG, type ScoringConfig } from "../scoring";
import { ALL_BOTS, DEFAULT_BOT_PARAMS, type BotParams, type RoundTrace } from "./strategies";

const BOARD_COUNT = 10_000;
const BOARD_SEED_BASE = 1_000_000;
const BOT_SEED_BASE = 2_000_000;

interface Scenario {
  name: string;
  config: ScoringConfig;
}

function scenarios(): Scenario[] {
  const base = DEFAULT_SCORING_CONFIG;
  const rewardModels = [
    ["flat [1,1,1] (current)", [1, 1, 1]],
    ["levels [1,2,3]", [1, 2, 3]],
    ["levels [1,2,4]", [1, 2, 4]],
  ] as const;
  const list: Scenario[] = [];
  for (const [name, levelRewards] of rewardModels) {
    list.push({ name: `${name} · no floor`, config: { ...base, levelRewards } });
    list.push({ name: `${name} · floor 0`, config: { ...base, levelRewards, scoreFloor: 0 } });
  }
  return list;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index]!;
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

interface Summary {
  scenario: string;
  bot: string;
  mean: number;
  median: number;
  p05: number;
  p95: number;
  pctNegative: number;
  pctZero: number;
  clearRate: number;
  meanActions: number;
  meanWrong: number;
}

function summarize(scenario: string, traces: RoundTrace[]): Summary {
  const scores = traces.map((t) => t.finalScore).sort((a, b) => a - b);
  return {
    scenario,
    bot: traces[0]?.bot ?? "?",
    mean: mean(scores),
    median: percentile(scores, 50),
    p05: percentile(scores, 5),
    p95: percentile(scores, 95),
    pctNegative: (scores.filter((s) => s < 0).length / scores.length) * 100,
    pctZero: (scores.filter((s) => s === 0).length / scores.length) * 100,
    clearRate: (traces.filter((t) => t.roundCleared).length / traces.length) * 100,
    meanActions: mean(traces.map((t) => t.actions)),
    meanWrong: mean(traces.map((t) => t.wrongSubmissions)),
  };
}

function fmt(value: number, digits = 2): string {
  return value.toFixed(digits);
}

export interface SimulationResult {
  summaries: Summary[];
  /** Per scenario: share of boards where the realistic bot ends negative. */
  realisticNegativeRate: Map<string, number>;
  /** Per scenario: share of boards where the random guesser beats the realistic bot. */
  randomBeatsRealisticRate: Map<string, number>;
  boardStats: {
    setCountHistogram: Map<number, number>;
    levelHistogram: Map<number, number>;
    boardsWithNoSets: number;
  };
}

export function runSimulation(
  boardCount = BOARD_COUNT,
  params: BotParams = DEFAULT_BOT_PARAMS,
): SimulationResult {
  const boards: Card[][] = [];
  for (let i = 0; i < boardCount; i += 1) {
    boards.push(createBoard(mulberry32(BOARD_SEED_BASE + i)));
  }

  // Config-independent board statistics.
  const setCountHistogram = new Map<number, number>();
  const levelHistogram = new Map<number, number>();
  let boardsWithNoSets = 0;
  {
    const probe = scenarios()[0]!;
    const perfect = ALL_BOTS.find((bot) => bot.name === "perfect")!;
    for (const board of boards) {
      const trace = perfect.playRound(board, mulberry32(0), probe.config, params);
      setCountHistogram.set(trace.setCount, (setCountHistogram.get(trace.setCount) ?? 0) + 1);
      if (trace.setCount === 0) boardsWithNoSets += 1;
      for (const level of trace.setLevels) {
        levelHistogram.set(level, (levelHistogram.get(level) ?? 0) + 1);
      }
    }
  }

  const summaries: Summary[] = [];
  const realisticNegativeRate = new Map<string, number>();
  const randomBeatsRealisticRate = new Map<string, number>();

  // Pre-generate per-board bot randomness so every (scenario, bot) cell runs
  // on the SAME boards with the SAME bot decisions (paired comparison).
  const botRandoms = boards.map((_, i) => mulberry32(BOT_SEED_BASE + i));

  for (const scenario of scenarios()) {
    const tracesByBot = new Map<string, RoundTrace[]>();
    for (const bot of ALL_BOTS) tracesByBot.set(bot.name, []);

    for (let i = 0; i < boards.length; i += 1) {
      const board = boards[i]!;
      for (const bot of ALL_BOTS) {
        const trace = bot.playRound(board, botRandoms[i]!, scenario.config, params);
        tracesByBot.get(bot.name)!.push(trace);
      }
    }

    for (const bot of ALL_BOTS) {
      summaries.push(summarize(scenario.name, tracesByBot.get(bot.name)!));
    }

    const realistic = tracesByBot.get("realistic")!;
    const random = tracesByBot.get("random-guesser")!;
    realisticNegativeRate.set(
      scenario.name,
      (realistic.filter((t) => t.finalScore < 0).length / realistic.length) * 100,
    );
    let randomWins = 0;
    for (let i = 0; i < realistic.length; i += 1) {
      if (random[i]!.finalScore > realistic[i]!.finalScore) randomWins += 1;
    }
    randomBeatsRealisticRate.set(scenario.name, (randomWins / realistic.length) * 100);
  }

  return {
    summaries,
    realisticNegativeRate,
    randomBeatsRealisticRate,
    boardStats: { setCountHistogram, levelHistogram, boardsWithNoSets },
  };
}

function renderMarkdown(result: SimulationResult, boardCount: number, params: BotParams): string {
  const lines: string[] = [];
  lines.push("# Scoring simulation report", "");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Boards per (config × strategy): ${boardCount} (same seeded boards across all cells).`);
  lines.push(
    `Bot params: realistic find rate ${params.realisticFindRate}, fumble rate ${params.realisticFumbleRate}, action budget ${params.actionBudget}, random declare rate ${params.randomDeclareRate}.`,
  );
  lines.push("");
  lines.push("This report is evidence for the open scoring decisions in");
  lines.push("`GAME_DESIGN_IMPROVEMENT.md` §10. It does not lock any values.");
  lines.push("");

  lines.push("## Board statistics (config-independent)", "");
  lines.push("| Sets on board | Boards | Share |");
  lines.push("|---|---|---|");
  const totalBoards = [...result.boardStats.setCountHistogram.values()].reduce((a, b) => a + b, 0);
  for (const [count, boards] of [...result.boardStats.setCountHistogram.entries()].sort((a, b) => a[0] - b[0])) {
    lines.push(`| ${count} | ${boards} | ${fmt((boards / totalBoards) * 100, 1)}% |`);
  }
  lines.push("");
  const totalSets = [...result.boardStats.levelHistogram.values()].reduce((a, b) => a + b, 0);
  lines.push("| Set level | Count | Share of all sets |");
  lines.push("|---|---|---|");
  for (const [level, count] of [...result.boardStats.levelHistogram.entries()].sort((a, b) => a[0] - b[0])) {
    lines.push(`| ${level} | ${count} | ${fmt((count / totalSets) * 100, 1)}% |`);
  }
  lines.push("");
  lines.push(
    `Boards with zero valid sets: ${result.boardStats.boardsWithNoSets} (${fmt((result.boardStats.boardsWithNoSets / totalBoards) * 100, 2)}%).`,
  );
  lines.push("");

  lines.push("## Score by config × strategy (single board)", "");
  lines.push("| Config | Bot | Mean | Median | p05 | p95 | % < 0 | % = 0 | Clear rate | Mean wrong |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|");
  for (const s of result.summaries) {
    lines.push(
      `| ${s.scenario} | ${s.bot} | ${fmt(s.mean)} | ${fmt(s.median, 0)} | ${fmt(s.p05, 0)} | ${fmt(s.p95, 0)} | ${fmt(s.pctNegative, 1)}% | ${fmt(s.pctZero, 1)}% | ${fmt(s.clearRate, 1)}% | ${fmt(s.meanWrong)} |`,
    );
  }
  lines.push("");

  lines.push("## Fairness checks", "");
  lines.push(
    "The design brief's core exploit: with +1/−1 scoring, a cautious player may rationally do",
    "nothing (score 0). The table shows how often that beats an engaged player, and how often",
    "blind guessing beats engaged play.",
    "",
  );
  lines.push("| Config | Realistic ends < 0 (idle beats them) | Random guesser beats realistic |");
  lines.push("|---|---|---|");
  for (const [name, rate] of result.realisticNegativeRate.entries()) {
    lines.push(`| ${name} | ${fmt(rate, 2)}% | ${fmt(result.randomBeatsRealisticRate.get(name) ?? 0, 2)}% |`);
  }
  lines.push("");
  lines.push("Notes for the decision:", "");
  lines.push("- `idle` always scores exactly 0: inactivity earns nothing under every config.");
  lines.push("- A floor of 0 removes negative finishes but makes idle and unlucky players indistinguishable;");
  lines.push("  the eligibility rule (min verified sets) is what separates them for ranking.");
  lines.push("- Level-weighted rewards raise the ceiling for engaged play; check the gap between");
  lines.push("  `perfect` and `realistic` means to judge reward inflation versus the flat model.");
  lines.push("");
  return lines.join("\n");
}

/* c8 ignore start -- CLI entry point */
function isMainModule(): boolean {
  return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];
}

if (isMainModule()) {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, "..", "..", "..");
  const result = runSimulation();
  const markdown = renderMarkdown(result, BOARD_COUNT, DEFAULT_BOT_PARAMS);
  const outDir = join(repoRoot, "docs");
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, "scoring-simulation.md");
  writeFileSync(outFile, markdown, "utf8");
  console.log(`Wrote ${outFile}`);
  for (const summary of result.summaries) {
    console.log(
      `${summary.scenario} | ${summary.bot}: mean ${fmt(summary.mean)}, clear ${fmt(summary.clearRate, 1)}%`,
    );
  }
}
/* c8 ignore stop */
