"use client";

import type { TouchZone } from "@/data/types";
import { easings, motionTokens } from "@/lib/motion";
import { motion } from "framer-motion";

type Props = {
  zone: TouchZone;
  sourceUrl: string | null;
  onClose: () => void;
  onAskGuide: () => void;
};

/** 08 detail card — slides up from the bottom over the passport.*/
export function DetailCard({ zone, sourceUrl, onClose, onAskGuide }: Props) {
  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 z-[40] mx-auto flex w-full max-w-[430px] flex-col gap-lg rounded-t-lg border-t border-border-subtle bg-surface px-xl pb-[calc(24px+var(--safe-bottom))] pt-lg"
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ duration: motionTokens.sheetSlide, ease: easings.easeOut }}
      role="dialog"
      aria-label={zone.title}
    >
      <button
        type="button"
        aria-label="Закрити"
        className="absolute right-md top-md flex size-10 items-center justify-center rounded-full border border-border-subtle bg-surface text-text-secondary"
        onClick={onClose}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ui/icon-close.svg" alt="" width={20} height={20} />
      </button>

      <div className="pr-xl">
        <p className="text-overline uppercase text-text-secondary">Деталь</p>
        <h3 className="mt-2xs text-h3 text-text-primary">{zone.title}</h3>
        <p className="mt-sm text-body-md text-text-primary">{zone.text}</p>
      </div>

      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center gap-sm text-label-md text-text-accent"
        >
          <span aria-hidden>↗</span>
          З паспорта твору
        </a>
      ) : (
        <span className="text-label-md text-text-secondary">
          З паспорта твору
        </span>
      )}

      <button
        type="button"
        onClick={onAskGuide}
        className="flex min-h-[48px] w-full items-center justify-center rounded-md border border-border-button bg-surface-raised px-lg text-label-md text-text-primary"
      >
        Спитати гіда про це
      </button>
    </motion.div>
  );
}
