"use client";

import { Button, IconButton } from "@/components/ui";
import type { Artwork } from "@/data/types";
import { motionTokens } from "@/lib/motion";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useState } from "react";

type Props = {
  artwork: Artwork;
  open: boolean;
  onClose: () => void;
  /** After save → screen 17. */
  onSaved?: () => void;
};

/** Figma 11 — wallpaper preview + save (full artwork only). */
export function WallpaperScreen({ artwork, open, onClose, onSaved }: Props) {
  const [busy, setBusy] = useState(false);
  const previewSrc = artwork.wallpaper ?? artwork.image;

  const save = useCallback(async () => {
    if (!previewSrc || busy) return;
    setBusy(true);
    try {
      const res = await fetch(previewSrc);
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
      onSaved?.();
    } catch {
      // Share cancel or fetch fail — still advance so demo can continue.
      onSaved?.();
    } finally {
      setBusy(false);
    }
  }, [artwork.slug, artwork.title, busy, onSaved, previewSrc]);

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
          <div className="relative flex items-center justify-center px-xl pt-[calc(48px+var(--safe-top))]">
            <IconButton
              label="Закрити"
              className="absolute left-xl top-[calc(40px+var(--safe-top))] bg-surface"
              onClick={onClose}
            >
              <span aria-hidden className="text-xl leading-none">
                ×
              </span>
            </IconButton>
            <p className="text-label-md text-text-primary">Шпалери</p>
          </div>

          <div className="relative mx-auto mt-lg aspect-[9/19.5] w-[min(260px,68%)] overflow-hidden rounded-[28px] border border-border-subtle bg-black">
            {previewSrc ? (
              <Image
                src={previewSrc}
                alt=""
                fill
                className="object-cover"
                sizes="260px"
                priority
              />
            ) : (
              <div className="absolute inset-0 animate-pulse bg-surface" />
            )}
            <div className="pointer-events-none absolute inset-x-0 top-10 text-center text-white">
              <p className="text-[11px] opacity-90">неділя, 15 листопада</p>
              <p className="text-[28px] font-semibold leading-none">20:00</p>
            </div>
            <div className="pointer-events-none absolute inset-x-3 bottom-6 rounded-md bg-black/50 px-2 py-2 backdrop-blur-sm">
              <p className="text-[10px] font-semibold text-white">
                {artwork.title}
              </p>
              <p className="text-[9px] text-white/80">
                {artwork.author}
                {artwork.year ? ` · ${artwork.year}` : ""} · Сховані
              </p>
              <p className="mt-1 text-[8px] text-white/70">
                {artwork.photoCredit}
              </p>
            </div>
          </div>

          <div className="mt-auto px-xl pb-[calc(24px+var(--safe-bottom))] pt-xl">
            <Button onClick={save} disabled={!previewSrc || busy}>
              Зберегти на телефон
            </Button>
            <p className="mt-md text-center text-caption text-text-secondary">
              Верх лишили порожнім під годинник. Підпис автора фото — обовʼязковий
              за ліцензією.
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
