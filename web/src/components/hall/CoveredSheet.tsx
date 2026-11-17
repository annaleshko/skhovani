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

/** Figma 12б — tap on a covered frame. */
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
            className="relative z-10 w-full rounded-t-lg border-t border-border-subtle bg-surface px-xl pb-[calc(24px+var(--safe-bottom))] pt-xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={defaultSpring}
          >
            <p id="covered-title" className="text-h2 text-text-primary">
              Сховано до наступного шляху
            </p>
            <p className="mt-sm text-body-md text-text-secondary">
              {eraLineFromYear(year)}
            </p>
            <p className="mt-md text-body-md text-text-secondary">
              {/* TODO(copy): confirm city locative */}
              Що це за твір — дізнаєшся, коли шлях знову приведе тебе до {city}
            </p>
            <div className="mt-lg">
              <Button onClick={onClose}>Зрозуміло</Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
