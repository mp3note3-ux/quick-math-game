import { describe, expect, it } from "vitest";
import { runSimulation } from "./run";

// A smaller board count keeps the guard fast while still smoothing variance.
const BOARDS = 2_000;

describe("scoring simulation fairness guards", () => {
  const result = runSimulation(BOARDS);

  // The shipped live config is the level-weighted, floored scenario.
  const SHIPPED = "levels [1,2,3] (shipped) · floor 0";

  it("idle play earns exactly nothing under the shipped live config", () => {
    const idle = result.summaries.find((s) => s.bot === "idle" && s.scenario === SHIPPED);
    expect(idle).toBeDefined();
    expect(idle!.mean).toBe(0);
    expect(idle!.pctZero).toBe(100);
  });

  it("engaged play beats inactivity on average under the shipped live config", () => {
    const idle = result.summaries.find((s) => s.bot === "idle" && s.scenario === SHIPPED)!;
    const realistic = result.summaries.find(
      (s) => s.bot === "realistic" && s.scenario === SHIPPED,
    )!;
    expect(realistic.mean).toBeGreaterThan(idle.mean);
  });

  it("skilled play beats realistic play on average (skill is rewarded)", () => {
    const realistic = result.summaries.find(
      (s) => s.bot === "realistic" && s.scenario === SHIPPED,
    )!;
    const perfect = result.summaries.find((s) => s.bot === "perfect" && s.scenario === SHIPPED)!;
    expect(perfect.mean).toBeGreaterThan(realistic.mean);
  });

  it("the zero floor keeps even careless play from going negative", () => {
    const random = result.summaries.find(
      (s) => s.bot === "random-guesser" && s.scenario === SHIPPED,
    )!;
    expect(random.pctNegative).toBe(0);
  });

  it("the perfect player clears every board (simulation sanity check)", () => {
    const perfect = result.summaries.find((s) => s.bot === "perfect")!;
    expect(perfect.clearRate).toBe(100);
  });
});
