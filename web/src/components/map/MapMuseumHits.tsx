"use client";

import { MAP_VIEWBOX } from "@/lib/geo";

export type MapHitTarget = {
  id: string;
  /** SVG viewBox x */
  x: number;
  /** SVG viewBox y */
  y: number;
  /** Accessible name (= city). */
  label: string;
};

type Props = {
  targets: MapHitTarget[];
  onSelect: (id: string) => void;
  /** CSS px — minimum touch target. */
  hitPx?: number;
  className?: string;
};

/**
 * HTML button overlay for map markers: 44×44 centered on each point.
 * Overlapping hits resolve by nearest marker center (pointer position), not DOM order.
 * Keyboard focus uses the focused button's own id.
 */
export function MapMuseumHits({
  targets,
  onSelect,
  hitPx = 44,
  className,
}: Props) {
  const layerRef = (el: HTMLDivElement | null) => {
    // stored via closure on events through currentTarget
    void el;
  };

  const resolveNearest = (
    clientX: number,
    clientY: number,
    layer: HTMLElement,
  ): string | null => {
    const rect = layer.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const sx = ((clientX - rect.left) / rect.width) * MAP_VIEWBOX.w;
    const sy = ((clientY - rect.top) / rect.height) * MAP_VIEWBOX.h;
    const hitR = (hitPx / 2 / rect.width) * MAP_VIEWBOX.w;
    let bestId: string | null = null;
    let bestD = Infinity;
    for (const t of targets) {
      const d = Math.hypot(t.x - sx, t.y - sy);
      if (d <= hitR && d < bestD) {
        bestD = d;
        bestId = t.id;
      }
    }
    return bestId;
  };

  return (
    <div
      ref={layerRef}
      className={className}
      style={{ pointerEvents: "none" }}
    >
      {targets.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-label={t.label}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent"
          style={{
            left: `${(t.x / MAP_VIEWBOX.w) * 100}%`,
            top: `${(t.y / MAP_VIEWBOX.h) * 100}%`,
            width: hitPx,
            height: hitPx,
            minWidth: hitPx,
            minHeight: hitPx,
            pointerEvents: "auto",
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const layer = e.currentTarget.parentElement;
            if (!layer) {
              onSelect(t.id);
              return;
            }
            const nearest = resolveNearest(e.clientX, e.clientY, layer);
            onSelect(nearest ?? t.id);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(t.id);
            }
          }}
        />
      ))}
    </div>
  );
}
