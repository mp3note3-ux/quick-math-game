import { describe, expect, it } from "vitest";
import en from "./locales/en.json";
import ko from "./locales/ko.json";

const enKeys = Object.keys(en).sort();
const koKeys = Object.keys(ko).sort();

describe("locale catalogs", () => {
  it("English and Korean expose exactly the same keys", () => {
    expect(koKeys).toEqual(enKeys);
  });

  it("English is the default-language catalog and stays in English", () => {
    // Regression guard: the catalogs were once swapped, making the app
    // default to Korean. Spot-check a few unmistakable strings.
    expect(en.appName).toBe("Combination Game");
    expect(en.startSinglePlayer).toBe("Play solo");
    expect(ko.appName).toBe("결합 카드 게임");
    expect(ko.startSinglePlayer).toBe("혼자 플레이");
  });

  it("has no empty translations", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(String(value).trim().length, `en.${key}`).toBeGreaterThan(0);
    }
    for (const [key, value] of Object.entries(ko)) {
      expect(String(value).trim().length, `ko.${key}`).toBeGreaterThan(0);
    }
  });

  it("uses the same placeholders in both catalogs", () => {
    const placeholders = (text: string) =>
      [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const key of enKeys) {
      const enTemplate = en[key as keyof typeof en];
      const koTemplate = ko[key as keyof typeof ko];
      expect(placeholders(koTemplate), `placeholder mismatch for "${key}"`).toEqual(
        placeholders(enTemplate),
      );
    }
  });
});
