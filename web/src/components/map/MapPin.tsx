"use client";

import { cn } from "@/lib/cn";
import { defaultSpring } from "@/lib/motion";
import { motion } from "framer-motion";

export type MapPinVariant = "start" | "target" | "museum" | "star";

type Props = {
  x: number;
  y: number;
  label?: string;
  /** Label placement relative to the marker */
  labelSide?: "top" | "right" | "left" | "bottom";
  labelDy?: number;
  variant?: MapPinVariant;
  pulsing?: boolean;
  /** Spring scale-in on the inner group only (never CSS-transform the outer translate). */
  appear?: boolean;
  className?: string;
  onClick?: () => void;
};

/**
 * Figma Map Pin 71:684 — SVG coordinate space.
 * Outer `<g transform="translate(x y)">` stays attribute-based;
 * animations only touch an inner group.
 */
export function MapPin({
  x,
  y,
  label,
  labelSide = "top",
  labelDy = 0,
  variant = "start",
  pulsing = false,
  appear = false,
  className,
  onClick,
}: Props) {
  const fill =
    variant === "star" ||
    variant === "target" ||
    variant === "museum" ||
    variant === "start"
      ? "var(--color-bg-accent)"
      : "var(--color-text-primary)";

  const marker =
    variant === "star" ? (
      <path
        d="M0 -8 L2.4 -2.4 L8 -2.4 L3.6 1.2 L5.2 7.2 L0 3.6 L-5.2 7.2 L-3.6 1.2 L-8 -2.4 L-2.4 -2.4 Z"
        fill={fill}
      />
    ) : variant === "target" || variant === "museum" ? (
      <>
        <circle r={12} fill="none" stroke={fill} strokeWidth={2} />
        <circle r={4} fill={fill} />
      </>
    ) : (
      /* start — Figma «You» 24px: ring + gold dot */
      <>
        <circle r={10} fill="none" stroke={fill} strokeWidth={1.5} />
        <circle r={3.5} fill={fill} />
      </>
    );

  const labelPos =
    labelSide === "right"
      ? { x: 18, y: 5 + labelDy, anchor: "start" as const, size: 14 }
      : labelSide === "left"
        ? { x: -18, y: 5 + labelDy, anchor: "end" as const, size: 14 }
        : labelSide === "bottom"
          ? { x: 0, y: 20 + labelDy, anchor: "middle" as const, size: 12 }
          : { x: 0, y: -16 + labelDy, anchor: "middle" as const, size: 12 };
  const labelEl = label ? (
    <text
      x={labelPos.x}
      y={labelPos.y}
      textAnchor={labelPos.anchor}
      fill="var(--color-text-primary)"
      fontSize={labelPos.size}
      fontWeight={600}
      fontFamily="var(--font-manrope), sans-serif"
    >
      {label}
    </text>
  ) : null;

  const inner = (
    <>
      {pulsing ? (
        <circle r={14} fill="none" stroke={fill} strokeOpacity={0.55}>
          <animate attributeName="r" values="10;20;10" dur="1.6s" repeatCount="indefinite" />
          <animate
            attributeName="stroke-opacity"
            values="0.55;0;0.55"
            dur="1.6s"
            repeatCount="indefinite"
          />
        </circle>
      ) : null}
      {marker}
      {labelEl}
    </>
  );

  return (
    <g
      transform={`translate(${x} ${y})`}
      className={cn(className)}
      role={onClick ? "button" : "img"}
      tabIndex={onClick ? 0 : undefined}
      aria-label={label ?? "Мітка на карті"}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      {appear ? (
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={defaultSpring}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          {inner}
        </motion.g>
      ) : (
        <g>{inner}</g>
      )}
    </g>
  );
}
