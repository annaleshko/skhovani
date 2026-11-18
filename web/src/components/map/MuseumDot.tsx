"use client";

import { cn } from "@/lib/cn";

type Props = {
  x: number;
  y: number;
  label: string;
  /** Label side relative to the 14px ring. */
  labelSide?: "left" | "right";
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

  return (
    <g
      transform={`translate(${x} ${y})`}
      className={cn(className)}
      role={onClick ? "button" : "img"}
      tabIndex={onClick ? 0 : undefined}
      aria-label={label}
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
      <text
        x={labelSide === "left" ? -10 : 10}
        y={4}
        textAnchor={labelSide === "left" ? "end" : "start"}
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
