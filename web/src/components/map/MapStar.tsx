"use client";

import { cn } from "@/lib/cn";
import { defaultSpring, motionTokens, useReducedMotionSafe } from "@/lib/motion";
import { motion } from "framer-motion";

type Props = {
  x: number;
  y: number;
  /** Outer size in SVG px (target ~22, visited ~14). */
  size?: number;
  label?: string;
  labelSide?: "left" | "right";
  /** Stronger glow for the current target. */
  glow?: "strong" | "soft" | "none";
  /** Label uses primary (target) or secondary (visited). */
  labelTone?: "primary" | "secondary";
  pulsing?: boolean;
  appear?: boolean;
  className?: string;
  onClick?: () => void;
};

/** 4-point sparkle path centered at 0,0 for a given half-size. */
function starPath(half: number): string {
  const tip = half;
  const waist = half * 0.22;
  return [
    `M0 ${-tip}`,
    `L${waist} ${-waist}`,
    `L${tip} 0`,
    `L${waist} ${waist}`,
    `L0 ${tip}`,
    `L${-waist} ${waist}`,
    `L${-tip} 0`,
    `L${-waist} ${-waist}`,
    "Z",
  ].join(" ");
}

/**
 * Reusable map sparkle — current target (~22px + glow) or visited constellation (~14px).
 */
export function MapStar({
  x,
  y,
  size = 22,
  label,
  labelSide = "right",
  glow = "strong",
  labelTone = "primary",
  pulsing = false,
  appear = false,
  className,
  onClick,
}: Props) {
  const reduced = useReducedMotionSafe();
  const half = size / 2;
  const fill = "var(--color-bg-accent)";
  const labelFill =
    labelTone === "secondary"
      ? "var(--color-text-secondary)"
      : "var(--color-text-primary)";
  const glowR = glow === "strong" ? half * 1.55 : half * 1.2;
  const glowOp = glow === "strong" ? 0.45 : glow === "soft" ? 0.22 : 0;

  const marker = (
    <>
      {glow !== "none" ? (
        <circle
          r={glowR}
          fill={fill}
          opacity={glowOp}
          style={{ filter: `blur(${glow === "strong" ? 5 : 3}px)` }}
        />
      ) : null}
      {pulsing && !reduced ? (
        <circle r={half + 2} fill="none" stroke={fill} strokeOpacity={0.45}>
          <animate
            attributeName="r"
            values={`${half};${half + 8};${half}`}
            dur={`${motionTokens.pinPulse.duration}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-opacity"
            values="0.45;0;0.45"
            dur={`${motionTokens.pinPulse.duration}s`}
            repeatCount="indefinite"
          />
        </circle>
      ) : null}
      <path d={starPath(half)} fill={fill} />
      {label ? (
        <text
          x={labelSide === "left" ? -(half + 6) : half + 6}
          y={4}
          textAnchor={labelSide === "left" ? "end" : "start"}
          fill={labelFill}
          fontSize={labelTone === "primary" ? 16 : 12}
          fontWeight={labelTone === "primary" ? 600 : 500}
          fontFamily="var(--font-manrope), sans-serif"
        >
          {label}
        </text>
      ) : null}
    </>
  );

  return (
    <g
      transform={`translate(${x} ${y})`}
      className={cn(className)}
      role={onClick ? "button" : "img"}
      tabIndex={onClick ? 0 : undefined}
      aria-label={label ?? "Зірка на карті"}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      {appear && !reduced ? (
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={defaultSpring}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          {marker}
        </motion.g>
      ) : (
        <g>{marker}</g>
      )}
    </g>
  );
}
