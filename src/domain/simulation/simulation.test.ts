import { describe, expect, it } from "vitest";
import { runSimulation } from "./run";

// A smaller board count keeps the guard fast while still smoothing variance.
const BOARDS = 2_000;

describe("scoring simulation fairness guards", () => {
  const result = runSimulation(BOARDS);

  it("idle play earns exactly nothing under the shipped default config", () => {
    const idle = result.summaries.find(
      (s) => s.bot === "idle" && s.scenario.includes("flat [1,1,1]") && s.scenario.includes("no floor"),
    );
    expect(idle).toBeDefined();
    expect(idle!.mean).toBe(0);
    expect(idle!.pctZero).toBe(100);
  });

  it("engaged play beats inactivity on average under the default config", () => {
    const idle = result.summaries.find(
      (s) => s.bot === "idle" && s.scenario.includes("flat [1,1,1]") && s.scenario.includes("no floor"),
    )!;
    const realistic = result.summaries.find(
      (s) => s.bot === "realistic" && s.scenario === idle.scenario,
    )!;
    expect(realistic.mean).toBeGreaterThan(idle.mean);
  });

  it("skilled play beats realistic play on average (skill is rewarded)", () => {
    const realistic = result.summaries.find(
      (s) => s.bot === "realistic" && s.scenario.includes("flat [1,1,1]") && s.scenario.includes("no floor"),
    )!;
    const perfect = result.summaries.find(
      (s) => s.bot === "perfect" && s.scenario === realistic.scenario,
    )!;
    expect(perfect.mean).toBeGreaterThan(realistic.mean);
  });

  it("the perfect player clears every board (simulation sanity check)", () => {
    const perfect = result.summaries.find((s) => s.bot === "perfect")!;
    expect(perfect.clearRate).toBe(100);
  });
});
