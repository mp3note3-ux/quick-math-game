import { describe, expect, it } from "vitest";
import { EMPTY_STATS } from "../../domain/progression";
import {
  createLocalStorageRepository,
  loadInitialProfile,
  readLegacyPlayerName,
  type StorageLike,
} from "./repository";
import {
  defaultProfile,
  LEGACY_PLAYER_NAME_KEY,
  PROFILE_SCHEMA_VERSION,
  PROFILE_STORAGE_KEY,
  validateProfile,
  type StoredProfile,
} from "./schema";

/** In-memory Storage fake. */
function fakeStorage(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
};

/** Storage that throws on every access, like a blocked/quota-exceeded backend. */
const brokenStorage: StorageLike = {
  getItem: () => {
    throw new Error("denied");
  },
  setItem: () => {
    throw new Error("quota");
  },
};

const validProfile: StoredProfile = {
  schemaVersion: PROFILE_SCHEMA_VERSION,
  playerName: "Jin",
  mastery: {
    xp: 130,
    setsByLevel: [5, 3, 1],
    totalSetsFound: 9,
    boardsCleared: 2,
    sessionsPlayed: 3,
    sessionsCompleted: 2,
    bestScore: -2,
  },
};

describe("validateProfile", () => {
  it("accepts a valid profile", () => {
    expect(validateProfile(validProfile)).toEqual(validProfile);
  });

  it("rejects malformed values", () => {
    expect(validateProfile(null)).toBeNull();
    expect(validateProfile("profile")).toBeNull();
    expect(validateProfile({ schemaVersion: 1 })).toBeNull();
    expect(validateProfile({ ...validProfile, playerName: 42 })).toBeNull();
    expect(
      validateProfile({ ...validProfile, mastery: { ...validProfile.mastery, xp: "lots" } }),
    ).toBeNull();
    expect(
      validateProfile({ ...validProfile, mastery: { ...validProfile.mastery, setsByLevel: [1, 2] } }),
    ).toBeNull();
  });

  it("rejects unsupported schema versions", () => {
    expect(validateProfile({ ...validProfile, schemaVersion: 0 })).toBeNull();
    expect(validateProfile({ ...validProfile, schemaVersion: 99 })).toBeNull();
  });
});

describe("localStorage repository", () => {
  it("round-trips a profile", () => {
    const storage = fakeStorage();
    const repo = createLocalStorageRepository(PROFILE_STORAGE_KEY, validateProfile, storage);
    expect(repo.save(validProfile)).toBe(true);
    expect(repo.load()).toEqual(validProfile);
  });

  it("returns null for missing, malformed, or outdated data", () => {
    const repo = (storage: StorageLike) =>
      createLocalStorageRepository(PROFILE_STORAGE_KEY, validateProfile, storage);

    expect(repo(fakeStorage()).load()).toBeNull();
    expect(repo(fakeStorage({ [PROFILE_STORAGE_KEY]: "{not json" })).load()).toBeNull();
    expect(
      repo(fakeStorage({ [PROFILE_STORAGE_KEY]: JSON.stringify({ schemaVersion: 0 }) })).load(),
    ).toBeNull();
  });

  it("never throws when storage is unavailable", () => {
    const repo = createLocalStorageRepository(PROFILE_STORAGE_KEY, validateProfile, brokenStorage);
    expect(repo.load()).toBeNull();
    expect(repo.save(validProfile)).toBe(false);
    expect(() => repo.load()).not.toThrow();
  });
});

describe("profile loading and legacy migration", () => {
  it("adopts the Stage-0 player name on first run", () => {
    const storage = fakeStorage({ [LEGACY_PLAYER_NAME_KEY]: "Mina" });
    const profile = loadInitialProfile(storage);
    expect(profile.playerName).toBe("Mina");
    expect(profile.mastery).toEqual(EMPTY_STATS);
  });

  it("prefers a valid stored profile over the legacy key", () => {
    const storage = fakeStorage({ [LEGACY_PLAYER_NAME_KEY]: "Mina" });
    createLocalStorageRepository(PROFILE_STORAGE_KEY, validateProfile, storage).save(validProfile);
    expect(loadInitialProfile(storage)).toEqual(validProfile);
  });

  it("falls back to a default profile when storage is unavailable", () => {
    expect(loadInitialProfile(brokenStorage)).toEqual(defaultProfile());
    expect(readLegacyPlayerName(brokenStorage)).toBe("");
  });
});
