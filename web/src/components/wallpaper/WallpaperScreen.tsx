"use client";

import { Button, IconButton } from "@/components/ui";
import type { Artwork } from "@/data/types";
import { displayHeadline } from "@/lib/artwork-display";
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

/** cover path for screen / download (1170×2532).*/
export function wallpaperCoverSrc(artwork: Artwork): string | null {
  if (artwork.wallpaper?.startsWith("/wallpapers/")) return artwork.wallpaper;
  if (artwork.slug) return `/wallpapers/${artwork.slug}.png`;
  return null;
}

/** 11 — designer wallpaper cover preview + save exact file.*/
export function WallpaperScreen({ artwork, open, onClose, onSaved }: Props) {
  const [busy, setBusy] = useState(false);
  const [errorToast, setErrorToast] = useState(false);
  const coverSrc = wallpaperCoverSrc(artwork);

  const showError = useCallback(() => {
    setErrorToast(true);
    window.setTimeout(() => setErrorToast(false), 2800);
  }, []);

  const save = useCallback(async () => {
    if (busy || !coverSrc) return;
    setBusy(true);
    setErrorToast(false);
    try {
      const res = await fetch(coverSrc);
      if (!res.ok) {
        showError();
        return;
      }
      const blob = await res.blob();
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
  }, [artwork, busy, coverSrc, onSaved, showError]);

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
            <div className="relative h-[476px] w-[220px] shrink-0 overflow-hidden rounded-[28px] border border-border-subtle bg-screen">
              {coverSrc ? (
                <Image
                  src={coverSrc}
                  alt=""
                  fill
                  className="object-cover object-top"
                  sizes="220px"
                  unoptimized
                  priority
                />
              ) : null}
            </div>
          </div>

          <div className="relative shrink-0 px-xl pb-[calc(24px+var(--safe-bottom))] pt-md">
            <Button onClick={save} disabled={!coverSrc || busy}>
              Зберегти на телефон
            </Button>
            <p className="mt-sm text-center text-caption text-text-secondary">
              {/* TODO(copy): cover save hint*/}
              Збережи як шпалери телефону.
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
