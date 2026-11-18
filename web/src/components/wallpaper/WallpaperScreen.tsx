"use client";

import { Button, IconButton } from "@/components/ui";
import type { Artwork } from "@/data/types";
import {
  displayAuthorMeta,
  displayHeadline,
  displayYear,
} from "@/lib/artwork-display";
import { photographerCreditLine } from "@/lib/photo-credit";
import { motionTokens } from "@/lib/motion";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useState } from "react";

type Props = {
  artwork: Artwork;
  open: boolean;
  onClose: () => void;
  /** After save → screen 17. `shared` = Web Share on touch; else download. */
  onSaved?: (opts: { shared: boolean }) => void;
};

/** Design preview 220×476 → export 1170×2532 (×5.318). */
const PREVIEW = { w: 220, h: 476 } as const;
const EXPORT = { w: 1170, h: 2532 } as const;
const SCALE = EXPORT.w / PREVIEW.w;

function prefersTouchShare(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

function isAbortError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err != null &&
    "name" in err &&
    (err as { name?: string }).name === "AbortError"
  );
}

/** Download via real DOM anchor (blob URL kept ~1s). */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Figma 11 — wallpaper preview + save (no hall / lamp / badge). */
export function WallpaperScreen({ artwork, open, onClose, onSaved }: Props) {
  const [busy, setBusy] = useState(false);
  const [errorToast, setErrorToast] = useState(false);
  const artSrc = artwork.image;
  const photoLine = photographerCreditLine(artwork.photoCredit);

  const composeExport = useCallback(async (): Promise<Blob | null> => {
    if (!artSrc) return null;
    const img = await loadImage(artSrc);
    const canvas = document.createElement("canvas");
    canvas.width = EXPORT.w;
    canvas.height = EXPORT.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#0F0E0D";
    ctx.fillRect(0, 0, EXPORT.w, EXPORT.h);

    const gx = 109 * SCALE;
    const gy = (80.36 + 90) * SCALE;
    const gr = 180 * SCALE * 1.4;
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    glow.addColorStop(0, "rgba(233, 184, 114, 0.35)");
    glow.addColorStop(0.45, "rgba(233, 184, 114, 0.12)");
    glow.addColorStop(1, "rgba(15, 14, 13, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, EXPORT.w, EXPORT.h);

    ctx.fillStyle = "rgba(245, 245, 242, 0.5)";
    ctx.textAlign = "center";
    ctx.font = `400 ${12 * SCALE}px Manrope, sans-serif`;
    ctx.fillText("неділя, 15 листопада", EXPORT.w / 2, 35 * SCALE);
    ctx.font = `700 ${32 * SCALE}px Manrope, sans-serif`;
    ctx.fillText("20:00", EXPORT.w / 2, 62 * SCALE);

    const slot = {
      x: 11 * SCALE,
      y: 170.36 * SCALE,
      w: 196 * SCALE,
      h: 152 * SCALE,
    };
    const fit = fitContain(img.width, img.height, slot.w, slot.h);
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 12 * SCALE;
    ctx.shadowOffsetX = 1 * SCALE;
    ctx.shadowOffsetY = 8 * SCALE;
    ctx.drawImage(
      img,
      slot.x + (slot.w - fit.w) / 2,
      slot.y + (slot.h - fit.h) / 2,
      fit.w,
      fit.h,
    );
    ctx.shadowColor = "transparent";

    const cy = 390 * SCALE;
    ctx.textAlign = "center";
    ctx.fillStyle = "#f5f5f2";
    ctx.font = `600 ${14 * SCALE}px Manrope, sans-serif`;
    const headline = displayHeadline(artwork);
    const year = displayYear(artwork.year);
    ctx.fillText(headline, EXPORT.w / 2, cy);
    ctx.fillStyle = "#98928c";
    ctx.font = `400 ${12 * SCALE}px Manrope, sans-serif`;
    const metaLine = year
      ? `${artwork.author} · ${year} · Сховані`
      : `${artwork.author} · Сховані`;
    ctx.fillText(metaLine, EXPORT.w / 2, cy + 18 * SCALE);
    if (photoLine) {
      ctx.font = `400 ${8 * SCALE}px Manrope, sans-serif`;
      ctx.fillText(photoLine, EXPORT.w / 2, cy + 34 * SCALE);
    }

    return await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png");
    });
  }, [artSrc, artwork, photoLine]);

  const showError = useCallback(() => {
    setErrorToast(true);
    window.setTimeout(() => setErrorToast(false), 2800);
  }, []);

  const save = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setErrorToast(false);
    try {
      const blob = await composeExport();
      if (!blob) {
        showError();
        return;
      }
      const filename = `${artwork.slug}-wallpaper.png`;
      const file = new File([blob], filename, { type: "image/png" });
      let shared = false;
      if (prefersTouchShare() && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: displayHeadline(artwork),
          });
          shared = true;
        } catch (err) {
          if (isAbortError(err)) return;
          // Any other share failure → download fallback
        }
      }
      if (!shared) {
        downloadBlob(blob, filename);
      }
      onSaved?.({ shared });
    } catch {
      showError();
    } finally {
      setBusy(false);
    }
  }, [artwork, busy, composeExport, onSaved, showError]);

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
          <div className="relative flex h-16 shrink-0 items-center justify-between px-xl pt-[var(--safe-top)]">
            <IconButton
              label="Закрити"
              className="size-10 min-h-10 min-w-10 border border-border-subtle bg-surface"
              onClick={onClose}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ui/icon-close.svg" alt="" width={20} height={20} />
            </IconButton>
            <p className="text-label-lg text-text-primary">Шпалери</p>
            <span className="size-10" aria-hidden />
          </div>

          <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-xl pt-md">
            <div
              className="relative h-[476px] w-[220px] shrink-0 overflow-hidden rounded-[28px] border border-border-subtle"
              style={{ backgroundColor: "#0F0E0D" }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute left-[19px] top-[80px] size-[180px] rounded-full opacity-70"
                style={{
                  background:
                    "radial-gradient(circle, color-mix(in srgb, var(--color-bg-accent) 45%, transparent) 0%, transparent 70%)",
                  filter: "blur(40px)",
                }}
              />
              <div className="pointer-events-none absolute inset-x-0 top-[23px] text-center">
                <p className="text-[12px] leading-4 text-text-primary opacity-50">
                  неділя, 15 листопада
                </p>
                <p className="text-[32px] font-bold leading-9 tracking-[-0.02em] text-text-primary opacity-50">
                  20:00
                </p>
              </div>
              <div
                className="absolute left-[11px] top-[170px] h-[152px] w-[196px]"
                style={{
                  filter: "drop-shadow(1px 8px 12px rgba(0,0,0,0.25))",
                }}
              >
                {artSrc ? (
                  <Image
                    src={artSrc}
                    alt=""
                    fill
                    className="object-contain"
                    sizes="196px"
                    unoptimized
                    priority
                  />
                ) : null}
              </div>
              <div className="absolute inset-x-[11px] top-[379px] flex flex-col items-center gap-[2px] text-center">
                <p className="text-label-md text-text-primary">
                  {displayHeadline(artwork)}
                </p>
                <p className="text-caption text-text-secondary">
                  {displayYear(artwork.year)
                    ? `${displayAuthorMeta(artwork)} · Сховані`
                    : `${artwork.author} · Сховані`}
                </p>
                {photoLine ? (
                  <p className="text-[8px] leading-4 text-text-secondary">
                    {photoLine}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="relative shrink-0 px-xl pb-[calc(24px+var(--safe-bottom))] pt-md">
            <Button onClick={save} disabled={!artSrc || busy}>
              Зберегти на телефон
            </Button>
            <p className="mt-sm text-center text-caption text-text-secondary">
              Верх лишили порожнім під годинник. Підпис автора фото — обовʼязковий
              за ліцензією.
            </p>
            <AnimatePresence>
              {errorToast ? (
                <motion.p
                  role="status"
                  className="absolute inset-x-xl bottom-[calc(100%+8px)] rounded-md border border-border-subtle bg-surface-raised px-md py-sm text-center text-caption text-text-primary shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                >
                  Не вдалося зберегти. Спробуй ще раз.
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function fitContain(
  iw: number,
  ih: number,
  sw: number,
  sh: number,
): { w: number; h: number } {
  const s = Math.min(sw / iw, sh / ih);
  return { w: iw * s, h: ih * s };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_load"));
    img.src = src;
  });
}
