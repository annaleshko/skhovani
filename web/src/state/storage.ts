import { demoUser, type DemoUser } from "@/data/demo-user";

/** MVP v2 — bump clears incompatible v1 state. */
export const STORAGE_KEY = "shovani:v2";
export const LEGACY_STORAGE_KEY = "shovani:v1";

export type ChatMessage = {
  role: "user" | "guide";
  content: string;
  sourceIds?: string[];
  /** Detail title when opened from 08 «Спитати гіда про це». */
  detailTitle?: string;
  followUps?: string[];
  error?: boolean;
  fallback?: boolean;
};

export type PersistedState = {
  version: 2;
  user: DemoUser;
  /** Chosen city from screen 01; null until picked. */
  startCityId: string | null;
  completedPaths: number[];
  currentPath: number | null;
  openedArtworkIds: number[];
  chatHistory: Record<string, ChatMessage[]>;
  seenTour: Record<string, boolean>;
};

export function defaultPersistedState(): PersistedState {
  return {
    version: 2,
    user: demoUser,
    startCityId: null,
    completedPaths: [],
    currentPath: null,
    openedArtworkIds: [],
    chatHistory: {},
    seenTour: {},
  };
}

export function loadPersistedState(): PersistedState {
  if (typeof window === "undefined") return defaultPersistedState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Drop legacy v1 so /reset + fresh installs land on the city picker.
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return defaultPersistedState();
    }
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (parsed.version !== 2) return defaultPersistedState();
    return {
      ...defaultPersistedState(),
      ...parsed,
      user: demoUser,
      startCityId:
        typeof parsed.startCityId === "string" ? parsed.startCityId : null,
      version: 2,
    };
  } catch {
    return defaultPersistedState();
  }
}

export function savePersistedState(state: PersistedState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearPersistedState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}
