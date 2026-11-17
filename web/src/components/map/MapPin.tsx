import { cn } from "@/lib/cn";

export type MapPinVariant = "start" | "target" | "museum" | "star";

type Props = {
  x: number;
  y: number;
  label?: string;
  variant?: MapPinVariant;
  pulsing?: boolean;
  className?: string;
};

/**
 * Figma Map Pin 71:684 — SVG coordinate space (x/y in viewBox units).
 * Stage 4 animates these.
 */
export function MapPin({
  x,
  y,
  label,
  variant = "start",
  pulsing = false,
  className,
}: Props) {
  const fill =
    variant === "star" || variant === "target" || variant === "museum"
      ? "var(--color-bg-accent)"
      : "var(--color-text-primary)";

  return (
    <g
      transform={`translate(${x} ${y})`}
      className={cn(className)}
      role="img"
      aria-label={label ?? "Мітка на карті"}
    >
      {pulsing ? (
        <circle r={14} fill="none" stroke={fill} strokeOpacity={0.5}>
          <animate attributeName="r" values="8;18;8" dur="1.6s" repeatCount="indefinite" />
          <animate
            attributeName="stroke-opacity"
            values="0.6;0;0.6"
            dur="1.6s"
            repeatCount="indefinite"
          />
        </circle>
      ) : null}
      {variant === "star" ? (
        <path
          d="M0 -8 L2.4 -2.4 L8 -2.4 L3.6 1.2 L5.2 7.2 L0 3.6 L-5.2 7.2 L-3.6 1.2 L-8 -2.4 L-2.4 -2.4 Z"
          fill={fill}
        />
      ) : (
        <circle r={6} fill={fill} />
      )}
      {label ? (
        <text
          y={-14}
          textAnchor="middle"
          fill="var(--color-text-primary)"
          fontSize={11}
          fontFamily="var(--font-manrope), sans-serif"
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}
