"use client";

import { EMBED_NAV_MESSAGE } from "@/components/preview/EmbedUrlSync";
import { cn } from "@/lib/cn";
import { useCallback, useEffect, useRef, useState } from "react";

const PHONE_W = 390;
const BEZEL = 10;
const MARGIN = 32;

type HeightPreset = {
  h: number;
  label: string;
};

const HEIGHT_PRESETS: HeightPreset[] = [
  { h: 844, label: "844 · iPhone 14" },
  { h: 740, label: "740 · Safari з панелями" },
  { h: 667, label: "667 · iPhone SE" },
];

function withEmbed(pathAndSearch: string): string {
  const url = new URL(pathAndSearch, window.location.origin);
  url.searchParams.set("embed", "1");
  const qs = url.searchParams.toString();
  return url.pathname + (qs ? `?${qs}` : "") + url.hash;
}

/**
 * Desktop-only phone frame: iframe runs the app at exact Figma size (390×H).
 * Outer page does not mount the app tree.
 */
export function DesktopPhonePreview() {
  const [phoneH, setPhoneH] = useState(844);
  const [scale, setScale] = useState(1);
  const [iframeSrc, setIframeSrc] = useState(() => {
    if (typeof window === "undefined") return "/?embed=1";
    return withEmbed(window.location.pathname + window.location.search + window.location.hash);
  });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  const frameOuterW = PHONE_W + BEZEL * 2;
  const frameOuterH = phoneH + BEZEL * 2;

  const updateScale = useCallback(() => {
    const controlsH = controlsRef.current?.offsetHeight ?? 72;
    const availW = window.innerWidth - MARGIN * 2;
    const availH = window.innerHeight - MARGIN * 2 - controlsH - 16;
    const s = Math.min(1, availW / frameOuterW, availH / frameOuterH);
    setScale(Number.isFinite(s) && s > 0 ? s : 1);
  }, [frameOuterH, frameOuterW]);

  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [updateScale]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== EMBED_NAV_MESSAGE) return;
      const path = e.data.path as string;
      if (typeof path !== "string") return;
      const current = window.location.pathname + window.location.search + window.location.hash;
      if (path !== current) {
        window.history.replaceState(null, "", path);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const resetDemo = () => {
    const src = `${withEmbed("/reset")}&_=${Date.now()}`;
    setIframeSrc(src);
    if (iframeRef.current) iframeRef.current.src = src;
  };

  return (
    <div
      className="flex min-h-dvh w-full flex-col items-center justify-center gap-lg px-xl py-2xl"
      style={{ backgroundColor: "var(--color-bg-hall-dark)" }}
    >
      <div
        className="relative shrink-0"
        style={{
          width: frameOuterW * scale,
          height: frameOuterH * scale,
        }}
      >
        <div
          className="absolute left-1/2 top-0"
          style={{
            width: frameOuterW,
            height: frameOuterH,
            transform: `translateX(-50%) scale(${scale})`,
            transformOrigin: "top center",
          }}
        >
          <div
            className="overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            style={{
              width: frameOuterW,
              height: frameOuterH,
              borderRadius: 48,
              border: `${BEZEL}px solid var(--color-bg-surface-raised)`,
              backgroundColor: "var(--color-bg-hall-dark)",
              boxSizing: "border-box",
            }}
          >
            <iframe
              ref={iframeRef}
              title="Сховані — попередній перегляд телефону"
              src={iframeSrc}
              width={PHONE_W}
              height={phoneH}
              className="block border-0 bg-screen"
              style={{ width: PHONE_W, height: phoneH }}
            />
          </div>
        </div>
      </div>

      <div
        ref={controlsRef}
        className="flex max-w-[min(100%,420px)] flex-col items-center gap-sm px-md text-center"
      >
        <div className="flex flex-wrap items-center justify-center gap-sm">
          {HEIGHT_PRESETS.map((p) => (
            <button
              key={p.h}
              type="button"
              onClick={() => setPhoneH(p.h)}
              className={cn(
                "min-h-11 rounded-full border px-md text-caption transition-colors",
                phoneH === p.h
                  ? "border-border-accent text-text-primary"
                  : "border-border-subtle text-text-secondary hover:text-text-primary",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={resetDemo}
          className="min-h-11 text-caption text-text-secondary underline-offset-2 hover:text-text-primary hover:underline"
        >
          Скинути демо
        </button>
      </div>
    </div>
  );
}
