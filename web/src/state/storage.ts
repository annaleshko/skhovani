import { demoUser, type DemoUser } from "@/data/demo-user";

export const STORAGE_KEY = "shovani:v1";

export type ChatMessage = {
  role: "user" | "guide";
  content: string;
  sourceIds?: string[];
};

export type PersistedState = {
  version: 1;
  user: DemoUser;
  completedPaths: number[];
  currentPath: number | null;
  openedArtworkIds: number[];
  chatHistory: Record<string, ChatMessage[]>;
  seenTour: Record<string, boolean>;
};

export function defaultPersistedState(): PersistedState {
  return {
    version: 1,
    user: demoUser,
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
    if (!raw) return defaultPersistedState();
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (parsed.version !== 1) return defaultPersistedState();
    return {
      ...defaultPersistedState(),
      ...parsed,
      user: demoUser, // always seed identity from demo-user
      version: 1,
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
}
