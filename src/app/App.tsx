import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { DEFAULT_PREFERENCES, type Preferences } from "../domain/preferences";
import {
  EMPTY_STATS,
  rankForXp,
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
  probeStorageAvailable,
} from "../infrastructure/storage/repository";
import type { StoredProfile } from "../infrastructure/storage/schema";
import { GameScreen } from "../features/game/GameScreen";
import { HomeScreen } from "../features/home/HomeScreen";
import { ResultsScreen } from "../features/results/ResultsScreen";
import { RulesScreen } from "../features/rules/RulesScreen";
import { SettingsScreen } from "../features/settings/SettingsScreen";
import { ConfirmDialog } from "./ConfirmDialog";
import type { NavTarget } from "./Header";
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

  // Honest storage status for the Settings data section (one tiny probe write).
  const [storageAvailable] = useState(() => probeStorageAvailable());

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
  // Rules/Settings are overlays on the current context: opening them never
  // touches the session reducer, so an in-progress board is preserved exactly
  // (cards, score, selection, round, feedback) when the player returns.
  const [overlay, setOverlay] = useState<"rules" | "settings" | null>(null);
  // Whether the styled quit confirmation is showing. Kept as state (instead of
  // a blocking window.confirm) so the dialog matches the game's 16-bit UI.
  const [quitArmed, setQuitArmed] = useState(false);
  // Rank reached by the latest board checkpoint when it crossed a threshold;
  // shown once on the round-complete panel, then cleared.
  const [rankUpId, setRankUpId] = useState<string | null>(null);

  // --- Apply presentation preferences to the document root ---
  // Preferences are cosmetic only (theme, sizes, motion, focus) and never
  // affect score, XP, or ranking eligibility.
  const prefs = profile.preferences;
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = prefs.theme;
    root.dataset.cardSize = prefs.cardSize;
    root.dataset.uiScale = prefs.uiScale;
    root.classList.toggle("no-scanlines", !prefs.scanlines);
    root.classList.toggle("force-reduced-motion", prefs.reducedMotion === "on");
    root.classList.toggle("force-full-motion", prefs.reducedMotion === "off");
    root.classList.toggle("strong-focus", prefs.strongFocus);
  }, [prefs]);

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
    const nextMastery = statsAfterBoard(current.mastery, {
      setsFoundByLevel: sets,
      boardCleared: true,
    });
    // Acknowledge crossing a rank threshold with a subtle, local note.
    const before = rankForXp(current.mastery.xp).rank.id;
    const after = rankForXp(nextMastery.xp).rank.id;
    setRankUpId(after !== before ? after : null);
    saveProfile({ ...current, mastery: nextMastery });
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

  // The rank-up acknowledgement belongs to the round-complete panel only;
  // clear it as soon as play resumes on a board.
  useEffect(() => {
    if (session.phase === "playing") setRankUpId(null);
  }, [session.phase]);

  function startGame(name: string) {
    saveProfile({ ...profileRef.current, playerName: name });
    setRankUpId(null);
    dispatch({ type: "start-session" });
    setOverlay(null);
    setScreen("game");
  }

  function playAgain() {
    setRankUpId(null);
    dispatch({ type: "restart" });
    setOverlay(null);
    setScreen("game");
  }

  function goHome() {
    setOverlay(null);
    setScreen("home");
  }

  function quitGame() {
    setQuitArmed(false);
    setOverlay(null);
    setScreen("home");
  }

  function handleNavigate(target: NavTarget) {
    // "play" closes the overlay and returns to the current play context
    // (home, board, or results) exactly as it was left.
    setOverlay(target === "play" ? null : target);
  }

  function handlePreferencesChange(next: Preferences) {
    saveProfile({ ...profileRef.current, preferences: next });
  }

  function handleResetMastery() {
    const current = profileRef.current;
    saveProfile({
      ...current,
      mastery: { ...EMPTY_STATS, setsByLevel: [...EMPTY_STATS.setsByLevel] },
    });
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

  if (overlay === "rules") {
    return (
      <>
        <RulesScreen config={session.config} onNavigate={handleNavigate} onHome={goHome} />
        {saveNotice}
      </>
    );
  }

  if (overlay === "settings") {
    return (
      <>
        <SettingsScreen
          preferences={profile.preferences ?? DEFAULT_PREFERENCES}
          onPreferencesChange={handlePreferencesChange}
          storageAvailable={storageAvailable}
          onResetMastery={handleResetMastery}
          onNavigate={handleNavigate}
          onHome={goHome}
        />
        {saveNotice}
      </>
    );
  }

  if (screen === "home") {
    return (
      <>
        <HomeScreen
          initialName={profile.playerName}
          config={session.config}
          stats={profile.mastery}
          onStart={startGame}
          onHome={goHome}
          onNavigate={handleNavigate}
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
          onNavigate={handleNavigate}
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
        stats={profile.mastery}
        rankUpId={rankUpId}
        onQuit={() => setQuitArmed(true)}
        onHome={goHome}
        onNavigate={handleNavigate}
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
