"use client";

import { POINTER_RING_PX } from "@/lib/tour-camera";
import { easings, motionTokens } from "@/lib/motion";
import { motion } from "framer-motion";

type Props = {
  /** Ring center in stage coords (detail point after camera arrives). */
  cx: number;
  cy: number;
  /** 0–1 stop timer — drawn on the outer ring. */
  progress?: number;
  reduced?: boolean;
};

const OUTER_GAP = 10;
const FEATHER = 40;
const DIAMETER = POINTER_RING_PX;

/**
 * Small pointer ring — marks the detail the stop text describes.
 * Screen-space; no magnification inside.
 */
export function TourMagnifier({
  cx,
  cy,
  progress = 0,
  reduced = false,
}: Props) {
  const r = DIAMETER / 2;
  const outerR = r + OUTER_GAP;
  const svgSize = outerR * 2 + 4;
  const circ = 2 * Math.PI * outerR;
  const dashOffset = circ * (1 - Math.min(1, Math.max(0, progress)));

  const mask = `radial-gradient(circle ${r}px at ${cx}px ${cy}px, transparent ${Math.max(0, r - FEATHER)}px, #000 ${r}px)`;

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-[3]"
      initial={{ opacity: 0, scale: reduced ? 1 : 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: reduced ? 1 : 0.9 }}
      transition={
        reduced
          ? { duration: motionTokens.reducedCrossfade, ease: easings.easeOut }
          : { duration: motionTokens.lensAppear, ease: easings.easeOut }
      }
      style={{ transformOrigin: `${cx}px ${cy}px` }}
      aria-hidden
    >
      {/* Soft dim outside the ring */}
      <div
        className="absolute inset-0 bg-hall-dark"
        style={{
          opacity: 0.35,
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      />

      <svg
        width={svgSize}
        height={svgSize}
        className="absolute -rotate-90"
        style={{
          left: cx - svgSize / 2,
          top: cy - svgSize / 2,
        }}
      >
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={outerR}
          fill="none"
          stroke="var(--color-bg-accent)"
          strokeOpacity={0.4}
          strokeWidth={1}
        />
        {progress > 0 ? (
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={outerR}
            fill="none"
            stroke="var(--color-bg-accent)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={dashOffset}
          />
        ) : null}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={r}
          fill="none"
          stroke="var(--color-bg-accent)"
          strokeWidth={2}
        />
      </svg>
    </motion.div>
  );
}
