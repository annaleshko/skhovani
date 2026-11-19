"use client";

import { Button, Chip } from "@/components/ui";
import { getArtworks } from "@/data";
import { getZonePoint } from "@/data/zone-layouts";
import { resolveStopTarget, tourImageSrc } from "@/lib/tour-camera";
import type { TourStop, TouchZone } from "@/data/types";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

type Mode = "stops" | "zones";

/**
 * Dev calibrator — same 0–1 space as tourStops / touch zone points.
 */
export default function CalibratePage() {
  const artworks = useMemo(
    () => getArtworks().filter((a) => a.image && a.tourStops.length),
    [],
  );
  const [slug, setSlug] = useState(artworks[0]?.slug ?? "");
  const artwork = artworks.find((a) => a.slug === slug) ?? artworks[0];
  const [mode, setMode] = useState<Mode>("stops");
  const [stopN, setStopN] = useState(1);
  const [zonePos, setZonePos] = useState(
    artwork?.touchZones.zones[0]?.position ?? "middle-center",
  );
  const [stopDrafts, setStopDrafts] = useState<Record<string, TourStop[]>>({});
  const [zoneDrafts, setZoneDrafts] = useState<Record<string, TouchZone[]>>({});
  const [natural, setNatural] = useState({ w: 4, h: 3 });
  const imgWrapRef = useRef<HTMLDivElement>(null);

  const stops = stopDrafts[artwork?.slug ?? ""] ?? artwork?.tourStops ?? [];
  const stop = stops.find((s) => s.n === stopN) ?? stops[0];
  const zones =
    zoneDrafts[artwork?.slug ?? ""] ?? artwork?.touchZones.zones ?? [];
  const zone =
    zones.find((z) => z.position === zonePos) ?? zones[0] ?? null;
  const src = artwork ? tourImageSrc(artwork) : null;
  const grid = artwork?.touchZones.grid ?? "3x3";

  const updateStop = (patch: Partial<TourStop>) => {
    if (!artwork) return;
    const next = stops.map((s) => (s.n === stopN ? { ...s, ...patch } : s));
    setStopDrafts((d) => ({ ...d, [artwork.slug]: next }));
  };

  const updateZone = (patch: Partial<TouchZone>) => {
    if (!artwork || !zone) return;
    const next = zones.map((z) =>
      z.position === zone.position ? { ...z, ...patch } : z,
    );
    setZoneDrafts((d) => ({ ...d, [artwork.slug]: next }));
  };

  const resolved =
    stop && artwork ? resolveStopTarget(stop, artwork.touchZones) : null;
  const zonePoint = zone ? getZonePoint(zone, grid) : null;

  const copyJson = async (all = false) => {
    if (!artwork) return;
    if (mode === "stops") {
      const payload = all
        ? Object.fromEntries(
            artworks.map((a) => [a.slug, stopDrafts[a.slug] ?? a.tourStops]),
          )
        : { [artwork.slug]: stops };
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      alert(all ? "Скопійовано всі stops" : `Stops: ${artwork.slug}`);
      return;
    }
    const payload = all
      ? Object.fromEntries(
          artworks.map((a) => [
            a.slug,
            zoneDrafts[a.slug] ?? a.touchZones.zones,
          ]),
        )
      : { [artwork.slug]: zones };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    alert(all ? "Скопійовано всі zones" : `Zones: ${artwork.slug}`);
  };

  const onImageTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const wrap = imgWrapRef.current;
    if (!wrap) return;
    const img = wrap.querySelector("img");
    if (!img) return;
    const ir = img.getBoundingClientRect();
    if (
      e.clientX < ir.left ||
      e.clientX > ir.right ||
      e.clientY < ir.top ||
      e.clientY > ir.bottom
    ) {
      return;
    }
    const x = Number(((e.clientX - ir.left) / ir.width).toFixed(3));
    const y = Number(((e.clientY - ir.top) / ir.height).toFixed(3));
    if (mode === "stops") updateStop({ x, y });
    else updateZone({ x, y });
  };

  if (!artwork) {
    return (
      <div className="h-full bg-screen p-xl text-text-secondary">
        Немає творів
      </div>
    );
  }

  const marker =
    mode === "stops"
      ? resolved
        ? {
            x: stop?.x ?? resolved.x,
            y: stop?.y ?? resolved.y,
            size: 12 * (stop?.zoom ?? resolved.zoom),
          }
        : null
      : zonePoint
        ? { x: zonePoint.x, y: zonePoint.y, size: 16 }
        : null;

  return (
    <main className="h-full bg-screen px-xl pb-2xl pt-[calc(48px+var(--safe-top))] text-text-primary">
      <div className="mb-md flex items-center justify-between">
        <Link href="/dev/tokens" className="text-label-md text-text-accent">
          ← Tokens
        </Link>
        <p className="text-label-md text-text-secondary">/dev/calibrate</p>
      </div>

      <h1 className="text-h2">Калібрування</h1>
      <p className="mt-sm text-caption text-text-secondary">
        x/y — частки всього складеного зображення (рама включно). Той самий простір
        для tourStops і touchZones.
      </p>

      <div className="mt-lg flex gap-sm">
        <Chip active={mode === "stops"} onClick={() => setMode("stops")}>
          Tour stops
        </Chip>
        <Chip active={mode === "zones"} onClick={() => setMode("zones")}>
          Touch zones
        </Chip>
      </div>

      <label className="mt-lg block text-label-md text-text-secondary">
        Твір
        <select
          className="mt-2xs block w-full rounded-md border-0 bg-surface px-md py-md text-text-primary"
          value={artwork.slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setStopN(1);
            const next = artworks.find((a) => a.slug === e.target.value);
            setZonePos(next?.touchZones.zones[0]?.position ?? "middle-center");
            setNatural({ w: 4, h: 3 });
          }}
        >
          {artworks.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.id}. {a.title}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-md flex flex-wrap gap-2xs">
        {mode === "stops"
          ? stops.map((s) => (
              <Chip
                key={s.n}
                active={s.n === stopN}
                onClick={() => setStopN(s.n)}
              >
                {s.n}. {s.title}
              </Chip>
            ))
          : zones.map((z) => (
              <Chip
                key={z.position}
                active={z.position === zone?.position}
                onClick={() => setZonePos(z.position)}
              >
                {z.title}
              </Chip>
            ))}
      </div>

      <div
        ref={imgWrapRef}
        className="relative mt-lg w-full overflow-hidden rounded-md bg-surface"
        style={{ aspectRatio: `${natural.w} / ${natural.h}` }}
        onClick={onImageTap}
      >
        {src ? (
          <Image
            src={src}
            alt=""
            fill
            className="object-contain"
            sizes="390px"
            unoptimized
            onLoadingComplete={(img) => {
              if (img.naturalWidth) {
                setNatural({ w: img.naturalWidth, h: img.naturalHeight });
              }
            }}
          />
        ) : null}
        {marker ? (
          <span
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent"
            style={{
              left: `${marker.x * 100}%`,
              top: `${marker.y * 100}%`,
              width: `${marker.size}px`,
              height: `${marker.size}px`,
            }}
          />
        ) : null}
      </div>

      {mode === "stops" ? (
        <label className="mt-lg block text-label-md text-text-secondary">
          Zoom {(stop?.zoom ?? resolved?.zoom ?? 2.4).toFixed(2)}
          <input
            type="range"
            min={1}
            max={5}
            step={0.1}
            className="mt-2xs w-full accent-[var(--color-bg-accent)]"
            value={stop?.zoom ?? resolved?.zoom ?? 2.4}
            onChange={(e) => updateStop({ zoom: Number(e.target.value) })}
          />
        </label>
      ) : null}

      <pre className="mt-md overflow-auto rounded-md bg-surface p-md text-caption text-text-secondary">
        {JSON.stringify(mode === "stops" ? stop : zone, null, 2)}
      </pre>

      <div className="mt-lg space-y-sm">
        <Button onClick={() => copyJson(false)}>Copy JSON</Button>
        <Button variant="secondary" onClick={() => copyJson(true)}>
          Copy all
        </Button>
      </div>
    </main>
  );
}
