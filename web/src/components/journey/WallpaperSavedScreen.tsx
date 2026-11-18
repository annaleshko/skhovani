"use client";

import { Button, NumberBadge } from "@/components/ui";
import type { ResolvedPath } from "@/data/journey";
import { getMuseumShortLabel } from "@/data/museums";
import { motionTokens } from "@/lib/motion";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";

type Props = {
  open: boolean;
  next: ResolvedPath | null;
  previewSrc?: string | null;
  artworkTitle?: string;
  onContinue: () => void;
};

const STEPS = [
  "Відкрий «Фото» і знайди збережене зображення",
  "Натисни «Поділитись» → «Використати як шпалери»",
  "Обери «Екран блокування» і підтверди",
] as const;

/**
 * MVP v2 screen 17 — Figma `240:1889`.
 * CTA is always «Далі — <місто>» (same museum keeps the city name).
 */
export function WallpaperSavedScreen({
  open,
  next,
  previewSrc,
  artworkTitle,
  onContinue,
}: Props) {
  const nextCity = next ? getMuseumShortLabel(next.museumId) : null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="absolute inset-0 z-50 flex flex-col bg-screen px-xl pb-[calc(24px+var(--safe-bottom))] pt-[calc(48px+var(--safe-top))]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: motionTokens.wallpaperCrossfade }}
        >
          <div className="mx-auto flex items-center gap-sm rounded-full bg-surface px-md py-sm">
            <span
              className="flex size-6 items-center justify-center rounded-full bg-accent-subtle text-sm text-text-accent"
              aria-hidden
            >
              ✓
            </span>
            <p className="text-label-md text-text-primary">
              Шпалери збережено у «Фото»
            </p>
          </div>

          <div className="mt-2xl flex gap-lg">
            <div className="relative h-[148px] w-[72px] shrink-0 overflow-hidden rounded-[14px] border border-border-subtle bg-black">
              {previewSrc ? (
                <Image
                  src={previewSrc}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="72px"
                />
              ) : null}
              <div className="pointer-events-none absolute inset-x-0 top-3 text-center text-[8px] text-white/90">
                20:00
              </div>
              {artworkTitle ? (
                <div className="pointer-events-none absolute inset-x-1 bottom-2">
                  <p className="truncate text-[6px] font-semibold text-white">
                    {artworkTitle}
                  </p>
                </div>
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-h2">Тепер постав їх на екран блокування</h1>
              <p className="mt-sm text-body-md text-text-secondary">
                Займе хвилину. Твір буде з тобою щодня.
              </p>
            </div>
          </div>

          <ol className="mt-2xl space-y-md">
            {STEPS.map((text, i) => (
              <li
                key={text}
                className="flex items-start gap-md rounded-lg bg-surface px-md py-md"
              >
                <NumberBadge value={i + 1} />
                <p className="pt-1 text-body-md text-text-primary">{text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-auto">
            <Button onClick={onContinue}>
              {nextCity ? `Далі — ${nextCity}` : "Далі"}
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
