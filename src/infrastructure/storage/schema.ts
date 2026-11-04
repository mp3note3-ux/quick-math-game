/**
 * Stored profile schema and validation. Hand-rolled validators (no schema
 * dependency): the profile is small, and invalid data must never crash the
 * app — it falls back to a default profile instead.
 */
import { EMPTY_STATS, type PersonalStats } from "../../domain/progression";

export const PROFILE_SCHEMA_VERSION = 1;
export const PROFILE_STORAGE_KEY = "combination-game-profile";
/** Stage-0 storage keys, kept for migration and for the locale manager. */
export const LEGACY_PLAYER_NAME_KEY = "combination-game-player-name";

export interface StoredProfile {
  schemaVersion: number;
  playerName: string;
  mastery: PersonalStats;
}

export function defaultProfile(playerName = ""): StoredProfile {
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    playerName,
    mastery: { ...EMPTY_STATS, setsByLevel: [...EMPTY_STATS.setsByLevel] },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isLevelTuple(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((entry) => isNonNegativeFiniteNumber(entry))
  );
}

export function validateStats(raw: unknown): PersonalStats | null {
  if (!isRecord(raw)) return null;
  if (
    !isNonNegativeFiniteNumber(raw.xp) ||
    !isLevelTuple(raw.setsByLevel) ||
    !isNonNegativeFiniteNumber(raw.totalSetsFound) ||
    !isNonNegativeFiniteNumber(raw.boardsCleared) ||
    !isNonNegativeFiniteNumber(raw.sessionsPlayed) ||
    !isNonNegativeFiniteNumber(raw.sessionsCompleted)
  ) {
    return null;
  }
  // bestScore may be negative (scores can drop below zero without a floor).
  if (raw.bestScore !== null && (typeof raw.bestScore !== "number" || !Number.isFinite(raw.bestScore))) {
    return null;
  }
  return {
    xp: raw.xp,
    setsByLevel: [...raw.setsByLevel],
    totalSetsFound: raw.totalSetsFound,
    boardsCleared: raw.boardsCleared,
    sessionsPlayed: raw.sessionsPlayed,
    sessionsCompleted: raw.sessionsCompleted,
    bestScore: typeof raw.bestScore === "number" && Number.isFinite(raw.bestScore) ? raw.bestScore : null,
  };
}

/**
 * Validates parsed JSON as a StoredProfile. Returns null for anything
 * malformed or from an unsupported schema version — callers fall back to
 * `defaultProfile()` and simply overwrite storage on the next save.
 */
export function validateProfile(raw: unknown): StoredProfile | null {
  if (!isRecord(raw)) return null;
  if (raw.schemaVersion !== PROFILE_SCHEMA_VERSION) return null;
  if (typeof raw.playerName !== "string") return null;
  const mastery = validateStats(raw.mastery);
  if (mastery === null) return null;
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    playerName: raw.playerName,
    mastery,
  };
}
