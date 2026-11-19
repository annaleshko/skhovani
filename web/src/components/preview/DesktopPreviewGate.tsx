"use client";

import { LandscapeLock } from "@/components/layout/LandscapeLock";
import { DesktopPhonePreview } from "@/components/preview/DesktopPhonePreview";
import { EmbedUrlSync } from "@/components/preview/EmbedUrlSync";
import { AppStateProvider } from "@/state/AppState";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

function isPwaStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const ios =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || ios;
}

function shouldUsePhonePreview(): boolean {
  if (typeof window === "undefined") return false;
  if (window.self !== window.top) return false;
  if (new URLSearchParams(window.location.search).get("embed") === "1") {
    return false;
  }
  if (isPwaStandalone()) return false;
  // Phone-frame demo preview on wide desktops; ≤500px uses the centered shell.
  return window.innerWidth > 500;
}

/** Fixed shell + `--app-h` from measured height (not dvh). */
function AppShell({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      const h = el.getBoundingClientRect().height;
      if (h <= 0) return;
      const value = `${Math.round(h)}px`;
      el.style.setProperty("--app-h", value);
      // Also on :root so fixed overlays (sheets) resolve the same height.
      document.documentElement.style.setProperty("--app-h", value);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--app-h");
    };
  }, []);

  return (
    <div id="app-shell" ref={ref}>
      {children}
    </div>
  );
}

/**
 * On wide desktop viewports, show a sized phone iframe instead of the app.
 * The outer shell does NOT mount AppStateProvider — only the iframe app persists.
 * Phones, PWA standalone, and `?embed=1` render children as usual.
 */
export function DesktopPreviewGate({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"pending" | "preview" | "app">("pending");

  useEffect(() => {
    const apply = () => {
      setMode(shouldUsePhonePreview() ? "preview" : "app");
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  if (mode === "pending") {
    return (
      <div
        className="h-full w-full"
        style={{ backgroundColor: "var(--color-bg-hall-dark)" }}
        aria-busy
      />
    );
  }

  if (mode === "preview") {
    return <DesktopPhonePreview />;
  }

  return (
    <AppStateProvider persist>
      <EmbedUrlSync />
      <AppShell>{children}</AppShell>
      <LandscapeLock />
    </AppStateProvider>
  );
}
