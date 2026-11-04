/**
 * Typed browser-persistence adapter. This is the ONLY module (besides the
 * i18n locale key) that touches Web Storage; the rest of the app depends on
 * the `StorageRepository` interface. Progress stays on this device — local
 * storage is not authoritative and is never treated as cloud sync.
 */
import {
  defaultProfile,
  validateProfile,
  LEGACY_PLAYER_NAME_KEY,
  PROFILE_STORAGE_KEY,
  type StoredProfile,
} from "./schema";

export interface StorageRepository<T> {
  /** Returns the stored value, or null when missing, malformed, or unavailable. */
  load(): T | null;
  /** Returns false when storage is unavailable or the quota is exceeded. */
  save(value: T): boolean;
}

/** Minimal Web Storage shape, injectable for tests. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createLocalStorageRepository<T>(
  key: string,
  validate: (raw: unknown) => T | null,
  storage: StorageLike | null = browserStorage(),
): StorageRepository<T> {
  return {
    load() {
      if (storage === null) return null;
      let raw: string | null;
      try {
        raw = storage.getItem(key);
      } catch {
        return null;
      }
      if (raw === null) return null;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return null;
      }
      return validate(parsed);
    },
    save(value) {
      if (storage === null) return false;
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
  };
}

export function createProfileRepository(
  storage?: StorageLike | null,
): StorageRepository<StoredProfile> {
  return createLocalStorageRepository(PROFILE_STORAGE_KEY, validateProfile, storage ?? browserStorage());
}

/**
 * Reads the Stage-0 standalone player-name key for one-time migration into
 * the profile. Returns "" when absent or storage is unavailable.
 */
export function readLegacyPlayerName(storage: StorageLike | null = browserStorage()): string {
  if (storage === null) return "";
  try {
    return storage.getItem(LEGACY_PLAYER_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Loads the stored profile, adopting the legacy player name on first run. */
export function loadInitialProfile(storage?: StorageLike | null): StoredProfile {
  const backend = storage ?? browserStorage();
  const repo = createLocalStorageRepository(PROFILE_STORAGE_KEY, validateProfile, backend);
  return repo.load() ?? defaultProfile(readLegacyPlayerName(backend));
}
