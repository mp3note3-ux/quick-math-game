import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  statsAfterBoard,
  statsAfterSession,
  xpForSets,
  XP_PER_BOARD_CLEARED,
  type SessionSummary,
} from "../domain/progression";
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

  const [saveFailed, setSaveFailed] = useState(false);

  function saveProfile(next: StoredProfile) {
    profileRef.current = next;
    setProfile(next);
    // Surface persistence failures instead of claiming a save that did not
    // happen (blocked storage, quota, etc.).
    if (!profileRepo.save(next)) setSaveFailed(true);
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

  // --- Record mastery at verified checkpoints ---
  // XP is awarded per completed board (idempotently), so progress survives an
  // early exit. Session bookkeeping (sessions played/completed, best score) is
  // recorded once at session finish. Neither path re-awards the other's data.
  const checkpointedRoundRef = useRef(0);
  const sessionRecordedRef = useRef(false);

  // Award XP for each board the moment it is completed. The completed round's
  // state is terminal (the reducer cannot add sets to it), so keying by round
  // number makes this idempotent: re-renders/replays recompute the same round
  // and are skipped.
  useEffect(() => {
    if (session.phase !== "round-complete") return;
    const round = session.roundsCompleted;
    if (round <= checkpointedRoundRef.current) return;
    const sets = session.roundSetCounts[round - 1];
    if (sets === undefined) return;
    checkpointedRoundRef.current = round;
    const current = profileRef.current;
    saveProfile({
      ...current,
      mastery: statsAfterBoard(current.mastery, {
        setsFoundByLevel: sets,
        boardCleared: true,
      }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Record session-level bookkeeping exactly once when the session finishes.
  useEffect(() => {
    if (session.phase !== "finished") {
      return;
    }
    if (sessionRecordedRef.current) return;
    sessionRecordedRef.current = true;
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

  // Reset checkpoint guards when a brand-new session begins (round 1, nothing
  // completed yet), so a fresh session starts recording from a clean slate.
  useEffect(() => {
    if (session.round === 1 && session.roundsCompleted === 0 && session.phase === "playing") {
      checkpointedRoundRef.current = 0;
      sessionRecordedRef.current = false;
    }
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

  // XP earned by this session's verified sets (checkpointed per board). This
  // is what the results screen reports as "XP earned this session".
  const sessionXpEarned =
    xpForSets(session.setsFoundByLevel) + session.roundsCompleted * XP_PER_BOARD_CLEARED;

  const saveNotice = saveFailed ? (
    <p className="save-warning" role="alert">
      {t("saveFailed")}
    </p>
  ) : null;

  if (screen === "home") {
    return (
      <>
        <HomeScreen
          initialName={profile.playerName}
          config={session.config}
          stats={profile.mastery}
          onStart={startGame}
          onHome={goHome}
        />
        {saveNotice}
      </>
    );
  }

  if (session.phase === "finished") {
    return (
      <>
        <ResultsScreen
          playerName={profile.playerName}
          state={session}
          stats={profile.mastery}
          sessionXpEarned={sessionXpEarned}
          onPlayAgain={playAgain}
          onHome={goHome}
        />
        {saveNotice}
      </>
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
      {saveNotice}
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
