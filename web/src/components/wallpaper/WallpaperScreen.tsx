"use client";

import { Button, CheckBadge, Chip } from "@/components/ui";
import type { Artwork } from "@/data/types";
import { resolveStopTarget } from "@/lib/tour-camera";
import { defaultSpring, motionTokens } from "@/lib/motion";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type Mode = "full" | "detail";

type Props = {
  artwork: Artwork;
  open: boolean;
  onClose: () => void;
  /** MVP v2: after save → screen 17. */
  onSaved?: () => void;
};

/** Figma 21 / 21б — wallpaper preview + save. */
export function WallpaperScreen({ artwork, open, onClose, onSaved }: Props) {
  const [mode, setMode] = useState<Mode>("full");
  const [saved, setSaved] = useState(false);
  const [detailUrl, setDetailUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fullSrc = artwork.wallpaper ?? artwork.image;
  const stop1 = artwork.tourStops[0];

  useEffect(() => {
    if (!open || mode !== "detail" || !artwork.image || !stop1) return;
    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const W = 780;
      const H = 1688;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const target = resolveStopTarget(stop1, artwork.touchZones);
      const zoom = target.zoom;
      const sw = img.width / zoom;
      const sh = img.height / zoom;
      const sx = target.x * img.width - sw / 2;
      const sy = target.y * img.height - sh / 2;
      ctx.fillStyle = "#110f0e";
      ctx.fillRect(0, 0, W, H);
      // cover crop
      const scale = Math.max(W / sw, H / sh);
      const dw = sw * scale;
      const dh = sh * scale;
      ctx.drawImage(img, sx, sy, sw, sh, (W - dw) / 2, (H - dh) / 2, dw, dh);
      setDetailUrl(canvas.toDataURL("image/png"));
    };
    img.src = artwork.image;
    return () => {
      cancelled = true;
    };
  }, [artwork.image, artwork.touchZones, mode, open, stop1]);

  const previewSrc = mode === "full" ? fullSrc : detailUrl;

  const save = useCallback(async () => {
    const src = mode === "detail" ? detailUrl : fullSrc;
    if (!src) return;
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const file = new File([blob], `${artwork.slug}-wallpaper.png`, {
        type: "image/png",
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: artwork.title,
        });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${artwork.slug}-wallpaper.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      setSaved(true);
      onSaved?.();
    } catch {
      // user cancelled share — still show tips if download worked
      setSaved(true);
      onSaved?.();
    }
  }, [artwork.slug, artwork.title, detailUrl, fullSrc, mode, onSaved]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="absolute inset-0 z-50 flex flex-col bg-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: motionTokens.scrim }}
        >
          <div className="flex items-center justify-between px-xl pt-[calc(48px+var(--safe-top))]">
            <button
              type="button"
              className="min-h-[44px] text-label-md text-text-secondary"
              onClick={onClose}
            >
              Закрити
            </button>
            <p className="text-label-md text-text-primary">Шпалери</p>
            <span className="w-16" />
          </div>

          <div className="relative mx-auto mt-lg aspect-[9/19.5] w-[220px] overflow-hidden rounded-[28px] border border-border-subtle bg-black">
            <AnimatePresence mode="wait">
              {previewSrc ? (
                <motion.div
                  key={mode + (previewSrc?.slice(0, 32) ?? "")}
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: motionTokens.wallpaperCrossfade }}
                >
                  <Image
                    src={previewSrc}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized={mode === "detail"}
                    sizes="220px"
                  />
                </motion.div>
              ) : (
                <div className="absolute inset-0 animate-pulse bg-surface" />
              )}
            </AnimatePresence>
            {/* OS clock zone */}
            <div className="pointer-events-none absolute inset-x-0 top-10 text-center text-white">
              <p className="text-[28px] font-semibold leading-none">20:00</p>
              <p className="mt-1 text-[11px] opacity-90">неділя, 15 листопада</p>
            </div>
            <div className="pointer-events-none absolute inset-x-3 bottom-6 rounded-md bg-black/50 px-2 py-2 backdrop-blur-sm">
              <p className="text-[10px] font-semibold text-white">{artwork.title}</p>
              <p className="text-[9px] text-white/80">{artwork.photoCredit}</p>
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" aria-hidden />

          {/* MVP v2: only «Уся картина» (no detail toggle). */}
          <div className="mt-lg flex justify-center gap-sm px-xl">
            <Chip active onClick={() => setMode("full")}>
              Уся картина
            </Chip>
          </div>

          <div className="mt-auto px-xl pb-[calc(24px+var(--safe-bottom))] pt-xl">
            {!saved ? (
              <Button onClick={save} disabled={!previewSrc}>
                Зберегти на телефон
              </Button>
            ) : onSaved ? null : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={defaultSpring}
                className="text-center"
              >
                <CheckBadge label="Шпалери збережено у «Фото»" />
                <ol className="mt-md space-y-sm text-left text-body-md text-text-secondary">
                  <li>1. Відкрий «Параметри» → «Шпалери».</li>
                  <li>2. Обери збережене зображення для екрана блокування.</li>
                </ol>
                <div className="mt-lg">
                  <Button variant="secondary" onClick={onClose}>
                    Готово
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
