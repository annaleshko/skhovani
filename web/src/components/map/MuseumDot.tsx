"use client";

import { cn } from "@/lib/cn";
import { MAP_LABEL_GAP_SVG } from "@/lib/map-label";

type Props = {
  x: number;
  y: number;
  label: string;
  /** Label side relative to the 14px ring. */
  labelSide?: "left" | "right" | "top" | "bottom";
  labelDy?: number;
  /** Dim / passed (gold) / next (gold + optional pulse). */
  tone?: "dim" | "passed" | "next";
  pulsing?: boolean;
  className?: string;
  onClick?: () => void;
};

/**
 * Figma «Музей · …» — 14px ring + 6px dot, 12px label `text/secondary`.
 * Used on screens 02 and 02в for non-target museums.
 */
export function MuseumDot({
  x,
  y,
  label,
  labelSide = "right",
  labelDy = 0,
  tone = "dim",
  pulsing = false,
  className,
  onClick,
}: Props) {
  const stroke =
    tone === "dim" ? "var(--color-text-secondary)" : "var(--color-bg-accent)";
  const fill =
    tone === "dim" ? "var(--color-text-secondary)" : "var(--color-bg-accent)";
  const labelFill =
    tone === "dim" ? "var(--color-text-secondary)" : "var(--color-text-primary)";
  const opacity = tone === "dim" ? 0.85 : 1;
  // Visual ring r=7 + small gap (not the 44×44 hit radius).
  const gap = 7 + MAP_LABEL_GAP_SVG;
  const labelPos =
    labelSide === "left"
      ? { x: -gap, y: 4 + labelDy, anchor: "end" as const }
      : labelSide === "right"
        ? { x: gap, y: 4 + labelDy, anchor: "start" as const }
        : labelSide === "top"
          ? { x: 0, y: -gap - 2 + labelDy, anchor: "middle" as const }
          : { x: 0, y: gap + 10 + labelDy, anchor: "middle" as const };

  return (
    <g
      transform={`translate(${x} ${y})`}
      className={cn(className)}
      role="img"
      aria-hidden={onClick ? true : undefined}
      aria-label={onClick ? undefined : label}
      style={{ pointerEvents: "none" }}
      opacity={opacity}
    >
      {pulsing ? (
        <circle r={10} fill="none" stroke={stroke} strokeOpacity={0.5}>
          <animate attributeName="r" values="8;16;8" dur="1.6s" repeatCount="indefinite" />
          <animate
            attributeName="stroke-opacity"
            values="0.5;0;0.5"
            dur="1.6s"
            repeatCount="indefinite"
          />
        </circle>
      ) : null}
      {/* Soft gold glow for passed museums (02в) */}
      {tone === "passed" ? (
        <circle
          r={12}
          fill={fill}
          opacity={0.22}
          style={{ filter: "blur(4px)" }}
        />
      ) : null}
      {/* 14px ring, 6px dot */}
      <circle r={7} fill="none" stroke={stroke} strokeWidth={1.25} />
      <circle r={3} fill={fill} />
      {/* 6px gap from ring edge (r=7 → ±13) */}
      <text
        x={labelPos.x}
        y={labelPos.y}
        textAnchor={labelPos.anchor}
        fill={labelFill}
        fontSize={12}
        fontWeight={500}
        fontFamily="var(--font-manrope), sans-serif"
      >
        {label}
      </text>
    </g>
  );
}
