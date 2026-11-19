import { demoUser, type DemoUser } from "@/data/demo-user";

/** Bump clears incompatible v1 state. */
export const STORAGE_KEY = "shovani:v2";
export const LEGACY_STORAGE_KEY = "shovani:v1";
/** Short-lived reset latch shared by shell + iframe (localStorage). */
export const RESET_FLAG_KEY = "shovani:reset";
const RESET_TTL_MS = 8000;

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
  if (isDemoResetActive()) return defaultPersistedState();
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
  // During reset latch, never re-poison storage with a stale in-memory city.
  if (isDemoResetActive()) {
    if (state.startCityId) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearPersistedState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

/** True while a demo reset is in flight (shell + iframe both see this). */
export function isDemoResetActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw =
      localStorage.getItem(RESET_FLAG_KEY) ??
      sessionStorage.getItem(RESET_FLAG_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) {
      clearDemoResetFlag();
      return false;
    }
    if (Date.now() - ts > RESET_TTL_MS) {
      clearDemoResetFlag();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function clearDemoResetFlag(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RESET_FLAG_KEY);
    sessionStorage.removeItem(RESET_FLAG_KEY);
  } catch {
    /* private mode */
  }
}

/**
 * Single explicit demo reset used by `/reset`, «Скинути демо», «Почати спочатку».
 * Clears persisted progress and latches providers so stale saves cannot restore it.
 */
export function performDemoReset(): PersistedState {
  if (typeof window === "undefined") return defaultPersistedState();
  clearPersistedState();
  const ts = String(Date.now());
  try {
    // localStorage: shared by desktop shell window + phone iframe.
    localStorage.setItem(RESET_FLAG_KEY, ts);
    // sessionStorage: same-tab latch inside the frame that triggered reset.
    sessionStorage.setItem(RESET_FLAG_KEY, ts);
  } catch {
    /* private mode */
  }
  return defaultPersistedState();
}

/** Home after reset — keep `?embed=1` inside the phone iframe. */
export function resetHomeHref(): string {
  if (typeof window === "undefined") return "/";
  const embed =
    new URLSearchParams(window.location.search).get("embed") === "1";
  return embed ? "/?embed=1" : "/";
}
