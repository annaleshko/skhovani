"use client";

import { AboutSheet } from "@/components/about/AboutSheet";
import { RouteMapScreen } from "@/components/journey/RouteMapScreen";
import { WallpaperSavedScreen } from "@/components/journey/WallpaperSavedScreen";
import { StatusBadge } from "@/components/ui";
import { GuideScreen } from "@/components/guide/GuideScreen";
import { DetailCard } from "@/components/tour/DetailCard";
import { PASSPORT_LAYOUT } from "@/components/tour/FramedArtwork";
import { TourStage } from "@/components/tour/TourStage";
import { WallpaperScreen } from "@/components/wallpaper/WallpaperScreen";
import { getArtwork, getMuseum } from "@/data";
import type { TouchZone } from "@/data/types";
import {
  getHallLayout,
  openingClipPath,
  openingInsetStyle,
  paintingOpeningInset,
  type HallSlot,
} from "@/data/hall-layouts";
import { getHallAssets } from "@/data/halls";
import {
  getNextPath,
  shouldSkipMapToHall,
  type ResolvedPath,
} from "@/data/journey";
import {
  easings,
  motionTokens,
  useReducedMotionSafe,
} from "@/lib/motion";
import { useAppState } from "@/state/AppState";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Phase =
  | "hall"
  | "tour"
  | "explore"
  | "about"
  | "wallpaper"
  | "wallpaper-saved"
  | "route"
  | "ask-guide";

/** Stolen focus: empty frame → memory reveal → tour. */
type StolenPhase = "empty" | "revealing" | "remembered";

/** Focus stolen before tap — heavy blur clipped to the painting opening. */
const STOLEN_BLUR_FILTER = "blur(14px) brightness(0.5) saturate(0.6)";
/** After reveal — muted memory look (painting only). */
const STOLEN_MEMORY_FILTER =
  "blur(0px) saturate(0.55) sepia(0.15) brightness(0.92)";

type Props = {
  museumId: string;
  pathN: number | null;
  artworkId: number;
};

/** Hall meta line uses the short year as in Figma («· 1910»), not the passport note. */
function shortYear(year: string): string {
  const m = year.match(/\d{4}/);
  if (m) return m[0];
  return year.split(/[;(]/)[0]?.trim() || year;
}

function scrollLeftTo(
  el: HTMLElement,
  target: number,
  durationSec: number,
  reduced: boolean,
) {
  if (reduced || durationSec <= 0) {
    el.scrollLeft = target;
    return;
  }
  const start = el.scrollLeft;
  const delta = target - start;
  if (Math.abs(delta) < 1) return;
  const t0 = performance.now();
  const dur = durationSec * 1000;
  const tick = (now: number) => {
    const p = Math.min(1, (now - t0) / dur);
    // ease-in-out
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    el.scrollLeft = start + delta * e;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * Hall — wall → frames → 70% darkness → opened + lamp + cone → captions.
 * MVP v2: 05 empty / 06 reveal / 12 neighbor caption (no 12б sheet).
 */
export function HallExperience({ museumId, pathN, artworkId }: Props) {
  const router = useRouter();
  const reduced = useReducedMotionSafe();
  const { markPathComplete, markTourSeen, completedPaths } = useAppState();
  const museum = getMuseum(museumId);
  const hallUi = getHallAssets(museumId);
  const layout = getHallLayout(museumId);
  const completedWithCurrent = useMemo(() => {
    if (pathN == null) return completedPaths;
    return completedPaths.includes(pathN)
      ? completedPaths
      : [...completedPaths, pathN].sort((a, b) => a - b);
  }, [completedPaths, pathN]);
  const nextPath = useMemo(
    () => getNextPath(completedWithCurrent),
    [completedWithCurrent],
  );
  const nextSameMuseum = Boolean(
    nextPath && shouldSkipMapToHall(completedWithCurrent, nextPath),
  );

  const slots = useMemo(() => layout?.slots ?? [], [layout]);
  const focusSlotIndex = Math.max(
    0,
    slots.findIndex((s) => s.artworkId === artworkId),
  );
  const focus = getArtwork(artworkId) ?? getArtwork(slots[0]?.artworkId ?? -1);

  const [phase, setPhase] = useState<Phase>("hall");
  type Intro = "black" | "lamp" | "cone" | "bright" | "ui" | "done";
  const [introStep, setIntroStep] = useState<Intro>("black");
  const intro: Intro = reduced ? "done" : introStep;
  const [shakeId, setShakeId] = useState<number | null>(null);
  const [neighborId, setNeighborId] = useState<number | null>(null);
  const [tourKey, setTourKey] = useState(0);
  const [startExplore, setStartExplore] = useState(false);
  const [detailZone, setDetailZone] = useState<TouchZone | null>(null);
  const [guidePrefill, setGuidePrefill] = useState<string | null>(null);
  const [guideDetail, setGuideDetail] = useState<string | null>(null);
  const [stolenPhase, setStolenPhase] = useState<StolenPhase>("empty");
  const [focusKey, setFocusKey] = useState(artworkId);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [viewH, setViewH] = useState(844);
  const neighborTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Same-museum next path: reset hall state during render (keeps scroll position)
  if (artworkId !== focusKey) {
    setFocusKey(artworkId);
    setStolenPhase("empty");
    setNeighborId(null);
    setPhase("hall");
    setIntroStep(reduced ? "done" : "black");
    setShakeId(null);
  }

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setViewH(el.clientHeight || 844);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Clear pending timers when the focus artwork changes
  useEffect(() => {
    return () => {
      revealTimers.current.forEach(clearTimeout);
      revealTimers.current = [];
      if (neighborTimer.current) {
        clearTimeout(neighborTimer.current);
        neighborTimer.current = null;
      }
    };
  }, [artworkId]);

  const designH = layout?.designHeight ?? 844;
  const designW = layout?.designWidth ?? 390;
  const px = viewH / designH;
  const hallWidthPx = designW * px;

  const isStolen = focus?.status === "stolen";
  const isShelter = focus?.status === "shelter";
  const isSaved = focus?.status === "saved";
  const showMemoryPainting =
    isStolen &&
    (stolenPhase === "revealing" || stolenPhase === "remembered");
  const showNormalPainting = isShelter || isSaved;

  // Center on path artwork — 600ms ease for same-museum moves
  useEffect(() => {
    if (phase !== "hall" || !slots[focusSlotIndex]) return;
    const el = scrollerRef.current;
    if (!el) return;
    const slot = slots[focusSlotIndex]!;
    const centerX = (slot.frameRect.x + slot.frameRect.w / 2) * px;
    const left = Math.max(0, centerX - el.clientWidth / 2);
    const t = window.setTimeout(() => {
      scrollLeftTo(el, left, motionTokens.hallScroll, reduced);
    }, 40);
    return () => window.clearTimeout(t);
  }, [focusSlotIndex, phase, reduced, slots, px, artworkId]);

  // Entry: darkness 100%→70% → lamp → cone → bright → UI
  useEffect(() => {
    if (phase !== "hall") return;
    if (reduced) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setIntroStep("lamp"), 400));
    timers.push(setTimeout(() => setIntroStep("cone"), 400 + 300));
    timers.push(setTimeout(() => setIntroStep("bright"), 400 + 300 + 500));
    timers.push(setTimeout(() => setIntroStep("ui"), 400 + 300 + 500 + 200));
    timers.push(setTimeout(() => setIntroStep("done"), 400 + 300 + 500 + 400));
    return () => timers.forEach(clearTimeout);
  }, [phase, reduced, artworkId]);

  const clearRevealTimers = useCallback(() => {
    revealTimers.current.forEach(clearTimeout);
    revealTimers.current = [];
  }, []);

  const openTour = useCallback(() => {
    clearRevealTimers();
    setStartExplore(false);
    setTourKey((k) => k + 1);
    setPhase("tour");
  }, [clearRevealTimers]);

  const startReveal = useCallback(() => {
    if (reduced) {
      setStolenPhase("remembered");
      revealTimers.current.push(
        setTimeout(openTour, motionTokens.reducedCrossfade * 1000),
      );
      return;
    }
    setStolenPhase("revealing");
    revealTimers.current.push(
      setTimeout(() => {
        setStolenPhase("remembered");
        revealTimers.current.push(
          setTimeout(openTour, motionTokens.memoryHold * 1000),
        );
      }, motionTokens.memoryReveal * 1000),
    );
  }, [openTour, reduced]);

  const onFrameTap = (slot: HallSlot) => {
    const art = getArtwork(slot.artworkId);
    if (!art) return;

    // Neighbor — quiet caption only (no 12б sheet)
    if (art.id !== focus?.id) {
      setShakeId(art.id);
      window.setTimeout(() => setShakeId(null), motionTokens.frameShake * 1000);
      setNeighborId(art.id);
      if (neighborTimer.current) clearTimeout(neighborTimer.current);
      neighborTimer.current = setTimeout(
        () => setNeighborId(null),
        motionTokens.neighborCaption * 1000,
      );
      return;
    }

    // Focus frame
    if (isStolen) {
      if (stolenPhase === "empty") {
        clearRevealTimers();
        startReveal();
        return;
      }
      // Tap during reveal / remembered skips the wait → tour
      openTour();
      return;
    }

    // shelter / saved → tour
    openTour();
  };

  const onTourDone = useCallback(() => {
    if (focus) markTourSeen(focus.id);
    setDetailZone(null);
    // Passport screen 16 (painting + collapsed sheet); detail 08 overlays on tap.
    setPhase("about");
  }, [focus, markTourSeen]);

  const completeCurrentPath = useCallback(() => {
    if (pathN != null && focus) markPathComplete(pathN, focus.id);
  }, [focus, markPathComplete, pathN]);

  const goToRouteMap = useCallback(() => {
    completeCurrentPath();
    if (nextSameMuseum && nextPath) {
      router.replace(
        `/hall/${nextPath.museumId}?path=${nextPath.n}&artwork=${nextPath.artworkId}`,
      );
      return;
    }
    setPhase("route");
  }, [completeCurrentPath, nextPath, nextSameMuseum, router]);

  const departNext = useCallback(
    (path: ResolvedPath) => {
      if (shouldSkipMapToHall(completedWithCurrent, path)) {
        router.replace(
          `/hall/${path.museumId}?path=${path.n}&artwork=${path.artworkId}`,
        );
        return;
      }
      router.replace(`/journey?path=${path.n}&autostart=1`);
    },
    [completedWithCurrent, router],
  );

  const continueAfterWallpaper = useCallback(() => {
    if (nextSameMuseum && nextPath) {
      router.replace(
        `/hall/${nextPath.museumId}?path=${nextPath.n}&artwork=${nextPath.artworkId}`,
      );
      return;
    }
    setPhase("route");
  }, [nextPath, nextSameMuseum, router]);

  useEffect(() => {
    return () => {
      clearRevealTimers();
      if (neighborTimer.current) clearTimeout(neighborTimer.current);
    };
  }, [clearRevealTimers]);

  if (!focus || !museum || !layout) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-screen px-xl text-body-md text-text-secondary">
        Залу не знайдено
      </div>
    );
  }

  const showHall = phase === "hall";
  const focusSlot = slots[focusSlotIndex]!;
  const lampX = focusSlot.lampX;
  const coneX = lampX + layout.lamp.w / 2 - layout.cone.w / 2;
  const coneTop = layout.cone.y;
  const markerCx = focusSlot.frameRect.x + focusSlot.frameRect.w - 26.5;
  const markerCy = focusSlot.frameRect.y + 11.5;
  const emptyInset = paintingOpeningInset(focus.id);

  const showUi = intro === "ui" || intro === "done";
  const showCone = intro === "cone" || intro === "bright" || showUi;
  const showLamp = intro !== "black";
  const paintingBright = intro === "bright" || showUi;
  const darknessAlpha = intro === "black" ? 1 : 0.7;
  const coneOpacity = isShelter ? 0.7 : 0.9;

  const hintStolen = isStolen && stolenPhase === "empty";
  const hintTour = (isShelter || isSaved) && showUi;
  const showMemoryLine =
    isStolen &&
    (stolenPhase === "revealing" || stolenPhase === "remembered") &&
    showUi;

  const shelterFilter = isShelter
    ? "brightness(0.85) sepia(0.1)"
    : undefined;
  const stolenPaintFilter =
    stolenPhase === "empty" ? STOLEN_BLUR_FILTER : STOLEN_MEMORY_FILTER;
  const revealDuration = reduced
    ? motionTokens.reducedCrossfade
    : motionTokens.memoryReveal;
  const emptyInsetCss = openingInsetStyle(emptyInset);
  const emptyClip = openingClipPath(emptyInset);

  return (
    <div
      ref={stageRef}
      className="relative min-h-dvh overflow-hidden bg-screen text-text-primary"
    >
      {showHall ? (
        <div className="absolute inset-0 z-0">
          <div
            ref={scrollerRef}
            className="absolute inset-0 overflow-x-auto overflow-y-hidden snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="relative h-dvh" style={{ width: hallWidthPx }}>
              {/* 1. Wall */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={layout.wallSrc}
                alt=""
                className="pointer-events-none absolute left-0 top-0 z-0 h-dvh w-auto max-w-none select-none"
                draggable={false}
              />

              {/* 2. ALL frames under darkness */}
              {slots.map((slot) => {
                const art = getArtwork(slot.artworkId);
                const open = slot.artworkId === focus.id;
                const r = slot.frameRect;
                const focusEmpty =
                  open && isStolen && stolenPhase === "empty";
                const src =
                  !open && slot.hiddenSrc ? slot.hiddenSrc : slot.frameSrc;
                const inset = paintingOpeningInset(slot.artworkId);
                return (
                  <motion.div
                    key={`base-${slot.artworkId}`}
                    data-hall-idx={slot.artworkId}
                    className="absolute z-[1] snap-center"
                    style={{
                      left: r.x * px,
                      top: r.y * px,
                      width: r.w * px,
                      height: r.h * px,
                    }}
                    animate={
                      shakeId === slot.artworkId
                        ? { x: [0, -4, 4, -4, 4, 0] }
                        : { x: 0 }
                    }
                    transition={{ duration: motionTokens.frameShake }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      className="pointer-events-none absolute inset-0 size-full object-contain drop-shadow-[1px_8px_12px_rgba(0,0,0,0.25)]"
                      draggable={false}
                    />
                    {/* Stolen focus before tap: blur cover so painting never flashes clear */}
                    {focusEmpty ? (
                      <div
                        className="pointer-events-none absolute inset-0 overflow-hidden"
                        style={{ clipPath: openingClipPath(inset) }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={slot.frameSrc}
                          alt=""
                          className="absolute inset-0 size-full object-contain"
                          draggable={false}
                          style={{ filter: STOLEN_BLUR_FILTER }}
                        />
                      </div>
                    ) : null}
                    <button
                      type="button"
                      aria-label={
                        art
                          ? `${art.title}, ${art.author}`
                          : `Твір ${slot.artworkId}`
                      }
                      className="absolute inset-0 z-[1] min-h-[44px] min-w-[44px] cursor-pointer bg-transparent"
                      onClick={() => onFrameTap(slot)}
                    />
                  </motion.div>
                );
              })}

              {/* 3. Darkness */}
              <div
                data-hall-darkness
                className="pointer-events-none absolute inset-0 z-[5]"
                style={{
                  backgroundColor: `rgba(0, 0, 0, ${darknessAlpha})`,
                  transition: reduced
                    ? undefined
                    : "background-color 400ms cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />

              {/* 4. Cone + opened art + lamp */}
              {showCone ? (
                <motion.div
                  data-hall-cone
                  className="pointer-events-none absolute z-[6]"
                  style={{
                    left: coneX * px,
                    top: coneTop * px,
                    width: layout.cone.w * px,
                    height: layout.cone.h * px,
                  }}
                  initial={reduced ? false : { opacity: 0 }}
                  animate={
                    reduced
                      ? { opacity: coneOpacity }
                      : intro === "done" || intro === "ui"
                        ? {
                            opacity: [
                              coneOpacity * 0.9,
                              coneOpacity,
                              coneOpacity * 0.9,
                            ],
                          }
                        : { opacity: coneOpacity }
                  }
                  transition={
                    reduced
                      ? { duration: 0 }
                      : intro === "cone"
                        ? { duration: 0.5, ease: easings.easeOut }
                        : intro === "done" || intro === "ui"
                          ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
                          : { duration: 0.5, ease: easings.easeOut }
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={hallUi.cone}
                    alt=""
                    className="size-full origin-center rotate-180 object-fill mix-blend-screen"
                    draggable={false}
                  />
                </motion.div>
              ) : null}

              {paintingBright ? (
                <motion.div
                  className="pointer-events-none absolute z-[7]"
                  style={{
                    left: focusSlot.frameRect.x * px,
                    top: focusSlot.frameRect.y * px,
                    width: focusSlot.frameRect.w * px,
                    height: focusSlot.frameRect.h * px,
                  }}
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: reduced ? 0 : 0.35,
                    ease: easings.easeOut,
                  }}
                >
                  {/* Sharp frame chrome; painting treatment is clipped to the opening */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={focusSlot.frameSrc}
                    alt=""
                    className="absolute inset-0 size-full object-contain drop-shadow-[1px_8px_12px_rgba(0,0,0,0.25)]"
                    draggable={false}
                    style={{
                      filter: showNormalPainting ? shelterFilter : undefined,
                    }}
                  />

                  {/* Stolen: blurred painting → memory unblur (frame stays sharp) */}
                  {isStolen ? (
                    <div
                      className="pointer-events-none absolute inset-0 overflow-hidden"
                      style={{ clipPath: emptyClip }}
                    >
                      <motion.img
                        src={focusSlot.frameSrc}
                        alt=""
                        className="absolute inset-0 size-full object-contain"
                        draggable={false}
                        initial={false}
                        animate={{ filter: stolenPaintFilter }}
                        transition={{
                          duration: revealDuration,
                          ease: easings.easeInOut,
                        }}
                      />
                    </div>
                  ) : null}

                  <AnimatePresence>
                    {isStolen && stolenPhase === "empty" ? (
                      <motion.div
                        key="empty-label"
                        className="absolute flex items-center justify-center px-md text-center"
                        style={emptyInsetCss}
                        initial={false}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: revealDuration,
                          ease: easings.easeInOut,
                        }}
                      >
                        <p
                          className="text-text-secondary"
                          style={{
                            fontSize: 14,
                            lineHeight: "20px",
                            textShadow: "0 1px 6px rgba(0,0,0,0.85)",
                          }}
                        >
                          Цього твору зараз немає в Україні
                        </p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  {/* Soft inner vignette on memory / muted shelter */}
                  {showMemoryPainting || isShelter ? (
                    <motion.div
                      className="pointer-events-none absolute overflow-hidden"
                      style={{
                        ...emptyInsetCss,
                        background:
                          "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.4) 100%)",
                      }}
                      initial={isStolen && !reduced ? { opacity: 0 } : false}
                      animate={{ opacity: isStolen ? 1 : 0.55 }}
                      transition={{
                        duration: revealDuration,
                        ease: easings.easeInOut,
                      }}
                    />
                  ) : null}
                </motion.div>
              ) : null}

              <AnimatePresence>
                {showLamp ? (
                  <motion.div
                    key="lamp"
                    className="pointer-events-none absolute z-[8]"
                    style={{
                      left: lampX * px,
                      top: layout.lamp.y * px,
                      width: layout.lamp.w * px,
                      height: layout.lamp.h * px,
                    }}
                    initial={reduced ? false : { opacity: 0 }}
                    animate={
                      reduced
                        ? { opacity: 1 }
                        : intro === "lamp"
                          ? { opacity: [0, 0.6, 0.3, 1] }
                          : { opacity: 1 }
                    }
                    transition={
                      reduced
                        ? { duration: 0 }
                        : intro === "lamp"
                          ? { duration: 0.3, times: [0, 0.33, 0.66, 1] }
                          : { duration: 0.2 }
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={hallUi.lamp}
                      alt=""
                      className="size-full object-contain"
                      draggable={false}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* 5. Captions — focus only; hidden during neighbor caption (12) */}
              <AnimatePresence>
                {showUi && neighborId == null ? (
                  <motion.div
                    key={`cap-${focus.id}`}
                    data-hall-caption={focus.id}
                    className="pointer-events-none absolute z-[9] flex max-w-[226px] flex-col items-center text-center"
                    style={{
                      left:
                        (focusSlot.frameRect.x + focusSlot.frameRect.w / 2) *
                        px,
                      top: layout.captions.titleY * px,
                      width: 226 * px,
                    }}
                    initial={{ opacity: 0, x: "-50%", y: 6 }}
                    animate={{ opacity: 1, x: "-50%", y: 0 }}
                    exit={{ opacity: 0, x: "-50%" }}
                  >
                    <p className="w-full text-h3 text-text-primary">
                      {focus.title}
                    </p>
                    <p
                      className="w-full text-body-md text-text-caption"
                      style={{
                        marginTop:
                          (layout.captions.metaY -
                            layout.captions.titleY -
                            24) *
                          px,
                      }}
                    >
                      {focus.author} · {shortYear(focus.year)}
                    </p>
                    <div
                      className="flex w-full justify-center"
                      style={{
                        marginTop:
                          (layout.captions.badgeY -
                            layout.captions.metaY -
                            20) *
                          px,
                      }}
                    >
                      <StatusBadge status={focus.status} />
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Memory line above frame (06) */}
              <AnimatePresence>
                {showMemoryLine ? (
                  <motion.p
                    key="memory-line"
                    className="pointer-events-none absolute z-[10] text-center text-body-md text-text-primary"
                    style={{
                      left:
                        (focusSlot.frameRect.x + focusSlot.frameRect.w / 2) *
                        px,
                      top: (focusSlot.frameRect.y - 36) * px,
                      width: Math.max(280, focusSlot.frameRect.w) * px,
                      x: "-50%",
                    }}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: reduced
                        ? motionTokens.reducedCrossfade
                        : 0.6,
                      delay: reduced ? 0 : 0.8,
                    }}
                  >
                    Але ми пам&apos;ятаємо, який він.
                  </motion.p>
                ) : null}
              </AnimatePresence>

              {/* Neighbor caption (12) */}
              <AnimatePresence>
                {neighborId != null
                  ? (() => {
                      const slot = slots.find((s) => s.artworkId === neighborId);
                      if (!slot) return null;
                      const cx =
                        (slot.frameRect.x + slot.frameRect.w / 2) * px;
                      const top =
                        (slot.frameRect.y + slot.frameRect.h + 12) * px;
                      return (
                        <motion.p
                          key={`neighbor-${neighborId}`}
                          className="pointer-events-none absolute z-[10] text-center text-body-md text-text-secondary"
                          style={{
                            left: cx,
                            top,
                            width: 226 * px,
                            x: "-50%",
                          }}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          Відкриється наступним шляхом
                        </motion.p>
                      );
                    })()
                  : null}
              </AnimatePresence>

              <AnimatePresence>
                {showUi &&
                neighborId == null &&
                (hintStolen || hintTour) ? (
                  <>
                    <motion.p
                      className="pointer-events-none absolute z-[10] text-right text-label-md leading-4 text-text-primary"
                      style={{
                        left: markerCx * px,
                        top: (markerCy - 11.5 - 55) * px,
                        width: 145 * px,
                      }}
                      initial={{ opacity: 0, x: "-50%" }}
                      animate={{ opacity: 1, x: "-50%" }}
                      exit={{ opacity: 0, x: "-50%" }}
                    >
                      {hintStolen ? (
                        <>Торкнись, щоб згадати</>
                      ) : (
                        <>
                          Торкнись картини,
                          <br />
                          щоб почати тур
                        </>
                      )}
                    </motion.p>
                    <motion.div
                      data-hall-marker
                      className="pointer-events-none absolute z-[10]"
                      style={{
                        left: markerCx * px,
                        top: markerCy * px,
                        width: 57 * px,
                        height: 57 * px,
                      }}
                      initial={false}
                      animate={
                        reduced
                          ? { opacity: 1, scale: 1, x: "-50%", y: "-50%" }
                          : {
                              opacity: [0.85, 1, 0.85],
                              scale: [1, 1.08, 1],
                              x: "-50%",
                              y: "-50%",
                            }
                      }
                      transition={
                        reduced
                          ? { duration: 0 }
                          : {
                              duration: motionTokens.pinPulse.duration,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={hallUi.marker}
                        alt=""
                        className="size-full"
                        draggable={false}
                      />
                    </motion.div>
                  </>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      ) : null}

      {(phase === "tour" ||
        phase === "explore" ||
        phase === "about" ||
        phase === "wallpaper") && (
        <TourStage
          key={tourKey}
          artwork={focus}
          onTourDone={onTourDone}
          startExplore={
            startExplore ||
            phase === "explore" ||
            phase === "about" ||
            phase === "wallpaper"
          }
          onClose={goToRouteMap}
          onReplayTour={() => {
            setStartExplore(false);
            setDetailZone(null);
            setTourKey((k) => k + 1);
            setPhase("tour");
          }}
          onZoneChange={setDetailZone}
          detailOpen={detailZone != null}
        />
      )}

      <AboutSheet
        key={`about-${focus.id}-${tourKey}`}
        artwork={focus}
        open={phase === "about" || phase === "explore"}
        dimmed={detailZone != null}
        showFinish={pathN != null}
        onWallpaper={() => {
          setDetailZone(null);
          setPhase("wallpaper");
        }}
        onAskGuide={() => {
          setDetailZone(null);
          setGuidePrefill(null);
          setGuideDetail(null);
          setPhase("ask-guide");
        }}
        onFinishPath={goToRouteMap}
      />

      {/* 08 detail: dim over sheet + floating card (above passport) */}
      <AnimatePresence>
        {detailZone && (phase === "about" || phase === "explore") ? (
          <>
            <motion.div
              key="detail-dim"
              className="absolute inset-x-0 bottom-0 z-[35] bg-black/55"
              style={{
                top: `calc(${PASSPORT_LAYOUT.dim.y / 844} * 100dvh)`,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: motionTokens.scrim }}
              onClick={() => setDetailZone(null)}
              aria-hidden
            />
            <DetailCard
              key={detailZone.position}
              zone={detailZone}
              sourceUrl={
                focus.sources.find((s) => s.url)?.url ?? null
              }
              onClose={() => setDetailZone(null)}
              onAskGuide={() => {
                const title = detailZone.title;
                setGuidePrefill(`Розкажи більше про: ${title}`);
                setGuideDetail(title);
                setDetailZone(null);
                setPhase("ask-guide");
              }}
            />
          </>
        ) : null}
      </AnimatePresence>

      {phase === "ask-guide" ? (
        <GuideScreen
          key={`guide-${focus.id}-${guidePrefill ?? "plain"}-${guideDetail ?? ""}`}
          artwork={focus}
          open
          prefill={guidePrefill}
          detailTitle={guideDetail}
          onBack={() => {
            setGuidePrefill(null);
            setGuideDetail(null);
            setDetailZone(null);
            setPhase("about");
          }}
        />
      ) : null}

      <WallpaperScreen
        artwork={focus}
        open={phase === "wallpaper"}
        onClose={() => setPhase("about")}
        onSaved={() => {
          completeCurrentPath();
          setPhase("wallpaper-saved");
        }}
      />

      <WallpaperSavedScreen
        open={phase === "wallpaper-saved"}
        next={nextPath ?? null}
        sameMuseum={nextSameMuseum}
        onContinue={continueAfterWallpaper}
      />

      <RouteMapScreen
        key={nextPath ? `route-${nextPath.n}` : "route"}
        open={phase === "route"}
        next={nextPath ?? null}
        onDepart={departNext}
      />
    </div>
  );
}
