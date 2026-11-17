"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
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
  completedPaths: number[];
  currentPath: number | null;
  openedArtworkIds: number[];
  chatHistory: Record<string, ChatMessage[]>;
  seenTour: Record<string, boolean>;
  setCurrentPath: (n: number | null) => void;
  markPathComplete: (pathN: number, artworkId: number) => void;
  setChatHistory: (artworkId: number, messages: ChatMessage[]) => void;
  markTourSeen: (artworkId: number) => void;
  resetAll: () => void;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<PersistedState>(defaultPersistedState);

  useEffect(() => {
    // Client-only hydrate from localStorage (avoid SSR mismatch)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount hydrate
    setState(loadPersistedState());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    savePersistedState(state);
  }, [state, ready]);

  const setCurrentPath = useCallback((n: number | null) => {
    setState((s) => ({ ...s, currentPath: n }));
  }, []);

  const markPathComplete = useCallback((pathN: number, artworkId: number) => {
    setState((s) => ({
      ...s,
      completedPaths: s.completedPaths.includes(pathN)
        ? s.completedPaths
        : [...s.completedPaths, pathN].sort((a, b) => a - b),
      openedArtworkIds: s.openedArtworkIds.includes(artworkId)
        ? s.openedArtworkIds
        : [...s.openedArtworkIds, artworkId],
      currentPath: null,
    }));
  }, []);

  const setChatHistory = useCallback((artworkId: number, messages: ChatMessage[]) => {
    setState((s) => ({
      ...s,
      chatHistory: { ...s.chatHistory, [String(artworkId)]: messages },
    }));
  }, []);

  const markTourSeen = useCallback((artworkId: number) => {
    setState((s) => ({
      ...s,
      seenTour: { ...s.seenTour, [String(artworkId)]: true },
    }));
  }, []);

  const resetAll = useCallback(() => {
    clearPersistedState();
    setState(defaultPersistedState());
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      ready,
      user: state.user,
      completedPaths: state.completedPaths,
      currentPath: state.currentPath,
      openedArtworkIds: state.openedArtworkIds,
      chatHistory: state.chatHistory,
      seenTour: state.seenTour,
      setCurrentPath,
      markPathComplete,
      setChatHistory,
      markTourSeen,
      resetAll,
    }),
    [
      ready,
      state,
      setCurrentPath,
      markPathComplete,
      setChatHistory,
      markTourSeen,
      resetAll,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
