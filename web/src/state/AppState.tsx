"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  clearDemoResetFlag,
  defaultPersistedState,
  isDemoResetActive,
  loadPersistedState,
  performDemoReset,
  savePersistedState,
  type ChatMessage,
  type PersistedState,
} from "./storage";
import type { DemoUser } from "@/data/demo-user";

type AppStateValue = {
  ready: boolean;
  user: DemoUser;
  startCityId: string | null;
  completedPaths: number[];
  currentPath: number | null;
  openedArtworkIds: number[];
  chatHistory: Record<string, ChatMessage[]>;
  seenTour: Record<string, boolean>;
  setStartCityId: (id: string) => void;
  setCurrentPath: (n: number | null) => void;
  markPathComplete: (pathN: number, artworkId: number) => void;
  setChatHistory: (artworkId: number, messages: ChatMessage[]) => void;
  markTourSeen: (artworkId: number) => void;
  resetAll: () => void;
};

const AppStateContext = createContext<AppStateValue | null>(null);

/**
 * startCityId may only become null via resetAll.
 * Blocks accidental wipes inside one provider tree.
 */
function protectStartCity(
  prev: PersistedState,
  next: PersistedState,
  allowClear: boolean,
): PersistedState {
  if (allowClear || isDemoResetActive()) return next;
  if (prev.startCityId && !next.startCityId) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[shovani] blocked startCityId wipe — only /reset may clear it",
      );
    }
    return { ...next, startCityId: prev.startCityId };
  }
  return next;
}

type AppStateProviderProps = {
  children: ReactNode;
  /**
   * When false, this tree never reads/writes localStorage.
   * Desktop shell preview must pass false — only the iframe app persists.
   */
  persist?: boolean;
};

export function AppStateProvider({
  children,
  persist = true,
}: AppStateProviderProps) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<PersistedState>(defaultPersistedState);
  const hydratedRef = useRef(false);
  const allowClearStartCityRef = useRef(false);

  const commit = useCallback(
    (updater: (s: PersistedState) => PersistedState) => {
      setState((prev) => {
        const next = updater(prev);
        const allow = allowClearStartCityRef.current;
        allowClearStartCityRef.current = false;
        return protectStartCity(prev, next, allow);
      });
    },
    [],
  );

  useEffect(() => {
    // Client-only hydrate from localStorage (avoid SSR mismatch).
    /* eslint-disable react-hooks/set-state-in-effect -- intentional mount hydrate */
    if (!persist) {
      setState(defaultPersistedState());
      hydratedRef.current = true;
      setReady(true);
      return;
    }
    setState(loadPersistedState());
    hydratedRef.current = true;
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [persist]);

  useEffect(() => {
    if (!persist) return;
    if (!ready || !hydratedRef.current) return;

    // Reset latch: never let a stale in-memory city rewrite storage.
    if (isDemoResetActive()) {
      if (!state.startCityId) {
        savePersistedState(state);
        // Defaults are durable — drop the latch so a new city pick can save.
        clearDemoResetFlag();
      }
      return;
    }

    savePersistedState(state);
  }, [state, ready, persist]);

  const setStartCityId = useCallback(
    (id: string) => {
      clearDemoResetFlag();
      commit((s) => ({ ...s, startCityId: id }));
    },
    [commit],
  );

  const setCurrentPath = useCallback(
    (n: number | null) => {
      commit((s) => ({ ...s, currentPath: n }));
    },
    [commit],
  );

  const markPathComplete = useCallback(
    (pathN: number, artworkId: number) => {
      commit((s) => ({
        ...s,
        completedPaths: s.completedPaths.includes(pathN)
          ? s.completedPaths
          : [...s.completedPaths, pathN].sort((a, b) => a - b),
        openedArtworkIds: s.openedArtworkIds.includes(artworkId)
          ? s.openedArtworkIds
          : [...s.openedArtworkIds, artworkId],
        currentPath: null,
      }));
    },
    [commit],
  );

  const setChatHistory = useCallback(
    (artworkId: number, messages: ChatMessage[]) => {
      commit((s) => ({
        ...s,
        chatHistory: { ...s.chatHistory, [String(artworkId)]: messages },
      }));
    },
    [commit],
  );

  const markTourSeen = useCallback(
    (artworkId: number) => {
      commit((s) => ({
        ...s,
        seenTour: { ...s.seenTour, [String(artworkId)]: true },
      }));
    },
    [commit],
  );

  const resetAll = useCallback(() => {
    allowClearStartCityRef.current = true;
    const next = performDemoReset();
    allowClearStartCityRef.current = true;
    setState(next);
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      ready,
      user: state.user,
      startCityId: state.startCityId,
      completedPaths: state.completedPaths,
      currentPath: state.currentPath,
      openedArtworkIds: state.openedArtworkIds,
      chatHistory: state.chatHistory,
      seenTour: state.seenTour,
      setStartCityId,
      setCurrentPath,
      markPathComplete,
      setChatHistory,
      markTourSeen,
      resetAll,
    }),
    [
      ready,
      state,
      setStartCityId,
      setCurrentPath,
      markPathComplete,
      setChatHistory,
      markTourSeen,
      resetAll,
    ],
  );

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  );
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
