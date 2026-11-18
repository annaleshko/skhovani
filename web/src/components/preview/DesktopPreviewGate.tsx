"use client";

import { DesktopPhonePreview } from "@/components/preview/DesktopPhonePreview";
import { EmbedUrlSync } from "@/components/preview/EmbedUrlSync";
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
  return window.innerWidth >= 600;
}

/**
 * On wide desktop viewports, show a Figma-sized phone iframe instead of the app.
 * The outer page does not mount the app — only the iframe does.
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
    <>
      <EmbedUrlSync />
      <div id="app-shell">{children}</div>
    </>
  );
}
