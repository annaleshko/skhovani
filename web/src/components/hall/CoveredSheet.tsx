"use client";

import { Button } from "@/components/ui";
import { eraLineFromYear } from "@/lib/era";
import { defaultSpring, motionTokens } from "@/lib/motion";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  open: boolean;
  city: string;
  year: string;
  onClose: () => void;
};

/** Genitive for «приведе тебе до X» (Figma 12б uses «до Херсона»). */
function cityGenitive(city: string): string {
  const map: Record<string, string> = {
    Херсон: "Херсона",
    Мелітополь: "Мелітополя",
    Харків: "Харкова",
    Львів: "Львова",
    Чернігів: "Чернігова",
  };
  return map[city] ?? city;
}

/**
 * Figma 12б (`125:6530`) — tap on a covered frame.
 * Ref: docs/figma-refs/12b-hidden-artwork.png
 */
export function CoveredSheet({ open, city, year, onClose }: Props) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="absolute inset-0 z-40 flex items-end justify-center">
          <motion.button
            type="button"
            aria-label="Закрити"
            className="absolute inset-0 bg-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.scrim }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-labelledby="covered-title"
            className="relative z-10 w-full rounded-t-lg border-t border-border-subtle bg-surface"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={defaultSpring}
          >
            <div className="flex flex-col gap-lg px-xl pt-xl">
              <p className="text-overline uppercase tracking-[0.08em] text-text-accent">
                Сховано до наступного шляху
              </p>
              <div className="flex flex-col gap-2xs">
                <p id="covered-title" className="text-h2 text-text-primary">
                  {eraLineFromYear(year)}
                </p>
                <p className="text-body-md text-text-secondary">
                  Що це за твір — дізнаєшся, коли шлях знову приведе тебе до{" "}
                  {cityGenitive(city)}. Кожен шлях відкриває один твір.
                </p>
              </div>
            </div>
            <div className="px-xl py-xl pb-[calc(24px+var(--safe-bottom))]">
              <Button onClick={onClose}>Зрозуміло</Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
