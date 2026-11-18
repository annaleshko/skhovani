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
  STORAGE_KEY,
  clearPersistedState,
  defaultPersistedState,
  loadPersistedState,
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
 * Blocks accidental wipes (hydrate races between desktop shell + iframe).
 */
function protectStartCity(
  prev: PersistedState,
  next: PersistedState,
  allowClear: boolean,
): PersistedState {
  if (allowClear) return next;
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

function readStoredStartCityId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return typeof parsed.startCityId === "string" ? parsed.startCityId : null;
  } catch {
    return null;
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
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
    // Client-only hydrate from localStorage (avoid SSR mismatch)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount hydrate
    setState(loadPersistedState());
    hydratedRef.current = true;
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !hydratedRef.current) return;

    // Guard: never write null over a stored city (outer shell vs iframe race).
    if (!state.startCityId) {
      const stored = readStoredStartCityId();
      if (stored) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[shovani] save skipped — would overwrite startCityId with null",
          );
        }
        // Persist merged snapshot without a setState loop.
        savePersistedState({ ...state, startCityId: stored });
        return;
      }
    }

    savePersistedState(state);
  }, [state, ready]);

  const setStartCityId = useCallback(
    (id: string) => {
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
    clearPersistedState();
    allowClearStartCityRef.current = true;
    setState(defaultPersistedState());
  }, []);

  const startCityId =
    state.startCityId ?? (ready ? readStoredStartCityId() : null);

  const value = useMemo<AppStateValue>(
    () => ({
      ready,
      user: state.user,
      startCityId,
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
      startCityId,
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
