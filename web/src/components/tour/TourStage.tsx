"use client";

import { IconButton, ProgressStepper } from "@/components/ui";
import { getHallAssets } from "@/data/halls";
import type { Artwork, TouchZone } from "@/data/types";
import {
  getZonePoint,
  hitTestZonePoint,
} from "@/data/zone-layouts";
import { createSilentAudio } from "@/lib/audio";
import {
  fitSlotOrigin,
  lensCamera,
  resolveStopTarget,
  stopDurationSec,
  tourImageSrc,
} from "@/lib/tour-camera";
import {
  easings,
  motionTokens,
  useReducedMotionSafe,
} from "@/lib/motion";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionTemplate,
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
import { PASSPORT_LAYOUT, TOUR_LAYOUT } from "./FramedArtwork";
import { TourMagnifier } from "./TourMagnifier";
import { TourRing } from "./TourRing";

type Mode = "tour" | "explore";

type Props = {
  artwork: Artwork;
  /** Tour finished / skipped → parent enters passport (16). */
  onTourDone: () => void;
  /** Start in passport/explore (16). */
  startExplore?: boolean;
  /** Header × → route map (02в). */
  onClose?: () => void;
  /** Header ▶ → replay tour. */
  onReplayTour?: () => void;
  /** Selected touch zone for 08 detail card (parent renders card above sheet). */
  onZoneChange?: (zone: TouchZone | null) => void;
  /** Parent closed the detail card — clear ring. */
  detailOpen?: boolean;
  className?: string;
};

const FRAME = { w: 390, h: 844 };
const SHEET_RESERVE = 340;

/**
 * Tour 07 + passport/detail stage (16 / 08).
 * Tour: camera zoom + pointer ring. Explore: full frame at 16 layout, point hits.
 */
export function TourStage({
  artwork,
  onTourDone,
  startExplore = false,
  onClose,
  onReplayTour,
  onZoneChange,
  detailOpen = false,
}: Props) {
  const reduced = useReducedMotionSafe();
  const hallUi = getHallAssets(artwork.museumId);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: FRAME.w, h: FRAME.h });
  const [imgNatural, setImgNatural] = useState({ w: 1200, h: 900 });
  const [mode, setMode] = useState<Mode>(startExplore ? "explore" : "tour");
  const [stopIdx, setStopIdx] = useState(0);
  const [paused, setPaused] = useState(startExplore);
  const [ringProgress, setRingProgress] = useState(0);
  const [zoneIdx, setZoneIdx] = useState<number | null>(null);
  const [textKey, setTextKey] = useState(0);
  const [ringVisible, setRingVisible] = useState(false);
  const [zoomedIn, setZoomedIn] = useState(false);
  const [hintPulse, setHintPulse] = useState(false);
  const src = tourImageSrc(artwork);
  const [loaded, setLoaded] = useState(() => !src);

  const camX = useMotionValue(0);
  const camY = useMotionValue(0);
  const camScale = useMotionValue(1);
  const camTransform = useMotionTemplate`translate(${camX}px, ${camY}px) scale(${camScale})`;

  const stops = artwork.tourStops;
  const stop = stops[stopIdx] ?? stops[0];
  const zones = artwork.touchZones.zones;
  const zoneGrid = artwork.touchZones.grid;

  const sx = stage.w / FRAME.w;
  const sy = stage.h / FRAME.h;
  const sheetReserve = SHEET_RESERVE * sy;
  const viewH = Math.max(180 * sy, stage.h - sheetReserve);
  const focusX = stage.w / 2;
  const focusY = viewH / 2;
  const P = PASSPORT_LAYOUT;

  const frameSlot = useMemo(() => {
    if (mode === "explore") {
      return {
        x: P.frame.x * sx,
        y: P.frame.y * sy,
        w: P.frame.w * sx,
        h: P.frame.h * sy,
      };
    }
    return {
      x: TOUR_LAYOUT.frame.x * sx,
      y: TOUR_LAYOUT.frame.y * sy,
      w: TOUR_LAYOUT.frame.w * sx,
      h: TOUR_LAYOUT.frame.h * sy,
    };
  }, [P.frame.h, P.frame.w, P.frame.x, P.frame.y, mode, sx, sy]);

  const imgLayout = useMemo(
    () => fitSlotOrigin(frameSlot, imgNatural.w, imgNatural.h),
    [frameSlot, imgNatural.h, imgNatural.w],
  );

  const audioRef = useRef(createSilentAudio(6));
  const ringRaf = useRef<number | null>(null);
  const ringStart = useRef(0);
  const ringDur = useRef(6);
  const advancing = useRef(false);
  const pausedRef = useRef(startExplore);
  const pauseOffset = useRef(0);
  const startStopRef = useRef<(idx: number) => void>(() => {});
  const camAnims = useRef<ReturnType<typeof animate>[]>([]);
  const stopIdxRef = useRef(stopIdx);
  const zoomedInRef = useRef(zoomedIn);
  const hintPulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    stopIdxRef.current = stopIdx;
    zoomedInRef.current = zoomedIn;
  }, [stopIdx, zoomedIn]);

  const clearTimers = useCallback(() => {
    if (ringRaf.current) cancelAnimationFrame(ringRaf.current);
    ringRaf.current = null;
    camAnims.current.forEach((a) => a.stop());
    camAnims.current = [];
  }, []);

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

  const flyTo = useCallback(
    (
      nx: number,
      ny: number,
      zoom: number,
      duration: number,
      onDone?: () => void,
    ) => {
      const cam = lensCamera(
        nx,
        ny,
        zoom,
        imgLayout,
        focusX,
        focusY,
        stage.w,
        viewH,
      );
      camAnims.current.forEach((a) => a.stop());
      camAnims.current = [];
      if (reduced || duration <= 0) {
        camX.set(cam.tx);
        camY.set(cam.ty);
        camScale.set(cam.scale);
        onDone?.();
        return;
      }
      const opts = { duration, ease: easings.easeInOut } as const;
      camAnims.current = [
        animate(camX, cam.tx, opts),
        animate(camY, cam.ty, opts),
        animate(camScale, cam.scale, {
          ...opts,
          onComplete: () => onDone?.(),
        }),
      ];
    },
    [
      camScale,
      camX,
      camY,
      focusX,
      focusY,
      imgLayout,
      reduced,
      stage.w,
      viewH,
    ],
  );

  const goFull = useCallback(
    (duration: number, onDone?: () => void) => {
      camAnims.current.forEach((a) => a.stop());
      camAnims.current = [];
      if (reduced || duration <= 0) {
        camX.set(0);
        camY.set(0);
        camScale.set(1);
        onDone?.();
        return;
      }
      const opts = { duration, ease: easings.easeInOut } as const;
      camAnims.current = [
        animate(camX, 0, opts),
        animate(camY, 0, opts),
        animate(camScale, 1, {
          ...opts,
          onComplete: () => onDone?.(),
        }),
      ];
    },
    [camScale, camX, camY, reduced],
  );

  const finishTour = useCallback(() => {
    clearTimers();
    setRingVisible(false);
    setZoomedIn(false);
    setZoneIdx(null);
    onZoneChange?.(null);
    setPaused(true);
    setRingProgress(0);
    audioRef.current.stop();
    const dur = reduced
      ? motionTokens.reducedCrossfade
      : motionTokens.tourExitZoom;
    // Zoom out on the tour layout first, then settle into passport (16).
    goFull(dur, () => {
      setMode("explore");
      onTourDone();
    });
  }, [clearTimers, goFull, onTourDone, onZoneChange, reduced]);

  const startStop = useCallback(
    (idx: number) => {
      const s = stops[idx];
      if (!s) {
        finishTour();
        return;
      }
      clearTimers();
      advancing.current = false;
      setStopIdx(idx);
      setTextKey((k) => k + 1);
      pausedRef.current = false;
      setPaused(false);
      setRingProgress(0);
      setMode("tour");
      setRingVisible(false);
      setZoomedIn(true);
      setZoneIdx(null);

      const target = resolveStopTarget(s, artwork.touchZones);
      const dur = stopDurationSec(s.text);
      ringDur.current = dur;
      audioRef.current = createSilentAudio(dur);

      const glideSec = reduced
        ? motionTokens.reducedCrossfade
        : motionTokens.lens;

      flyTo(target.x, target.y, target.zoom, glideSec, () => {
        setRingVisible(true);
        audioRef.current.play();
        ringStart.current = performance.now();
        const tick = () => {
          if (pausedRef.current) {
            ringRaf.current = requestAnimationFrame(tick);
            return;
          }
          const t =
            (performance.now() - ringStart.current) / (ringDur.current * 1000);
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
      });
    },
    [artwork.touchZones, clearTimers, finishTour, flyTo, reduced, stops],
  );

  useEffect(() => {
    startStopRef.current = startStop;
  }, [startStop]);

  // Enter explore without an effect (finishTour / startExplore prop)
  if (startExplore && mode !== "explore") {
    setMode("explore");
    setZoomedIn(false);
    setRingVisible(false);
  }

  const wasDetailOpen = useRef(detailOpen);
  useEffect(() => {
    if (wasDetailOpen.current && !detailOpen) {
      setZoneIdx(null);
      setRingVisible(false);
    }
    wasDetailOpen.current = detailOpen;
  }, [detailOpen]);

  useEffect(() => {
    if (!loaded || startExplore) return;
    camX.set(0);
    camY.set(0);
    camScale.set(1);
    const t = setTimeout(() => startStopRef.current(0), 50);
    return () => {
      clearTimeout(t);
      clearTimers();
    };
  }, [camScale, camX, camY, clearTimers, loaded, startExplore]);

  useEffect(() => {
    if (!zoomedInRef.current || mode !== "tour") return;
    const s = stops[stopIdxRef.current];
    if (!s) return;
    const target = resolveStopTarget(s, artwork.touchZones);
    const cam = lensCamera(
      target.x,
      target.y,
      target.zoom,
      imgLayout,
      focusX,
      focusY,
      stage.w,
      viewH,
    );
    camAnims.current.forEach((a) => a.stop());
    camAnims.current = [];
    camX.set(cam.tx);
    camY.set(cam.ty);
    camScale.set(cam.scale);
  }, [
    artwork.touchZones,
    camScale,
    camX,
    camY,
    focusX,
    focusY,
    imgLayout,
    mode,
    stage.h,
    stage.w,
    stops,
    viewH,
  ]);

  useEffect(() => {
    return () => {
      if (hintPulseTimer.current) clearTimeout(hintPulseTimer.current);
    };
  }, []);

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
    clearTimers();
    audioRef.current.stop();
    if (stopIdx >= stops.length - 1) finishTour();
    else startStop(stopIdx + 1);
  };

  const pulseHint = () => {
    setHintPulse(true);
    if (hintPulseTimer.current) clearTimeout(hintPulseTimer.current);
    hintPulseTimer.current = setTimeout(() => setHintPulse(false), 700);
  };

  const selectZone = (idx: number | null) => {
    setZoneIdx(idx);
    setRingVisible(idx != null);
    setZoomedIn(false);
    goFull(0);
    onZoneChange?.(idx != null ? zones[idx] ?? null : null);
  };

  const onImageTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== "explore") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const hit = hitTestZonePoint(nx, ny, zones, zoneGrid, 0.12);
    if (hit < 0) {
      selectZone(null);
      pulseHint();
      return;
    }
    selectZone(hit);
  };

  const zone = zoneIdx != null ? zones[zoneIdx] : null;
  const ringPoint = zone
    ? (() => {
        const p = getZonePoint(zone, zoneGrid);
        return {
          cx: imgLayout.x + p.x * imgLayout.w,
          cy: imgLayout.y + p.y * imgLayout.h,
        };
      })()
    : null;

  const coneOpacity = zoomedIn ? 0.6 : 1;
  const tourRingCx = focusX;
  const tourRingCy = focusY;

  const lampTop = mode === "explore" ? P.lamp.y * sy : 8 * sy;
  const coneTop = mode === "explore" ? 58 * sy : 100 * sy;
  const coneH = mode === "explore" ? P.cone.h * sy : 340 * sy;

  return (
    <div
      ref={stageRef}
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden bg-[var(--color-bg-hall-dark)]"
    >
      {!loaded ? (
        <div className="absolute inset-0 animate-pulse bg-surface" aria-busy />
      ) : null}

      {/* Cone + lamp behind the artwork so zoom never covers the lamp */}
      <motion.div
        className="pointer-events-none absolute left-1/2 z-[1] -translate-x-1/2"
        style={{
          top: coneTop,
          height: coneH,
          width: P.cone.w * sx,
        }}
        initial={false}
        animate={
          reduced || zoomedIn
            ? { opacity: coneOpacity }
            : { opacity: [0.85, 1, 0.85] }
        }
        transition={
          reduced
            ? { duration: 0 }
            : zoomedIn
              ? { duration: motionTokens.tourLamp, ease: easings.easeOut }
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

      <div
        className="pointer-events-none absolute left-1/2 z-[1] -translate-x-1/2 overflow-hidden"
        style={{
          top: lampTop,
          width: P.lamp.w * sx,
          height: P.lamp.h * sy,
        }}
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

      {/* Artwork above lamp/cone */}
      <motion.div
        className="pointer-events-auto absolute z-[2]"
        style={{
          left: imgLayout.x,
          top: imgLayout.y,
          width: imgLayout.w,
          height: imgLayout.h,
          transform: camTransform,
          transformOrigin: "0 0",
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

        {/* A11y: invisible zone buttons in reading order */}
        {mode === "explore"
          ? zones.map((z, i) => {
              const p = getZonePoint(z, zoneGrid);
              return (
                <button
                  key={`zone-a11y-${z.position}-${i}`}
                  type="button"
                  aria-label={z.title}
                  className="absolute size-11 -translate-x-1/2 -translate-y-1/2 opacity-0"
                  style={{
                    left: `${p.x * 100}%`,
                    top: `${p.y * 100}%`,
                  }}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    selectZone(i);
                  }}
                />
              );
            })
          : null}
      </motion.div>

      {/* Pointer ring — tour (stage center) or explore (zone point) */}
      <AnimatePresence>
        {ringVisible && mode === "tour" ? (
          <TourMagnifier
            key={`tour-ring-${stopIdx}`}
            cx={tourRingCx}
            cy={tourRingCy}
            progress={ringProgress}
            reduced={reduced}
          />
        ) : null}
        {ringVisible && mode === "explore" && ringPoint ? (
          <TourMagnifier
            key={`explore-ring-${zoneIdx}`}
            cx={ringPoint.cx}
            cy={ringPoint.cy}
            progress={0}
            reduced={reduced}
          />
        ) : null}
      </AnimatePresence>

      {/* Passport chrome (16): header × / ▶, credit, hint */}
      {mode === "explore" ? (
        <>
          <div
            className="pointer-events-auto absolute inset-x-0 z-[12] flex items-center justify-between px-xl"
            style={{ top: P.header.y * sy }}
          >
            <IconButton
              label="Закрити"
              className="size-10 min-h-10 min-w-10 border border-border-subtle bg-surface"
              onClick={() => onClose?.()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ui/icon-close.svg" alt="" width={20} height={20} />
            </IconButton>
            <IconButton
              label="Автотур ще раз"
              className="size-10 min-h-10 min-w-10 border border-border-subtle bg-surface text-text-accent"
              onClick={() => onReplayTour?.()}
            >
              <span className="text-[14px] leading-none" aria-hidden>
                ▶
              </span>
            </IconButton>
          </div>

          <p
            className="pointer-events-none absolute z-[5] px-xl text-caption text-text-secondary"
            style={{
              left: 0,
              right: 0,
              top: P.credit.y * sy,
            }}
          >
            {artwork.photoCredit}
          </p>
          <motion.p
            className="pointer-events-none absolute z-[5] flex items-center gap-sm px-xl text-caption text-text-secondary"
            style={{ left: 0, right: 0, top: P.hint.y * sy }}
            animate={
              hintPulse
                ? { opacity: [1, 0.35, 1], scale: [1, 1.04, 1] }
                : { opacity: 1, scale: 1 }
            }
            transition={{ duration: 0.55, ease: easings.easeInOut }}
          >
            <span
              className="inline-block size-2 shrink-0 rounded-full bg-accent"
              aria-hidden
            />
            Торкнись будь-якої деталі — гід підкаже, що там
          </motion.p>
        </>
      ) : null}

      {/* Tour bottom sheet */}
      {mode === "tour" && stop ? (
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex flex-col gap-[45px] rounded-t-lg border-t border-border-subtle bg-surface px-xl pb-[calc(40px+var(--safe-bottom))] pt-xl">
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
              <span className="text-label-md text-text-secondary">Пропустити</span>
            </button>
            <div className="flex w-20 flex-col items-center gap-sm">
              <TourRing
                progress={ringProgress}
                paused={paused}
                onToggle={togglePause}
              />
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
    </div>
  );
}
