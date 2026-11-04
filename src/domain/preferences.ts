/**
 * Player preferences. Pure: no React, DOM, storage, or network.
 *
 * These are presentation/comfort settings only. They NEVER alter match
 * score, XP, or ranking eligibility — they change how the game looks and
 * moves, not how it is scored. Validation lives here (pure), persistence in
 * the storage layer, and application (CSS classes) in the app shell.
 */

export type ThemePreference = "classic" | "high-contrast";
export type SizePreference = "small" | "standard" | "large";
export type ReducedMotionPreference = "system" | "on" | "off";

export interface Preferences {
  /** Visual theme. "classic" is the 16-bit default; "high-contrast" maximizes legibility. */
  theme: ThemePreference;
  /** Card size on the board. */
  cardSize: SizePreference;
  /** Overall UI/text scale. */
  uiScale: SizePreference;
  /** CRT scanline overlay. */
  scanlines: boolean;
  /** Motion: follow the OS setting, or force reduced/full motion. */
  reducedMotion: ReducedMotionPreference;
  /** Extra-strong focus and selection outlines. */
  strongFocus: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "classic",
  cardSize: "standard",
  uiScale: "standard",
  scanlines: true,
  reducedMotion: "system",
  strongFocus: false,
};

const THEME_VALUES: readonly ThemePreference[] = ["classic", "high-contrast"];
const SIZE_VALUES: readonly SizePreference[] = ["small", "standard", "large"];
const MOTION_VALUES: readonly ReducedMotionPreference[] = ["system", "on", "off"];

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/**
 * Validates an untrusted preferences object (e.g. parsed from storage) and
 * returns a fully-populated Preferences with safe defaults for anything
 * missing or invalid. Never returns null — preferences are cosmetic, so a
 * bad value must not break the app or cost the player their mastery data.
 */
export function validatePreferences(raw: unknown): Preferences {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ...DEFAULT_PREFERENCES };
  }
  const record = raw as Record<string, unknown>;
  return {
    theme: pick(record.theme, THEME_VALUES, DEFAULT_PREFERENCES.theme),
    cardSize: pick(record.cardSize, SIZE_VALUES, DEFAULT_PREFERENCES.cardSize),
    uiScale: pick(record.uiScale, SIZE_VALUES, DEFAULT_PREFERENCES.uiScale),
    scanlines:
      typeof record.scanlines === "boolean" ? record.scanlines : DEFAULT_PREFERENCES.scanlines,
    reducedMotion: pick(record.reducedMotion, MOTION_VALUES, DEFAULT_PREFERENCES.reducedMotion),
    strongFocus:
      typeof record.strongFocus === "boolean" ? record.strongFocus : DEFAULT_PREFERENCES.strongFocus,
  };
}
