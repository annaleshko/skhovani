"use client";

import { pointOnQuad, type MapPoint } from "@/lib/geo";
import { easings, motionTokens, useReducedMotionSafe } from "@/lib/motion";
import { motion } from "framer-motion";
import { useMemo } from "react";

type Props = {
  start: MapPoint;
  ctrl: MapPoint;
  end: MapPoint;
  /** Dot diameter in SVG px. */
  dot?: number;
  /** Gap between dot centers. */
  gap?: number;
  /** Stroke opacity 0–1. */
  opacity?: number;
  /** Animate draw-in when the route key changes. */
  animateDraw?: boolean;
  routeKey?: string;
};

function approxQuadLength(a: MapPoint, c: MapPoint, b: MapPoint): number {
  let len = 0;
  let prev = a;
  for (let i = 1; i <= 24; i++) {
    const p = pointOnQuad(a, c, b, i / 24);
    len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return len;
}

/**
 * Curved route as round gold dots (not a dashed stroke).
 * Draw-in ~800ms; reduced-motion shows all dots at once.
 */
export function DottedRoute({
  start,
  ctrl,
  end,
  dot = 2,
  gap = 6,
  opacity = 0.6,
  animateDraw = true,
  routeKey,
}: Props) {
  const reduced = useReducedMotionSafe();
  const dots = useMemo(() => {
    const len = approxQuadLength(start, ctrl, end);
    const n = Math.max(2, Math.round(len / gap));
    return Array.from({ length: n + 1 }, (_, i) =>
      pointOnQuad(start, ctrl, end, i / n),
    );
  }, [ctrl, end, gap, start]);

  const showAll = reduced || !animateDraw;

  return (
    <g key={routeKey} opacity={opacity} aria-hidden>
      {dots.map((p, i) =>
        showAll ? (
          <circle
            key={`${routeKey ?? "r"}-${i}`}
            cx={p.x}
            cy={p.y}
            r={dot / 2}
            fill="var(--color-bg-accent)"
          />
        ) : (
          <motion.circle
            key={`${routeKey ?? "r"}-${i}`}
            cx={p.x}
            cy={p.y}
            r={dot / 2}
            fill="var(--color-bg-accent)"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.2,
              delay:
                (i / Math.max(1, dots.length - 1)) * motionTokens.dottedDraw,
              ease: easings.easeOut,
            }}
          />
        ),
      )}
    </g>
  );
}
