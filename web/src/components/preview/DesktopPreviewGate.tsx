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
  type CSSProperties,
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

function wantsVhDebug(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug") === "vh";
}

/** Physical screen length along the current vertical axis (CSS px). */
function physicalScreenHeight(): number {
  const portrait = window.innerHeight >= window.innerWidth;
  // iOS screen.width/height stay in portrait orientation metrics.
  const screenH = portrait ? window.screen.height : window.screen.width;
  return Math.max(window.innerHeight, screenH);
}

function readSafeInset(side: "top" | "bottom"): number {
  const probe = document.createElement("div");
  probe.style.cssText = `position:fixed;visibility:hidden;pointer-events:none;${side}:0;padding-${side}:env(safe-area-inset-${side},0px);`;
  document.body.appendChild(probe);
  const pad =
    side === "top"
      ? getComputedStyle(probe).paddingTop
      : getComputedStyle(probe).paddingBottom;
  probe.remove();
  const n = Number.parseFloat(pad);
  return Number.isFinite(n) ? n : 0;
}

type VhDebug = {
  innerHeight: number;
  screenHeight: number;
  shellHeight: number;
  safeTop: number;
  safeBottom: number;
  standalone: boolean;
};

/** Fixed shell + `--app-h`. Standalone uses physical screen height. */
function AppShell({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [standalone] = useState(() => isPwaStandalone());
  const [shellStyle, setShellStyle] = useState<CSSProperties | undefined>();
  const [debug, setDebug] = useState<VhDebug | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const setAppH = (h: number) => {
      const value = `${Math.round(h)}px`;
      el.style.setProperty("--app-h", value);
      document.documentElement.style.setProperty("--app-h", value);
    };

    const publishDebug = (shellHeight: number) => {
      if (!wantsVhDebug()) {
        setDebug(null);
        return;
      }
      setDebug({
        innerHeight: window.innerHeight,
        screenHeight: window.screen.height,
        shellHeight: Math.round(shellHeight),
        safeTop: readSafeInset("top"),
        safeBottom: readSafeInset("bottom"),
        standalone: isPwaStandalone(),
      });
    };

    if (standalone) {
      const applyStandalone = () => {
        const h = physicalScreenHeight();
        setShellStyle({
          top: 0,
          bottom: "auto",
          height: `${Math.round(h)}px`,
        });
        setAppH(h);
        publishDebug(h);
      };
      applyStandalone();
      window.addEventListener("resize", applyStandalone);
      window.addEventListener("orientationchange", applyStandalone);
      // Recompute metrics when the keyboard opens, but height still uses screen —
      // never visualViewport.height — so the shell does not shrink.
      window.visualViewport?.addEventListener("resize", applyStandalone);
      return () => {
        window.removeEventListener("resize", applyStandalone);
        window.removeEventListener("orientationchange", applyStandalone);
        window.visualViewport?.removeEventListener("resize", applyStandalone);
        document.documentElement.style.removeProperty("--app-h");
      };
    }

    const applyBrowser = () => {
      const h = el.getBoundingClientRect().height;
      if (h <= 0) return;
      setAppH(h);
      publishDebug(h);
    };
    applyBrowser();
    const ro = new ResizeObserver(applyBrowser);
    ro.observe(el);
    window.addEventListener("resize", applyBrowser);
    window.visualViewport?.addEventListener("resize", applyBrowser);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", applyBrowser);
      window.visualViewport?.removeEventListener("resize", applyBrowser);
      document.documentElement.style.removeProperty("--app-h");
    };
  }, [standalone]);

  return (
    <div id="app-shell" ref={ref} style={shellStyle}>
      {children}
      {debug ? (
        <div
          className="pointer-events-none absolute left-2 top-[max(8px,env(safe-area-inset-top))] z-[9998] rounded-md bg-black/80 px-sm py-xs font-mono text-[10px] leading-tight text-text-accent"
          aria-hidden
        >
          <div>standalone: {debug.standalone ? "yes" : "no"}</div>
          <div>innerH: {debug.innerHeight}</div>
          <div>screenH: {debug.screenHeight}</div>
          <div>shellH: {debug.shellHeight}</div>
          <div>safeT: {debug.safeTop.toFixed(1)}</div>
          <div>safeB: {debug.safeBottom.toFixed(1)}</div>
        </div>
      ) : null}
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
