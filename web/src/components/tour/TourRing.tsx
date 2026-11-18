"use client";

import { cn } from "@/lib/cn";

type Props = {
  progress: number; // 0–1
  paused?: boolean;
  className?: string;
  onToggle?: () => void;
};

/** Circular timer around Pause / Play. */
export function TourRing({ progress, paused, className, onToggle }: Props) {
  // Figma 100:1681 — 64×64 pause timer
  const size = 64;
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <button
      type="button"
      aria-label={paused ? "Відтворити" : "Пауза"}
      onClick={onToggle}
      className={cn(
        "relative flex size-16 min-h-[64px] min-w-[64px] items-center justify-center rounded-full",
        className,
      )}
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="var(--color-bg-surface)"
          stroke="var(--color-progress-inactive)"
          strokeWidth="3"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-bg-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="relative text-text-primary" aria-hidden>
        {paused ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
          </svg>
        )}
      </span>
    </button>
  );
}
