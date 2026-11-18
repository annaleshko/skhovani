"use client";

import { LandscapeLock } from "@/components/layout/LandscapeLock";
import { DesktopPhonePreview } from "@/components/preview/DesktopPhonePreview";
import { EmbedUrlSync } from "@/components/preview/EmbedUrlSync";
import { AppStateProvider } from "@/state/AppState";
import { useEffect, useState, type ReactNode } from "react";

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

/**
 * On wide desktop viewports, show a Figma-sized phone iframe instead of the app.
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
        className="min-h-dvh w-full"
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
      <div id="app-shell">{children}</div>
      <LandscapeLock />
    </AppStateProvider>
  );
}
