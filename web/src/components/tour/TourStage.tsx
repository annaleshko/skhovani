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
  stopScreenPoint,
  tourImageSrc,
} from "@/lib/tour-camera";
import { photographerCreditLine } from "@/lib/photo-credit";
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
  /** Header ⬇ → wallpaper 11. */
  onSaveWallpaper?: () => void;
  /** Selected touch zone for 08 detail card (parent renders card above sheet). */
  onZoneChange?: (zone: TouchZone | null) => void;
  /** Parent closed the detail card — clear ring. */
  detailOpen?: boolean;
  className?: string;
};

const FRAME = { w: 390, h: 844 };
const SHEET_RESERVE = 340;
/** Passport detail 08 — same lens as tour, fixed 2× into the tapped point. */
const DETAIL_ZOOM = 2;

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
  onSaveWallpaper,
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
  /** True after onLoadingComplete with real metrics (avoids 1200×900 placeholder lens). */
  const [hasNatural, setHasNatural] = useState(() => !src);

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
      // Short phones: shrink the frame first so credit+hint stay above the sheet.
      // Never go below 150px high.
      const designH = P.frame.h * sy;
      const shortCap = Math.max(150, stage.h * 0.3);
      const h =
        stage.h < 780
          ? Math.max(150, Math.min(designH, shortCap))
          : designH;
      const scale = h / (P.frame.h * sy || 1);
      const w = P.frame.w * sx * Math.min(1, scale);
      const x = (stage.w - w) / 2;
      // Keep lamp room above; never push frame under the header icons.
      const y = Math.max(88 * sy, Math.min(P.frame.y * sy, stage.h * 0.16));
      return { x, y, w, h };
    }
    return {
      x: TOUR_LAYOUT.frame.x * sx,
      y: TOUR_LAYOUT.frame.y * sy,
      w: TOUR_LAYOUT.frame.w * sx,
      h: TOUR_LAYOUT.frame.h * sy,
    };
  }, [
    P.frame.h,
    P.frame.w,
    P.frame.y,
    mode,
    stage.h,
    stage.w,
    sx,
    sy,
  ]);

  /** Passport 16: contain in Figma box x24 y125 w342 h265 (never under header / over hint). */
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
      // Keep refs in sync immediately — layout-sync effect must not
      // snap the camera back to the previous stop mid-flight (replay bug).
      stopIdxRef.current = idx;
      zoomedInRef.current = true;
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
    if (wasDetailOpen.current && !detailOpen && mode === "explore") {
      setZoneIdx(null);
      setRingVisible(false);
      setZoomedIn(false);
      const dur = reduced
        ? motionTokens.reducedCrossfade
        : motionTokens.lens;
      goFull(dur);
    }
    wasDetailOpen.current = detailOpen;
  }, [detailOpen, goFull, mode, reduced]);

  // Keep explore detail lens snapped when the fitted layout changes.
  useEffect(() => {
    if (mode !== "explore" || !zoomedInRef.current || zoneIdx == null) return;
    const z = zones[zoneIdx];
    if (!z) return;
    const p = getZonePoint(z, zoneGrid);
    const cam = lensCamera(
      p.x,
      p.y,
      DETAIL_ZOOM,
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
    camScale,
    camX,
    camY,
    focusX,
    focusY,
    imgLayout,
    mode,
    stage.w,
    viewH,
    zoneGrid,
    zoneIdx,
    zones,
  ]);

  useEffect(() => {
    if (!loaded || !hasNatural || startExplore) return;
    camX.set(0);
    camY.set(0);
    camScale.set(1);
    const t = setTimeout(() => startStopRef.current(0), 50);
    return () => {
      clearTimeout(t);
      clearTimers();
    };
  }, [camScale, camX, camY, clearTimers, hasNatural, loaded, startExplore]);

  // Re-snap lens when the fitted layout changes (stage resize / natural size).
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
    const glideSec = reduced
      ? motionTokens.reducedCrossfade
      : motionTokens.lens;
    if (idx == null) {
      setZoneIdx(null);
      setRingVisible(false);
      setZoomedIn(false);
      zoomedInRef.current = false;
      goFull(glideSec);
      onZoneChange?.(null);
      return;
    }
    const z = zones[idx];
    if (!z) return;
    const p = getZonePoint(z, zoneGrid);
    setZoneIdx(idx);
    setZoomedIn(true);
    zoomedInRef.current = true;
    setRingVisible(false);
    onZoneChange?.(z);
    flyTo(p.x, p.y, DETAIL_ZOOM, glideSec, () => {
      setRingVisible(true);
    });
  };

  const onImageTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== "explore") return;
    const rect = e.currentTarget.getBoundingClientRect();
    // Hit-test in image local space (pre-transform); getBoundingClientRect
    // already includes the camera scale/translate.
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const hit = hitTestZonePoint(nx, ny, zones, zoneGrid, 0.1);
    if (hit < 0) {
      if (zoomedIn) {
        selectZone(null);
      } else {
        pulseHint();
      }
      return;
    }
    selectZone(hit);
  };

  const zone = zoneIdx != null ? zones[zoneIdx] : null;
  const ringPoint = zone
    ? (() => {
        const p = getZonePoint(zone, zoneGrid);
        if (zoomedIn) {
          const cam = {
            tx: camX.get(),
            ty: camY.get(),
            scale: camScale.get(),
          };
          const scr = stopScreenPoint(p.x, p.y, cam, imgLayout);
          return { cx: scr.x, cy: scr.y };
        }
        return {
          cx: imgLayout.x + p.x * imgLayout.w,
          cy: imgLayout.y + p.y * imgLayout.h,
        };
      })()
    : null;

  // Cone/lamp always behind the artwork; fade out while zoomed (tour 07).
  const coneOpacity = zoomedIn ? 0 : 1;
  /** Ring at the stop point after edge clamp — not always stage center. */
  const tourRingPos = (() => {
    if (mode !== "tour" || !stop) return { x: focusX, y: focusY };
    const target = resolveStopTarget(stop, artwork.touchZones);
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
    return stopScreenPoint(target.x, target.y, cam, imgLayout);
  })();
  const tourRingCx = tourRingPos.x;
  const tourRingCy = tourRingPos.y;
  const photoLine = photographerCreditLine(artwork.photoCredit);

  // Soft radial glow (no hard rectangle) — same approach as pre-d9ed697.
  const lampTop = mode === "explore" ? P.lamp.y * sy : 8 * sy;
  const coneTop = mode === "explore" ? 58 * sy : 100 * sy;
  const coneW = P.cone.w * sx;
  const coneH =
    mode === "explore"
      ? Math.min(P.cone.h * sy, Math.max(0, imgLayout.y - coneTop + 12))
      : Math.min(TOUR_LAYOUT.cone.h * sy, Math.max(0, imgLayout.y - coneTop + 8));
  const lampW = P.lamp.w * sx;
  const lampH = P.lamp.h * sy;

  return (
    <div
      ref={stageRef}
      className="pointer-events-none absolute inset-0 z-20 overflow-x-hidden bg-[var(--color-bg-hall-dark)]"
    >
      {!loaded ? (
        <div className="absolute inset-0 animate-pulse bg-surface" aria-busy />
      ) : null}

      {/* Soft cone behind art — image only (no CSS box), fades when zoomed. */}
      <motion.div
        className="pointer-events-none absolute left-1/2 z-[1] -translate-x-1/2"
        style={{
          top: coneTop,
          height: coneH,
          width: coneW,
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
          className="size-full object-contain object-top mix-blend-screen"
          draggable={false}
          style={{
            maskImage:
              "radial-gradient(ellipse 90% 85% at 50% 15%, #000 45%, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 90% 85% at 50% 15%, #000 45%, transparent 78%)",
          }}
        />
      </motion.div>

      {/* Lamp behind artwork; fades with cone while zoomed. */}
      <motion.div
        className="pointer-events-none absolute left-1/2 z-[1] -translate-x-1/2"
        style={{
          top: lampTop,
          width: lampW,
          height: lampH,
          maxHeight: Math.max(0, imgLayout.y - lampTop),
        }}
        initial={false}
        animate={{ opacity: coneOpacity }}
        transition={{
          duration: reduced ? 0 : motionTokens.tourLamp,
          ease: easings.easeOut,
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
      </motion.div>

      {/* Artwork above lamp/cone — always wins when zoomed */}
      <motion.div
        className="pointer-events-auto absolute z-[3]"
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
                setHasNatural(true);
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

        {/* Brief gold dots (~1.5s) so people see where to tap */}
        {mode === "explore" && !reduced
          ? zones.map((z, i) => {
              const p = getZonePoint(z, zoneGrid);
              return (
                <motion.span
                  key={`zone-hint-${artwork.id}-${z.position}-${i}`}
                  className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
                  style={{
                    left: `${p.x * 100}%`,
                    top: `${p.y * 100}%`,
                    boxShadow: "0 0 8px var(--color-bg-accent)",
                  }}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{
                    opacity: [0, 0.95, 0.4, 0.95, 0],
                    scale: [0.7, 1.2, 1, 1.25, 0.8],
                  }}
                  transition={{
                    duration: 1.5,
                    ease: "easeInOut",
                    times: [0, 0.2, 0.45, 0.7, 1],
                  }}
                  aria-hidden
                />
              );
            })
          : null}
      </motion.div>

      {/* Pointer ring — tour (stage center) or explore (zone point) */}
      <AnimatePresence>
        {ringVisible && mode === "tour" ? (
          <TourMagnifier
            key="tour-ring"
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
            <div className="flex items-center gap-sm">
              <IconButton
                label="Автотур ще раз"
                className="size-10 min-h-10 min-w-10 border border-border-subtle bg-surface text-text-accent"
                onClick={() => onReplayTour?.()}
              >
                <span className="text-[14px] leading-none" aria-hidden>
                  ▶
                </span>
              </IconButton>
              <IconButton
                label="Зберегти шпалери"
                className="size-10 min-h-10 min-w-10 border border-border-subtle bg-surface text-text-accent"
                onClick={() => onSaveWallpaper?.()}
              >
                <span className="text-[16px] leading-none" aria-hidden>
                  ⬇
                </span>
              </IconButton>
            </div>
          </div>

          {/* Credit + hint under the frame — hide while detail-zoomed */}
          <div
            className="pointer-events-none absolute inset-x-0 z-[5] flex flex-col gap-sm px-xl"
            style={{
              top: frameSlot.y + frameSlot.h + 8,
              opacity: zoomedIn ? 0 : 1,
            }}
          >
            {photoLine ? (
              <p className="text-caption text-text-secondary">{photoLine}</p>
            ) : null}
            <motion.p
              className="flex items-start gap-sm text-caption text-text-secondary"
              animate={
                hintPulse
                  ? { opacity: [1, 0.35, 1], scale: [1, 1.04, 1] }
                  : { opacity: 1, scale: 1 }
              }
              transition={{ duration: 0.55, ease: easings.easeInOut }}
            >
              <span
                className="mt-1 inline-block size-2 shrink-0 rounded-full bg-accent"
                aria-hidden
              />
              <span>Торкнись будь-якої деталі — гід підкаже, що там</span>
            </motion.p>
          </div>
        </>
      ) : null}

      {/* Tour bottom sheet */}
      {mode === "tour" && stop ? (
        <div
          className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex flex-col gap-xl rounded-t-lg border-t border-border-subtle bg-surface px-xl pt-xl"
          style={{
            paddingBottom:
              "max(24px, calc(env(safe-area-inset-bottom, 0px) + 12px))",
          }}
        >
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
