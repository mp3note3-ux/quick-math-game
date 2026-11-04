import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { statsAfterSession, type SessionSummary } from "../domain/progression";
import { mulberry32, type RandomSource } from "../domain/rng";
import { DEFAULT_SCORING_CONFIG } from "../domain/scoring";
import {
  createInitialState,
  createSessionReducer,
  type SessionState,
} from "../domain/session";
import {
  createProfileRepository,
  loadInitialProfile,
} from "../infrastructure/storage/repository";
import type { StoredProfile } from "../infrastructure/storage/schema";
import { GameScreen } from "../features/game/GameScreen";
import { HomeScreen } from "../features/home/HomeScreen";
import { ResultsScreen } from "../features/results/ResultsScreen";
import { ConfirmDialog } from "./ConfirmDialog";
import { I18nProvider, useI18n } from "./I18nContext";

declare global {
  interface Window {
    /** Debug/test hook, exposed only when the app runs with ?seed=<n>. */
    __COMBINATION_GAME__?: { getState: () => SessionState };
  }
}

/**
 * Deterministic-board seam for end-to-end tests and reproducible practice:
 * `?seed=42` makes every board in the session come from a seeded generator.
 * Solo practice only — it grants no advantage beyond predictability.
 */
function readSeed(): number | null {
  try {
    const raw = new URLSearchParams(window.location.search).get("seed");
    if (raw === null) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function AppContent() {
  const { t, locale } = useI18n();

  // --- Persistence (browser-local only; see masteryLocalNote in the UI) ---
  const profileRepo = useMemo(() => createProfileRepository(), []);
  const [profile, setProfile] = useState<StoredProfile>(() => loadInitialProfile());
  const profileRef = useRef(profile);
  profileRef.current = profile;

  function saveProfile(next: StoredProfile) {
    profileRef.current = next;
    setProfile(next);
    profileRepo.save(next);
  }

  // --- Session state (pure domain reducer) ---
  const [seed] = useState(readSeed);
  const rngRef = useRef<RandomSource | null>(null);
  if (rngRef.current === null) {
    rngRef.current = seed === null ? Math.random : mulberry32(seed);
  }
  const sessionReducer = useMemo(() => createSessionReducer(rngRef.current!), []);
  const [session, dispatch] = useReducer(sessionReducer, undefined, () =>
    createInitialState(DEFAULT_SCORING_CONFIG),
  );
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const [screen, setScreen] = useState<"home" | "game">("home");
  // Whether the styled quit confirmation is showing. Kept as state (instead of
  // a blocking window.confirm) so the dialog matches the game's 16-bit UI.
  const [quitArmed, setQuitArmed] = useState(false);

  // --- Document metadata follows the active locale ---
  useEffect(() => {
    document.title = t("appName");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t("metaDescription"));
    document.documentElement.lang = locale;
  }, [t, locale]);

  // --- Test hook for deterministic e2e runs ---
  useEffect(() => {
    if (seed === null) return undefined;
    window.__COMBINATION_GAME__ = { getState: () => sessionRef.current };
    return () => {
      delete window.__COMBINATION_GAME__;
    };
  }, [seed]);

  // --- Record mastery exactly once per finished session ---
  const recordedRef = useRef(false);
  useEffect(() => {
    if (session.phase !== "finished") {
      recordedRef.current = false;
      return;
    }
    if (recordedRef.current) return;
    recordedRef.current = true;
    const summary: SessionSummary = {
      score: session.score,
      totalSetsFound: session.totalSetsFound,
      setsFoundByLevel: session.setsFoundByLevel,
      boardsCleared: session.roundsCompleted,
      roundsCompleted: session.roundsCompleted,
      totalRounds: session.totalRounds,
    };
    const current = profileRef.current;
    saveProfile({ ...current, mastery: statsAfterSession(current.mastery, summary) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function startGame(name: string) {
    saveProfile({ ...profileRef.current, playerName: name });
    dispatch({ type: "start-session" });
    setScreen("game");
  }

  function playAgain() {
    dispatch({ type: "restart" });
    setScreen("game");
  }

  function goHome() {
    setScreen("home");
  }

  function quitGame() {
    setQuitArmed(false);
    setScreen("home");
  }

  if (screen === "home") {
    return (
      <HomeScreen
        initialName={profile.playerName}
        config={session.config}
        onStart={startGame}
        onHome={goHome}
      />
    );
  }

  if (session.phase === "finished") {
    return (
      <ResultsScreen
        playerName={profile.playerName}
        state={session}
        stats={profile.mastery}
        onPlayAgain={playAgain}
        onHome={goHome}
      />
    );
  }

  return (
    <>
      <GameScreen
        state={session}
        dispatch={dispatch}
        playerName={profile.playerName}
        onQuit={() => setQuitArmed(true)}
        onHome={goHome}
      />
      {quitArmed ? (
        <ConfirmDialog onConfirm={quitGame} onCancel={() => setQuitArmed(false)} />
      ) : null}
    </>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
