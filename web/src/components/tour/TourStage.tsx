"use client";

import { ProgressStepper } from "@/components/ui";
import { getHallAssets } from "@/data/halls";
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
import { TOUR_LAYOUT } from "./FramedArtwork";
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
  const hallUi = getHallAssets(artwork.museumId);
  const framedSrc = hallUi.tourFrame(artwork.id);
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
  /** Prefer composed frame+painting export (no white margins); fall back to raw art. */
  const src = framedSrc || artwork.image;

  const ui = stage.w / FRAME.w;
  const frameBox = useMemo(
    () => ({
      x: TOUR_LAYOUT.frame.x * ui,
      y: TOUR_LAYOUT.frame.y * ui,
      w: TOUR_LAYOUT.frame.w * ui,
      h: TOUR_LAYOUT.frame.h * ui,
    }),
    [ui],
  );
  /** Painting opening as 0–1 fractions inside the composed frame export. */
  const paintInFrame = useMemo(() => {
    const f = TOUR_LAYOUT.frame;
    const p = TOUR_LAYOUT.painting;
    return {
      x: (p.x - f.x) / f.w,
      y: (p.y - f.y) / f.h,
      w: p.w / f.w,
      h: p.h / f.h,
    };
  }, []);

  const toFrameNorm = useCallback(
    (nx: number, ny: number) => ({
      x: paintInFrame.x + nx * paintInFrame.w,
      y: paintInFrame.y + ny * paintInFrame.h,
    }),
    [paintInFrame],
  );

  // Composed frame group fills the Figma frame slot (x 24–366)
  const imgDisplay = useMemo(() => {
    const scale = frameBox.w / imgNatural.w;
    return { w: frameBox.w, h: imgNatural.h * scale };
  }, [frameBox.w, imgNatural.h, imgNatural.w]);

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
    camX.set(frameBox.x);
    camY.set(frameBox.y);
    camScale.set(1);
    dimOpacity.set(0);
  }, [camScale, camX, camY, dimOpacity, frameBox.x, frameBox.y]);

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
    [
      camScale,
      camX,
      camY,
      dimOpacity,
      imgDisplay.h,
      imgDisplay.w,
      reduced,
      stage.h,
      stage.w,
    ],
  );

  const goFull = useCallback(
    (duration: number, onDone?: () => void) => {
      if (reduced || duration <= 0) {
        camX.set(frameBox.x);
        camY.set(frameBox.y);
        camScale.set(1);
        dimOpacity.set(0);
        onDone?.();
        return;
      }
      const opts = { duration, ease: easings.easeInOut } as const;
      animate(camX, frameBox.x, opts);
      animate(camY, frameBox.y, opts);
      animate(dimOpacity, 0, { duration: duration * 0.6, ease: easings.easeOut });
      animate(camScale, 1, { ...opts, onComplete: () => onDone?.() });
    },
    [camScale, camX, camY, dimOpacity, frameBox.x, frameBox.y, reduced],
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
      const inFrame = toFrameNorm(target.x, target.y);
      const dur = stopDurationSec(s.text);
      ringDur.current = dur;
      audioRef.current = createSilentAudio(dur);
      flyTo(
        inFrame.x,
        inFrame.y,
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
    [artwork.touchZones, finishTour, flyTo, reduced, stops, toFrameNorm],
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
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    // Map tap from composed frame → painting opening 0–1
    const nx = (fx - paintInFrame.x) / paintInFrame.w;
    const ny = (fy - paintInFrame.y) / paintInFrame.h;
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
    const inFrame = toFrameNorm(r.x + r.w / 2, r.y + r.h / 2);
    flyTo(
      inFrame.x,
      inFrame.y,
      2.2,
      reduced ? motionTokens.reducedCrossfade : motionTokens.lens,
    );
  };

  const zone = zoneIdx != null ? artwork.touchZones.zones[zoneIdx] : null;

  const sheetOpen = mode === "tour" || (mode === "explore" && zone != null);

  return (
    <div ref={stageRef} className="absolute inset-0 z-20 overflow-hidden bg-[var(--color-bg-hall-dark)]">
      {!loaded ? (
        <div className="absolute inset-0 animate-pulse bg-surface" aria-busy />
      ) : null}

      {/* Lamp — 100:1661 */}
      <div
        className="pointer-events-none absolute left-1/2 z-[5] h-[109px] w-[98px] -translate-x-1/2 overflow-hidden"
        style={{ top: 8 * ui }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hallUi.lamp}
          alt=""
          className="absolute max-w-none"
          style={{
            height: "66.06%",
            width: "100.41%",
            left: "-0.2%",
            top: "33.94%",
          }}
          draggable={false}
        />
      </div>

      {/* Cone under lamp — breathing (transparent SVG, no opaque frame) */}
      <motion.div
        className="pointer-events-none absolute left-1/2 z-[4] -translate-x-1/2"
        style={{
          top: 100 * ui,
          height: 340 * ui,
          width: 346 * ui,
        }}
        animate={reduced ? { opacity: 0.75 } : { opacity: [0.55, 0.9, 0.55] }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: 3, repeat: Infinity, ease: "easeInOut" }
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hallUi.tourCone}
          alt=""
          className="size-full object-contain mix-blend-screen"
          draggable={false}
        />
      </motion.div>

      {/* Zoomable composed frame+painting (group export — alpha punched) */}
      <motion.div
        className="absolute z-[2]"
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
            className="block h-full w-full object-contain"
            priority
            unoptimized
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
            Немає зображення
          </div>
        )}
        <motion.div
          className="pointer-events-none absolute inset-0 bg-black"
          style={{ opacity: dimOpacity }}
        />
      </motion.div>

      {/* Dual gold rings lens — Figma 100:1662 / 100:1663 */}
      {mode === "tour" ? (
        <div
          className="pointer-events-none absolute left-1/2 top-[30%] z-10 -translate-x-1/2 -translate-y-1/2"
          aria-hidden
        >
          <div className="relative size-[128px] rounded-full border-[1.5px] border-accent bg-[var(--color-bg-glow)]">
            <div className="absolute left-1/2 top-1/2 size-[108px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-accent shadow-[4px_9px_10px_0_rgba(42,24,1,0.2)]" />
          </div>
        </div>
      ) : null}

      {/* Bottom sheet — progress, copy, round controls */}
      {mode === "tour" && stop ? (
        <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-[45px] rounded-t-lg border-t border-border-subtle bg-surface px-xl pb-[calc(40px+var(--safe-bottom))] pt-xl">
          <div className="flex flex-col gap-lg">
            <ProgressStepper total={stops.length} current={stopIdx + 1} />
            <motion.div
              key={textKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: motionTokens.stopCrossfade }}
              className="flex flex-col gap-sm"
            >
              <p className="text-h3 text-text-primary">{stop.title}</p>
              <p className="text-body-lg text-text-primary">{stop.text}</p>
            </motion.div>
          </div>
          <div className="flex items-start justify-center gap-2xl">
            <button
              type="button"
              onClick={finishTour}
              className="flex w-20 flex-col items-center gap-md pt-sm"
            >
              <span className="flex size-12 items-center justify-center rounded-full border border-border-subtle bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/ui/icon-close.svg" alt="" width={20} height={20} />
              </span>
              <span className="text-label-md text-text-secondary">Без гіда</span>
            </button>
            <div className="flex w-20 flex-col items-center gap-sm">
              <TourRing progress={ringProgress} paused={paused} onToggle={togglePause} />
              <span className="text-label-md text-text-secondary">
                {paused ? "Відтворити" : "Пауза"}
              </span>
            </div>
            <button
              type="button"
              onClick={nextStop}
              className="flex w-20 flex-col items-center gap-md pt-sm"
            >
              <span className="flex size-12 items-center justify-center rounded-full border border-border-subtle bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/ui/icon-next.svg" alt="" width={20} height={20} />
              </span>
              <span className="text-label-md text-text-secondary">Далі</span>
            </button>
          </div>
        </div>
      ) : null}

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
              // TODO(chat): Stage 7
            }}
          >
            Спитати гіда про це
          </button>
        </div>
      ) : null}

      {mode === "explore" && zoneIdx == null && !sheetOpen ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-32 z-10 px-xl text-center text-caption text-text-secondary">
          Підказка · тапни
        </p>
      ) : null}
    </div>
  );
}
