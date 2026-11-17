"use client";

import { Button, Chip } from "@/components/ui";
import { getArtworks } from "@/data";
import { resolveStopTarget } from "@/lib/tour-camera";
import type { TourStop } from "@/data/types";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

/**
 * Dev-only tour stop calibrator.
 * Tap image → set x/y (0–1); slider → zoom 1–5; Copy JSON for content patch.
 * Hidden from production nav; route still exists in prod but is unlabeled.
 */
export default function CalibratePage() {
  const artworks = useMemo(
    () => getArtworks().filter((a) => a.image && a.tourStops.length),
    [],
  );
  const [slug, setSlug] = useState(artworks[0]?.slug ?? "");
  const artwork = artworks.find((a) => a.slug === slug) ?? artworks[0];
  const [stopN, setStopN] = useState(1);
  const [drafts, setDrafts] = useState<Record<string, TourStop[]>>({});

  const stops = drafts[artwork?.slug ?? ""] ?? artwork?.tourStops ?? [];
  const stop = stops.find((s) => s.n === stopN) ?? stops[0];

  const updateStop = (patch: Partial<TourStop>) => {
    if (!artwork) return;
    const next = stops.map((s) => (s.n === stopN ? { ...s, ...patch } : s));
    setDrafts((d) => ({ ...d, [artwork.slug]: next }));
  };

  const resolved = stop && artwork ? resolveStopTarget(stop, artwork.touchZones) : null;

  const copyJson = async (all = false) => {
    if (!artwork) return;
    const payload = all
      ? Object.fromEntries(
          artworks.map((a) => [a.slug, drafts[a.slug] ?? a.tourStops]),
        )
      : { [artwork.slug]: stops };
    const text = JSON.stringify(payload, null, 2);
    await navigator.clipboard.writeText(text);
    alert(all ? "Скопійовано всі stops" : `Скопійовано stops для ${artwork.slug}`);
  };

  if (!artwork) {
    return <div className="min-h-dvh bg-screen p-xl text-text-secondary">Немає творів</div>;
  }

  return (
    <main className="min-h-dvh bg-screen px-xl pb-2xl pt-[calc(48px+var(--safe-top))] text-text-primary">
      <div className="mb-md flex items-center justify-between">
        <Link href="/dev/tokens" className="text-label-md text-text-accent">
          ← Tokens
        </Link>
        <p className="text-label-md text-text-secondary">/dev/calibrate</p>
      </div>

      <h1 className="text-h2">Калібрування туру</h1>
      <p className="mt-sm text-caption text-text-secondary">
        Тап по зображенню ставить x/y. Слайдер — zoom. Copy JSON → встав у content.
      </p>

      <label className="mt-lg block text-label-md text-text-secondary">
        Твір
        <select
          className="mt-2xs block w-full rounded-md border-0 bg-surface px-md py-md text-text-primary"
          value={artwork.slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setStopN(1);
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
        {stops.map((s) => (
          <Chip key={s.n} active={s.n === stopN} onClick={() => setStopN(s.n)}>
            {s.n}. {s.title}
          </Chip>
        ))}
      </div>

      <div
        className="relative mt-lg aspect-[4/3] w-full overflow-hidden rounded-md bg-surface"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          const y = (e.clientY - rect.top) / rect.height;
          updateStop({ x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) });
        }}
      >
        {artwork.image ? (
          <Image src={artwork.image} alt="" fill className="object-contain" sizes="390px" />
        ) : null}
        {resolved ? (
          <span
            className="pointer-events-none absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent"
            style={{
              left: `${(stop.x ?? resolved.x) * 100}%`,
              top: `${(stop.y ?? resolved.y) * 100}%`,
              width: `${12 * (stop.zoom ?? resolved.zoom)}px`,
              height: `${12 * (stop.zoom ?? resolved.zoom)}px`,
            }}
          />
        ) : null}
      </div>

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

      <pre className="mt-md overflow-auto rounded-md bg-surface p-md text-caption text-text-secondary">
        {JSON.stringify(stop, null, 2)}
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
