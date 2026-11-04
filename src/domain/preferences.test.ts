import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, validatePreferences } from "./preferences";

describe("validatePreferences", () => {
  it("returns defaults for non-objects", () => {
    expect(validatePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(validatePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
    expect(validatePreferences("theme")).toEqual(DEFAULT_PREFERENCES);
    expect(validatePreferences(42)).toEqual(DEFAULT_PREFERENCES);
    expect(validatePreferences([1, 2, 3])).toEqual(DEFAULT_PREFERENCES);
  });

  it("returns defaults for an empty object", () => {
    expect(validatePreferences({})).toEqual(DEFAULT_PREFERENCES);
  });

  it("keeps valid values", () => {
    expect(
      validatePreferences({
        theme: "high-contrast",
        cardSize: "large",
        uiScale: "small",
        scanlines: false,
        reducedMotion: "on",
        strongFocus: true,
      }),
    ).toEqual({
      theme: "high-contrast",
      cardSize: "large",
      uiScale: "small",
      scanlines: false,
      reducedMotion: "on",
      strongFocus: true,
    });
  });

  it("falls back per-field for invalid values", () => {
    const result = validatePreferences({
      theme: "neon",
      cardSize: "giant",
      uiScale: "tiny",
      scanlines: "yes",
      reducedMotion: "sometimes",
      strongFocus: "no",
    });
    expect(result).toEqual(DEFAULT_PREFERENCES);
  });

  it("mixes valid and invalid fields independently", () => {
    const result = validatePreferences({ theme: "high-contrast", cardSize: "huge" });
    expect(result.theme).toBe("high-contrast");
    expect(result.cardSize).toBe(DEFAULT_PREFERENCES.cardSize);
  });
});
