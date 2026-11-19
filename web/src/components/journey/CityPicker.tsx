"use client";

import {
  START_CITY_IDS,
  startCityLabel,
} from "@/data/start-cities";
import { cn } from "@/lib/cn";
import { useReducedMotionSafe } from "@/lib/motion";
import { useAppState } from "@/state/AppState";
import { useState } from "react";

type Props = {
  onPicked?: (cityId: string) => void;
};

/**
 * screen — design
 * Tap a chip → selected (150ms) → continue. No footer button.
 */
export function CityPicker({ onPicked }: Props) {
  const { setStartCityId } = useAppState();
  const reduced = useReducedMotionSafe();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pick = (id: string) => {
    if (selectedId) return;
    setSelectedId(id);
    const delay = reduced ? 0 : 150;
    window.setTimeout(() => {
      setStartCityId(id);
      onPicked?.(id);
    }, delay);
  };

  return (
    <div className="flex h-full flex-col bg-screen text-text-primary">
      <div className="flex flex-1 flex-col gap-2xl overflow-y-auto px-xl pb-[calc(32px+var(--safe-bottom))] pt-[calc(24px+var(--safe-top))]">
        <header className="flex flex-col gap-sm">
          <h1 className="text-h1 tracking-[-0.02em]">Звідки починаємо шлях?</h1>
          <p className="text-body-md text-text-secondary">
            Обери місто — і ми прокладемо шлях до твору, який зараз неможливо
            побачити.
          </p>
        </header>

        <div className="flex flex-wrap content-start gap-[6px]">
          {START_CITY_IDS.map((id) => {
            const active = selectedId === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                disabled={Boolean(selectedId) && !active}
                onClick={() => pick(id)}
                className={cn(
                  "inline-flex h-[42px] min-h-[42px] items-center rounded-pill border px-[14px] text-[15px] font-medium leading-none transition-colors duration-150",
                  active
                    ? "border-border-accent bg-accent-selected text-text-primary"
                    : "border-border-subtle bg-surface-raised text-text-primary",
                )}
              >
                {startCityLabel(id)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
