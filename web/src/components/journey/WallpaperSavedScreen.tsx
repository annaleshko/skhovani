"use client";

import { Button } from "@/components/ui";
import type { ResolvedPath } from "@/data/journey";
import { getMuseumShortLabel } from "@/data/museums";
import { motionTokens } from "@/lib/motion";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  open: boolean;
  next: ResolvedPath | null;
  sameMuseum: boolean;
  onContinue: () => void;
};

/**
 * MVP v2 screen 17 — Figma `240:1889`.
 * Visual polish comes in a later prompt; keep the flow working.
 */
export function WallpaperSavedScreen({
  open,
  next,
  sameMuseum,
  onContinue,
}: Props) {
  const nextLabel = next
    ? sameMuseum
      ? next.artwork.title
      : getMuseumShortLabel(next.museumId)
    : null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="absolute inset-0 z-50 flex flex-col bg-screen px-xl pb-[calc(24px+var(--safe-bottom))] pt-[calc(56px+var(--safe-top))]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: motionTokens.wallpaperCrossfade }}
        >
          <p className="text-overline uppercase text-text-accent">
            Шпалери збережено у «Фото»
          </p>
          <h1 className="mt-md text-h1">Тепер постав їх на екран блокування</h1>
          <p className="mt-sm text-body-md text-text-secondary">
            Займе хвилину. Твір буде з тобою щодня.
          </p>
          <ol className="mt-2xl list-decimal space-y-md pl-md text-body-md text-text-secondary">
            {/* TODO(copy): confirm wallpaper steps with Figma 17 */}
            <li>Відкрий «Фото» на телефоні</li>
            <li>Обери збережений кадр</li>
            <li>Постав як шпалери екрана блокування</li>
          </ol>
          <div className="mt-auto">
            <Button onClick={onContinue}>
              {nextLabel ? `Далі — ${nextLabel}` : "Далі"}
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
