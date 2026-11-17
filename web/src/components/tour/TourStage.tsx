"use client";

import { ProgressStepper } from "@/components/ui";
import type { Artwork } from "@/data/types";
import { getZoneRect } from "@/data/zone-layouts";
import { createSilentAudio } from "@/lib/audio";
import {
  lensCamera,
  resolveStopTarget,
  stopDurationSec,
} from "@/lib/tour-camera";
import {
  easings,
  motionTokens,
  useReducedMotionSafe,
} from "@/lib/motion";
import {
  animate,
  motion,
  useMotionValue,
} from "framer-motion";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TourRing } from "./TourRing";

type Mode = "tour" | "explore";

type Props = {
  artwork: Artwork;
  /** Called after zoom-out to full image (end of tour / Без гіда). */
  onTourDone: () => void;
  /** Start in explore (paused full image) for replay / collection. */
  startExplore?: boolean;
  className?: string;
};

const FRAME = { w: 390, h: 844 };

/**
 * Full-screen artwork stage: 4-stop tour + touch-zone explore.
 * Camera = motion values only; overlays stay constant screen size.
 */
export function TourStage({
  artwork,
  onTourDone,
  startExplore = false,
}: Props) {
  const reduced = useReducedMotionSafe();
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: FRAME.w, h: FRAME.h });
  const [imgNatural, setImgNatural] = useState({ w: 1200, h: 900 });
  const [mode, setMode] = useState<Mode>(startExplore ? "explore" : "tour");
  const [stopIdx, setStopIdx] = useState(0);
  const [paused, setPaused] = useState(startExplore);
  const [ringProgress, setRingProgress] = useState(0);
  const [zoneIdx, setZoneIdx] = useState<number | null>(null);
  const [textKey, setTextKey] = useState(0);
  const [loaded, setLoaded] = useState(() => !artwork.image);

  const camX = useMotionValue(0);
  const camY = useMotionValue(0);
  const camScale = useMotionValue(1);
  const dimOpacity = useMotionValue(0);

  const stops = artwork.tourStops;
  const stop = stops[stopIdx] ?? stops[0];
  const src = artwork.image;

  const imgDisplay = useMemo(() => {
    const scale = stage.w / imgNatural.w;
    return { w: stage.w, h: imgNatural.h * scale };
  }, [imgNatural.h, imgNatural.w, stage.w]);

  const audioRef = useRef(createSilentAudio(6));
  const ringRaf = useRef<number | null>(null);
  const ringStart = useRef(0);
  const ringDur = useRef(6);
  const advancing = useRef(false);
  const pausedRef = useRef(startExplore);
  const pauseOffset = useRef(0);
  const startStopRef = useRef<(idx: number) => void>(() => {});

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () =>
      setStage({ w: el.clientWidth || FRAME.w, h: el.clientHeight || FRAME.h });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const applyFit = useCallback(() => {
    const ty = (stage.h - imgDisplay.h) / 2;
    camX.set(0);
    camY.set(ty);
    camScale.set(1);
    dimOpacity.set(0);
  }, [camScale, camX, camY, dimOpacity, imgDisplay.h, stage.h]);

  const flyTo = useCallback(
    (nx: number, ny: number, zoom: number, duration: number, onDone?: () => void) => {
      const cam = lensCamera(
        nx,
        ny,
        zoom,
        stage.w,
        stage.h,
        imgDisplay.w,
        imgDisplay.h,
      );
      if (reduced || duration <= 0) {
        camX.set(cam.tx);
        camY.set(cam.ty);
        camScale.set(cam.scale);
        dimOpacity.set(0.35);
        onDone?.();
        return;
      }
      const opts = { duration, ease: easings.easeInOut } as const;
      animate(camX, cam.tx, opts);
      animate(camY, cam.ty, opts);
      animate(dimOpacity, 0.35, { duration, ease: easings.easeOut });
      animate(camScale, cam.scale, {
        ...opts,
        onComplete: () => onDone?.(),
      });
    },
    [camScale, camX, camY, dimOpacity, imgDisplay.h, imgDisplay.w, reduced, stage.h, stage.w],
  );

  const goFull = useCallback(
    (duration: number, onDone?: () => void) => {
      const ty = (stage.h - imgDisplay.h) / 2;
      if (reduced || duration <= 0) {
        camX.set(0);
        camY.set(ty);
        camScale.set(1);
        dimOpacity.set(0);
        onDone?.();
        return;
      }
      const opts = { duration, ease: easings.easeInOut } as const;
      animate(camX, 0, opts);
      animate(camY, ty, opts);
      animate(dimOpacity, 0, { duration: duration * 0.6, ease: easings.easeOut });
      animate(camScale, 1, { ...opts, onComplete: () => onDone?.() });
    },
    [camScale, camX, camY, dimOpacity, imgDisplay.h, reduced, stage.h],
  );

  const finishTour = useCallback(() => {
    setMode("explore");
    setPaused(true);
    setRingProgress(0);
    if (ringRaf.current) cancelAnimationFrame(ringRaf.current);
    audioRef.current.stop();
    goFull(reduced ? motionTokens.reducedCrossfade : motionTokens.tourExitZoom, () => {
      onTourDone();
    });
  }, [goFull, onTourDone, reduced]);

  const startStop = useCallback(
    (idx: number) => {
      const s = stops[idx];
      if (!s) {
        finishTour();
        return;
      }
      advancing.current = false;
      setStopIdx(idx);
      setTextKey((k) => k + 1);
      pausedRef.current = false;
      setPaused(false);
      setRingProgress(0);
      const target = resolveStopTarget(s, artwork.touchZones);
      const dur = stopDurationSec(s.text);
      ringDur.current = dur;
      audioRef.current = createSilentAudio(dur);
      flyTo(
        target.x,
        target.y,
        target.zoom,
        reduced ? motionTokens.reducedCrossfade : motionTokens.lens,
        () => {
          audioRef.current.play();
          ringStart.current = performance.now();
          const tick = () => {
            if (pausedRef.current) {
              ringRaf.current = requestAnimationFrame(tick);
              return;
            }
            const t = (performance.now() - ringStart.current) / (ringDur.current * 1000);
            setRingProgress(Math.min(1, t));
            if (t >= 1) {
              if (!advancing.current) {
                advancing.current = true;
                if (idx >= stops.length - 1) finishTour();
                else startStopRef.current(idx + 1);
              }
              return;
            }
            ringRaf.current = requestAnimationFrame(tick);
          };
          ringRaf.current = requestAnimationFrame(tick);
        },
      );
    },
    [artwork.touchZones, finishTour, flyTo, reduced, stops],
  );

  useEffect(() => {
    startStopRef.current = startStop;
  }, [startStop]);

  useEffect(() => {
    if (!loaded) return;
    applyFit();
    if (startExplore) return;
    const t = setTimeout(() => startStopRef.current(0), 50);
    return () => {
      clearTimeout(t);
      if (ringRaf.current) cancelAnimationFrame(ringRaf.current);
    };
  }, [applyFit, loaded, startExplore]);

  const togglePause = () => {
    if (mode !== "tour") return;
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    if (next) {
      pauseOffset.current = performance.now() - ringStart.current;
      audioRef.current.pause();
    } else {
      ringStart.current = performance.now() - pauseOffset.current;
      audioRef.current.play();
    }
  };

  const nextStop = () => {
    if (ringRaf.current) cancelAnimationFrame(ringRaf.current);
    audioRef.current.stop();
    if (stopIdx >= stops.length - 1) finishTour();
    else startStop(stopIdx + 1);
  };

  const onImageTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== "explore") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const zones = artwork.touchZones.zones;
    let hit = -1;
    for (let i = 0; i < zones.length; i++) {
      const r = getZoneRect(artwork.touchZones.grid, zones[i].position);
      if (nx >= r.x && nx <= r.x + r.w && ny >= r.y && ny <= r.y + r.h) {
        hit = i;
        break;
      }
    }
    if (hit < 0) {
      // fallback: nearest zone center
      hit = 0;
    }
    if (zoneIdx === hit) {
      setZoneIdx(null);
      goFull(reduced ? motionTokens.reducedCrossfade : motionTokens.lens);
      return;
    }
    setZoneIdx(hit);
    const r = getZoneRect(artwork.touchZones.grid, zones[hit].position);
    flyTo(
      r.x + r.w / 2,
      r.y + r.h / 2,
      2.2,
      reduced ? motionTokens.reducedCrossfade : motionTokens.lens,
    );
  };

  const zone = zoneIdx != null ? artwork.touchZones.zones[zoneIdx] : null;

  return (
    <div ref={stageRef} className="absolute inset-0 z-20 overflow-hidden bg-screen">
      {/* Skeleton */}
      {!loaded ? (
        <div className="absolute inset-0 animate-pulse bg-surface" aria-busy />
      ) : null}

      <motion.div
        className="absolute left-0 top-0"
        style={{
          x: camX,
          y: camY,
          scale: camScale,
          transformOrigin: "0 0",
          width: imgDisplay.w,
          height: imgDisplay.h,
          opacity: loaded ? 1 : 0,
        }}
        onClick={onImageTap}
      >
        {src ? (
          <Image
            src={src}
            alt={artwork.title}
            width={imgNatural.w}
            height={imgNatural.h}
            className="block h-full w-full object-cover"
            priority
            onLoadingComplete={(img) => {
              if (img.naturalWidth) {
                setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
              }
              setLoaded(true);
            }}
            sizes="(max-width: 430px) 100vw, 430px"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-surface text-body-md text-text-secondary">
            {/* TODO(asset): missing artwork image */}
            Немає зображення
          </div>
        )}
        <motion.div
          className="pointer-events-none absolute inset-0 bg-black"
          style={{ opacity: dimOpacity }}
        />
      </motion.div>

      {/* Constant-size lens ring overlay (visual cue on tour) */}
      {mode === "tour" ? (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]"
          aria-hidden
        />
      ) : null}

      {/* Progress + copy */}
      {mode === "tour" && stop ? (
        <div className="pointer-events-none absolute inset-x-0 top-[calc(12px+var(--safe-top))] z-20 px-xl">
          <ProgressStepper total={stops.length} current={stopIdx + 1} />
          <motion.div
            key={textKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: motionTokens.stopCrossfade }}
            className="mt-lg"
          >
            <p className="text-overline uppercase text-text-accent">
              {stopIdx + 1}/{stops.length} · {stop.title}
            </p>
            <p className="mt-sm text-body-md text-text-primary">{stop.text}</p>
          </motion.div>
        </div>
      ) : null}

      {/* Controls */}
      {mode === "tour" ? (
        <div className="absolute inset-x-0 bottom-[calc(24px+var(--safe-bottom))] z-20 flex items-center justify-between px-xl">
          <button
            type="button"
            className="min-h-[44px] text-label-md text-text-secondary"
            onClick={finishTour}
          >
            Без гіда
          </button>
          <TourRing progress={ringProgress} paused={paused} onToggle={togglePause} />
          <button
            type="button"
            className="min-h-[44px] text-label-md text-text-accent"
            onClick={nextStop}
          >
            Далі
          </button>
        </div>
      ) : null}

      {/* Touch-zone sheet */}
      {mode === "explore" && zone ? (
        <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-lg border-t border-border-subtle bg-surface px-xl pb-[calc(24px+var(--safe-bottom))] pt-lg">
          <div className="flex items-start justify-between gap-md">
            <div>
              <p className="text-overline uppercase text-text-accent">{zone.label}</p>
              <p className="mt-2xs text-h3 text-text-primary">{zone.title}</p>
              <p className="mt-sm text-body-md text-text-secondary">{zone.text}</p>
            </div>
            <button
              type="button"
              aria-label="Закрити"
              className="size-11 text-text-secondary"
              onClick={() => {
                setZoneIdx(null);
                goFull(reduced ? motionTokens.reducedCrossfade : motionTokens.lens);
              }}
            >
              ×
            </button>
          </div>
          <button
            type="button"
            className="mt-md text-label-md text-text-accent"
            onClick={() => {
              // TODO(chat): Stage 7 — open guide with detail attached
            }}
          >
            Спитати гіда про це
          </button>
        </div>
      ) : null}

      {mode === "explore" && zoneIdx == null ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-32 z-10 px-xl text-center text-caption text-text-secondary">
          Підказка · тапни
        </p>
      ) : null}
    </div>
  );
}
