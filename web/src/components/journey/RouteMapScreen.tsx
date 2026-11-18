"use client";

import { Button } from "@/components/ui";
import type { ResolvedPath } from "@/data/journey";
import { getMuseumShortLabel } from "@/data/museums";
import { defaultSpring, motionTokens } from "@/lib/motion";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  open: boolean;
  next: ResolvedPath | null;
  onDepart: () => void;
};

/**
 * MVP v2 screen 02в — Figma `238:1557`.
 * Skeleton for flow wiring; full map visuals land in V2-2.
 */
export function RouteMapScreen({ open, next, onDepart }: Props) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="absolute inset-0 z-40 flex flex-col bg-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: motionTokens.mapFadeIn }}
        >
          <header className="px-xl pt-[calc(56px+var(--safe-top))]">
            <h1 className="text-h1">Твій маршрут</h1>
            <p className="mt-sm text-body-md text-text-secondary">
              10 творів у 5 музеях. Тапни на будь-який музей.
            </p>
          </header>
          <div className="flex flex-1 items-center justify-center px-xl text-body-md text-text-secondary">
            {/* TODO(v2-2): full route map with glow / dashed line */}
            Карта маршруту
          </div>
          <motion.div
            className="rounded-t-lg border-t border-border-subtle bg-surface px-xl pb-[calc(24px+var(--safe-bottom))] pt-xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={defaultSpring}
          >
            {next ? (
              <>
                <h2 className="text-h2">
                  Далі — {getMuseumShortLabel(next.museumId)}
                </h2>
                <p className="mt-sm text-body-md text-text-secondary">
                  {/* TODO(copy): one short line from the next artwork passport */}
                  {next.artwork.title}
                </p>
                <div className="mt-lg">
                  <Button onClick={onDepart}>Вирушити</Button>
                </div>
              </>
            ) : (
              <p className="text-body-md text-text-secondary">
                Усі шляхи цього маршруту пройдено.
              </p>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
