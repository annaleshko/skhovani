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
  openingShape,
  paintingOpeningInset,
  type HallSlot,
} from "@/data/hall-layouts";
import { getHallAssets } from "@/data/halls";
import {
  getNextPath,
  getPaths,
  shouldSkipMapToHall,
  type ResolvedPath,
} from "@/data/journey";
import { getMuseumShortLabel } from "@/data/museums";
import { displayAuthorMeta, displayHeadline } from "@/lib/artwork-display";
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

/** Focus stolen before tap — heavy blur clipped to the painting / glass opening. */
const STOLEN_BLUR_FILTER = "blur(18px) brightness(0.45) saturate(0.55)";
/** Melitopol vitrine interior only. */
const VITRINE_BLUR_FILTER = "blur(14px) brightness(0.5) saturate(0.6)";

function stolenBlurFor(artworkId: number): string {
  return artworkId === 3 ? VITRINE_BLUR_FILTER : STOLEN_BLUR_FILTER;
}

function memoryLineCopy(artworkId: number): string {
  if (artworkId === 3) return "Але ми пам'ятаємо, яким воно було.";
  return "Але ми пам'ятаємо, який він.";
}

type Props = {
  museumId: string;
  pathN: number | null;
  artworkId: number;
  /**
   * Revisit of an already-opened artwork: hall shows full color above darkness,
   * tap → passport (no empty/blur/tour).
   */
  reopenHall?: boolean;
};

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
export function HallExperience({
  museumId,
  pathN,
  artworkId,
  reopenHall = false,
}: Props) {
  const router = useRouter();
  const reduced = useReducedMotionSafe();
  const {
    markPathComplete,
    markTourSeen,
    completedPaths,
    openedArtworkIds,
  } = useAppState();
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
  /** Frames already opened (completed path or tour-seen). */
  const openedIds = useMemo(() => {
    const ids = new Set(openedArtworkIds);
    for (const p of getPaths()) {
      if (completedPaths.includes(p.n)) ids.add(p.artworkId);
    }
    return ids;
  }, [completedPaths, openedArtworkIds]);

  const slots = useMemo(() => layout?.slots ?? [], [layout]);
  const [viewArtworkId, setViewArtworkId] = useState(artworkId);
  const focusSlotIndex = Math.max(
    0,
    slots.findIndex((s) => s.artworkId === viewArtworkId),
  );
  const pathSlotIndex = Math.max(
    0,
    slots.findIndex((s) => s.artworkId === artworkId),
  );
  const focus = getArtwork(viewArtworkId) ?? getArtwork(slots[0]?.artworkId ?? -1);
  const isReplayPassport = viewArtworkId !== artworkId;

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
  const [stolenPhase, setStolenPhase] = useState<StolenPhase>(() =>
    reopenHall ? "remembered" : "empty",
  );
  const [wallpaperShared, setWallpaperShared] = useState(false);
  const [focusKey, setFocusKey] = useState(artworkId);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [viewH, setViewH] = useState(844);
  const [viewW, setViewW] = useState(390);
  const [scrollLeftPx, setScrollLeftPx] = useState(0);
  const neighborTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Same-museum next path: reset hall state during render (keeps scroll position)
  if (artworkId !== focusKey) {
    setFocusKey(artworkId);
    setViewArtworkId(artworkId);
    setStolenPhase(reopenHall ? "remembered" : "empty");
    setNeighborId(null);
    setPhase("hall");
    setIntroStep(reduced ? "done" : "black");
    setShakeId(null);
  }

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      setViewH(el.clientHeight || 844);
      setViewW(el.clientWidth || 390);
    };
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
  const showNormalPainting = isShelter || isSaved || reopenHall;

  // Center on path artwork — 600ms ease for same-museum moves
  useEffect(() => {
    if (phase !== "hall" || !slots[pathSlotIndex]) return;
    const el = scrollerRef.current;
    if (!el) return;
    const slot = slots[pathSlotIndex]!;
    const centerX = (slot.frameRect.x + slot.frameRect.w / 2) * px;
    const left = Math.max(0, centerX - el.clientWidth / 2);
    const t = window.setTimeout(() => {
      scrollLeftTo(el, left, motionTokens.hallScroll, reduced);
    }, 40);
    return () => window.clearTimeout(t);
  }, [pathSlotIndex, phase, reduced, slots, px, artworkId]);

  // Track horizontal scroll for hint-ring viewport clamp
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || phase !== "hall") return;
    const onScroll = () => setScrollLeftPx(el.scrollLeft);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [phase]);

  // Mouse drag-to-scroll (momentum + snap), no text selection
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || phase !== "hall") return;
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startScroll = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;
    let momentumId = 0;

    const stopMomentum = () => {
      if (momentumId) cancelAnimationFrame(momentumId);
      momentumId = 0;
    };

    const nearestSnap = () => {
      if (!slots.length) return el.scrollLeft;
      let best = el.scrollLeft;
      let bestD = Infinity;
      for (const slot of slots) {
        const centerX = (slot.frameRect.x + slot.frameRect.w / 2) * px;
        const left = Math.max(0, centerX - el.clientWidth / 2);
        const d = Math.abs(left - el.scrollLeft);
        if (d < bestD) {
          bestD = d;
          best = left;
        }
      }
      return best;
    };

    /** Pending press — capture only after >6px so clicks reach frame buttons. */
    let pending = false;
    let pointerId: number | null = null;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return; // native touch scroll + snap
      if (e.button !== 0) return;
      stopMomentum();
      pending = true;
      dragging = false;
      moved = false;
      pointerId = e.pointerId;
      startX = e.clientX;
      lastX = e.clientX;
      lastT = performance.now();
      startScroll = el.scrollLeft;
      velocity = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pending && !dragging) return;
      const dx = e.clientX - startX;
      // Threshold: simple click must not capture / swallow
      if (pending && !dragging) {
        if (Math.abs(dx) <= 6) return;
        pending = false;
        dragging = true;
        moved = true;
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        el.style.cursor = "grabbing";
      }
      if (!dragging) return;
      el.scrollLeft = startScroll - dx;
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      velocity = ((e.clientX - lastX) / dt) * 16;
      lastX = e.clientX;
      lastT = now;
    };

    const onPointerUp = () => {
      const wasDragging = dragging;
      pending = false;
      dragging = false;
      el.style.cursor = "";
      if (pointerId != null) {
        try {
          el.releasePointerCapture(pointerId);
        } catch {
          /* ignore */
        }
        pointerId = null;
      }
      if (!wasDragging || !moved) return;
      // Suppress the click that would open a frame after a drag
      const swallow = (ev: Event) => {
        ev.preventDefault();
        ev.stopPropagation();
        el.removeEventListener("click", swallow, true);
      };
      el.addEventListener("click", swallow, true);
      window.setTimeout(() => el.removeEventListener("click", swallow, true), 0);
      // Momentum then snap
      const tick = () => {
        velocity *= 0.92;
        if (Math.abs(velocity) < 0.4) {
          scrollLeftTo(el, nearestSnap(), motionTokens.hallScroll, reduced);
          return;
        }
        el.scrollLeft -= velocity;
        momentumId = requestAnimationFrame(tick);
      };
      momentumId = requestAnimationFrame(tick);
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    return () => {
      stopMomentum();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
  }, [phase, px, reduced, slots]);

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

    // Neighbor frame
    if (art.id !== artworkId) {
      // Already opened → straight to passport 16
      if (openedIds.has(art.id)) {
        setNeighborId(null);
        setDetailZone(null);
        setViewArtworkId(art.id);
        setPhase("about");
        return;
      }
      // Not yet opened — quiet caption only (no 12б sheet)
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

    // Path focus frame
    setViewArtworkId(artworkId);
    // Revisit of already-opened artwork → passport directly
    if (reopenHall || openedIds.has(artworkId)) {
      if (reopenHall || stolenPhase !== "empty") {
        setPhase("about");
        return;
      }
    }
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

  const completeCurrentPath = useCallback(() => {
    if (pathN != null && focus) markPathComplete(pathN, focus.id);
  }, [focus, markPathComplete, pathN]);

  const onTourDone = useCallback(() => {
    if (focus) markTourSeen(focus.id);
    // Reaching passport 16 marks the path completed.
    completeCurrentPath();
    setDetailZone(null);
    // Passport screen 16 (painting + collapsed sheet); detail 08 overlays on tap.
    setPhase("about");
  }, [completeCurrentPath, focus, markTourSeen]);

  const goToRouteMap = useCallback(() => {
    if (isReplayPassport) {
      // Reopened passport «×» → back to current path hall (decision).
      setViewArtworkId(artworkId);
      setDetailZone(null);
      setPhase("hall");
      return;
    }
    completeCurrentPath();
    // Passport «×» → always 02в (even when next path is same museum).
    setPhase("route");
  }, [artworkId, completeCurrentPath, isReplayPassport]);

  const departNext = useCallback(
    (path: ResolvedPath) => {
      // 02в «Вирушити» always flies — never skip to hall (path 1 / first visit).
      router.replace(`/journey?path=${path.n}&autostart=1`);
    },
    [router],
  );

  /** Next unfinished path for passport «Далі — <місто>». */
  const continueTarget = useMemo(() => {
    // Reopened passport: don't treat the in-progress path as done.
    const base = isReplayPassport ? completedPaths : completedWithCurrent;
    return getNextPath(base) ?? null;
  }, [completedPaths, completedWithCurrent, isReplayPassport]);

  const continueLabel = useMemo(() => {
    if (!continueTarget) return "Шлях пройдено";
    return `Далі — ${getMuseumShortLabel(continueTarget.museumId)}`;
  }, [continueTarget]);

  const goContinueFromPassport = useCallback(() => {
    completeCurrentPath();
    setViewArtworkId(artworkId);
    setDetailZone(null);
    const target = continueTarget;
    if (!target) {
      setPhase("route");
      return;
    }
    const skipMap = shouldSkipMapToHall(
      isReplayPassport ? completedPaths : completedWithCurrent,
      target,
    );
    if (skipMap) {
      router.replace(
        `/hall/${target.museumId}?path=${target.n}&artwork=${target.artworkId}`,
      );
      return;
    }
    setPhase("route");
  }, [
    artworkId,
    completeCurrentPath,
    completedPaths,
    completedWithCurrent,
    continueTarget,
    isReplayPassport,
    router,
  ]);

  useEffect(() => {
    return () => {
      clearRevealTimers();
      if (neighborTimer.current) clearTimeout(neighborTimer.current);
    };
  }, [clearRevealTimers]);

  const litSlotIds = useMemo(() => {
    const ids = new Set<number>(openedIds);
    ids.add(artworkId);
    return ids;
  }, [openedIds, artworkId]);

  if (!focus || !museum || !layout) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-screen px-xl text-body-md text-text-secondary">
        Залу не знайдено
      </div>
    );
  }

  const showHall = phase === "hall";
  const focusSlot = slots[focusSlotIndex]!;
  const pathSlot = slots[pathSlotIndex]!;
  const hallFocusSlot = showHall ? pathSlot : focusSlot;
  const coneTop = layout.cone.y;
  const emptyInset = paintingOpeningInset(
    showHall ? artworkId : focus.id,
  );
  // Hint ring: top-right of glass/opening, clamped into the visible viewport (16px margin).
  const markerPos = (() => {
    const r = hallFocusSlot.frameRect;
    const inset = emptyInset;
    const glassRight = r.x + r.w * (1 - inset.right);
    const glassTop = r.y + r.h * inset.top;
    let cx = glassRight - 8;
    let cy = glassTop + 14;
    const margin = 16 / px;
    const half = 28.5;
    const scrollDes = scrollLeftPx / px;
    const visL = scrollDes;
    const visR = scrollDes + viewW / px;
    const visT = 0;
    const visB = viewH / px;
    cx = Math.min(Math.max(cx, visL + margin + half), visR - margin - half);
    cy = Math.min(Math.max(cy, visT + margin + half), visB - margin - half);
    // Hint label (145×~40) sits above the ring, centered on cx
    const hintW = 145;
    const hintH = 40;
    let hintLeft = cx - hintW / 2;
    let hintTop = cy - 11.5 - 55;
    hintLeft = Math.min(
      Math.max(hintLeft, visL + margin),
      visR - margin - hintW,
    );
    hintTop = Math.min(
      Math.max(hintTop, visT + margin),
      Math.max(visT + margin, cy - half - hintH - 8),
    );
    return { cx, cy, hintLeft, hintTop, hintW };
  })();
  const markerCx = markerPos.cx;
  const markerCy = markerPos.cy;

  const showUi = intro === "ui" || intro === "done";
  const showCone = intro === "cone" || intro === "bright" || showUi;
  const showLamp = intro !== "black";
  const paintingBright = intro === "bright" || showUi;
  const darknessAlpha = intro === "black" ? 1 : 0.7;
  const coneOpacity = isShelter ? 0.7 : 0.9;

  const hintStolen = isStolen && stolenPhase === "empty" && !reopenHall;
  const hintTour = (isShelter || isSaved) && showUi && !reopenHall;
  const hintPassport = reopenHall && showUi;
  const showMemoryLine =
    isStolen &&
    !reopenHall &&
    (stolenPhase === "revealing" || stolenPhase === "remembered") &&
    showUi;

  const shelterFilter = isShelter
    ? "brightness(0.85) sepia(0.1)"
    : undefined;
  const revealDuration = reduced
    ? motionTokens.reducedCrossfade
    : motionTokens.memoryReveal;
  const emptyInsetCss = openingInsetStyle(emptyInset);

  return (
    <div
      ref={stageRef}
      className="relative min-h-dvh overflow-hidden bg-screen text-text-primary"
    >
      {showHall ? (
        <div className="absolute inset-0 z-0">
          <div
            ref={scrollerRef}
            className="absolute inset-0 cursor-grab overflow-x-auto overflow-y-hidden snap-x snap-mandatory select-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ userSelect: "none", WebkitUserSelect: "none" }}
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

              {/* 2. ALL frames under darkness (unopened stay here) */}
              {slots.map((slot) => {
                const art = getArtwork(slot.artworkId);
                const isPathFocus = slot.artworkId === artworkId;
                const isOpenedFrame = openedIds.has(slot.artworkId);
                const r = slot.frameRect;
                const inset = paintingOpeningInset(slot.artworkId);
                const shape = openingShape(slot.artworkId);
                const clip = openingClipPath(inset, shape);
                // Under darkness: hidden plate / blur for not-yet-opened; frame chrome for opened (lit copy above).
                const underSrc =
                  !isOpenedFrame && !isPathFocus && slot.hiddenSrc
                    ? slot.hiddenSrc
                    : slot.frameSrc;
                const needsBlurCover =
                  !isOpenedFrame &&
                  !isPathFocus &&
                  !slot.hiddenSrc &&
                  art?.status === "stolen";
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
                      src={underSrc}
                      alt=""
                      className="pointer-events-none absolute inset-0 size-full object-contain drop-shadow-[1px_8px_12px_rgba(0,0,0,0.25)]"
                      draggable={false}
                    />
                    {needsBlurCover ? (
                      <div
                        className="pointer-events-none absolute inset-0 overflow-hidden"
                        style={{ clipPath: clip }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={slot.frameSrc}
                          alt=""
                          className="absolute inset-0 size-full object-contain"
                          draggable={false}
                          style={{ filter: stolenBlurFor(slot.artworkId) }}
                        />
                      </div>
                    ) : null}
                    <button
                      type="button"
                      aria-label={
                        art
                          ? `${displayHeadline(art)}, ${art.author}`
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

              {/* 4. Opened frames ABOVE darkness — full color + lamp + cone */}
              {paintingBright
                ? slots
                    .filter(
                      (s) =>
                        litSlotIds.has(s.artworkId) &&
                        (openedIds.has(s.artworkId) ||
                          s.artworkId === artworkId),
                    )
                    .map((slot) => {
                      const isActive = slot.artworkId === artworkId;
                      const isOpenedNeighbor =
                        openedIds.has(slot.artworkId) && !isActive;
                      const showOpenedFull =
                        isOpenedNeighbor || (isActive && reopenHall);
                      const focusStolenEmpty =
                        isActive &&
                        isStolen &&
                        !reopenHall &&
                        stolenPhase === "empty";
                      const focusStolenReveal =
                        isActive &&
                        isStolen &&
                        !reopenHall &&
                        stolenPhase !== "empty";
                      const inset = paintingOpeningInset(slot.artworkId);
                      const shape = openingShape(slot.artworkId);
                      const clip = openingClipPath(inset, shape);
                      const slotConeX =
                        slot.lampX + layout.lamp.w / 2 - layout.cone.w / 2;
                      return (
                        <div key={`lit-${slot.artworkId}`}>
                          {showCone ? (
                            <motion.div
                              data-hall-cone={isActive ? true : undefined}
                              className="pointer-events-none absolute z-[6]"
                              style={{
                                left: slotConeX * px,
                                top: coneTop * px,
                                width: layout.cone.w * px,
                                height: layout.cone.h * px,
                              }}
                              initial={reduced ? false : { opacity: 0 }}
                              animate={{
                                opacity: isActive
                                  ? coneOpacity
                                  : coneOpacity * 0.55,
                              }}
                              transition={{
                                duration: reduced ? 0 : 0.5,
                                ease: easings.easeOut,
                              }}
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

                          <motion.div
                            className="pointer-events-none absolute z-[7]"
                            style={{
                              left: slot.frameRect.x * px,
                              top: slot.frameRect.y * px,
                              width: slot.frameRect.w * px,
                              height: slot.frameRect.h * px,
                            }}
                            initial={reduced ? false : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{
                              duration: reduced ? 0 : 0.35,
                              ease: easings.easeOut,
                            }}
                          >
                            {/* Frame chrome */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={slot.frameSrc}
                              alt=""
                              className="absolute inset-0 size-full object-contain drop-shadow-[1px_8px_12px_rgba(0,0,0,0.25)]"
                              draggable={false}
                              style={{
                                filter:
                                  isActive && showNormalPainting && isShelter
                                    ? shelterFilter
                                    : undefined,
                                opacity:
                                  focusStolenEmpty || focusStolenReveal
                                    ? 1
                                    : 1,
                              }}
                            />

                            {/* Opened / reopen: full color, no memory filter */}
                            {showOpenedFull ? null : null}

                            {/* Current stolen: crossfade hidden/blur → revealed */}
                            {isActive && isStolen && !reopenHall ? (
                              <div
                                className="pointer-events-none absolute inset-0 overflow-hidden"
                                style={{ clipPath: clip }}
                              >
                                {hallFocusSlot.hiddenSrc ? (
                                  <motion.img
                                    src={hallFocusSlot.hiddenSrc}
                                    alt=""
                                    className="absolute inset-0 size-full object-contain"
                                    draggable={false}
                                    initial={false}
                                    animate={{
                                      opacity:
                                        stolenPhase === "empty" ? 1 : 0,
                                    }}
                                    transition={{
                                      duration: revealDuration,
                                      ease: easings.easeInOut,
                                    }}
                                  />
                                ) : null}
                                <motion.img
                                  src={slot.frameSrc}
                                  alt=""
                                  className="absolute inset-0 size-full object-contain"
                                  draggable={false}
                                  initial={false}
                                  animate={{
                                    opacity:
                                      stolenPhase === "empty" &&
                                      hallFocusSlot.hiddenSrc
                                        ? 0
                                        : 1,
                                    filter:
                                      stolenPhase === "empty"
                                        ? stolenBlurFor(slot.artworkId)
                                        : "none",
                                  }}
                                  transition={{
                                    duration: revealDuration,
                                    ease: easings.easeInOut,
                                  }}
                                />
                              </div>
                            ) : null}

                            <AnimatePresence>
                              {isActive &&
                              isStolen &&
                              !reopenHall &&
                              stolenPhase === "empty" ? (
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
                                      textShadow:
                                        "0 1px 6px rgba(0,0,0,0.85)",
                                    }}
                                  >
                                    Цього твору зараз немає в Україні
                                  </p>
                                </motion.div>
                              ) : null}
                            </AnimatePresence>
                          </motion.div>
                        </div>
                      );
                    })
                : null}

              <AnimatePresence>
                {showLamp
                  ? slots
                      .filter((s) => litSlotIds.has(s.artworkId))
                      .map((slot) => {
                        const isActive = slot.artworkId === artworkId;
                        const targetOpacity = isActive ? 1 : 0.85;
                        return (
                          <motion.div
                            key={`lamp-${slot.artworkId}`}
                            className="pointer-events-none absolute z-[8]"
                            style={{
                              left: slot.lampX * px,
                              top: layout.lamp.y * px,
                              width: layout.lamp.w * px,
                              height: layout.lamp.h * px,
                            }}
                            initial={reduced ? false : { opacity: 0 }}
                            animate={
                              reduced
                                ? { opacity: targetOpacity }
                                : isActive && intro === "lamp"
                                  ? { opacity: [0, 0.6, 0.3, 1] }
                                  : { opacity: targetOpacity }
                            }
                            transition={
                              reduced
                                ? { duration: 0 }
                                : isActive && intro === "lamp"
                                  ? {
                                      duration: 0.3,
                                      times: [0, 0.33, 0.66, 1],
                                    }
                                  : {
                                      duration: motionTokens.hallScroll,
                                      ease: easings.easeInOut,
                                    }
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
                        );
                      })
                  : null}
              </AnimatePresence>

              {/* 5. Captions — every lit opened frame (Figma 05); hidden during neighbor (12) */}
              <AnimatePresence>
                {showUi && neighborId == null
                  ? slots
                      .filter(
                        (s) =>
                          litSlotIds.has(s.artworkId) &&
                          (openedIds.has(s.artworkId) ||
                            s.artworkId === artworkId),
                      )
                      .map((slot) => {
                        const art = getArtwork(slot.artworkId);
                        if (!art) return null;
                        const isActiveCap = slot.artworkId === artworkId;
                        return (
                          <motion.div
                            key={`cap-${slot.artworkId}`}
                            data-hall-caption={slot.artworkId}
                            className="pointer-events-none absolute z-[9] flex max-w-[226px] flex-col items-center text-center"
                            style={{
                              left:
                                (slot.frameRect.x + slot.frameRect.w / 2) * px,
                              top: layout.captions.titleY * px,
                              width: 226 * px,
                              opacity: isActiveCap ? 1 : 0.92,
                            }}
                            initial={{ opacity: 0, x: "-50%", y: 6 }}
                            animate={{
                              opacity: isActiveCap ? 1 : 0.92,
                              x: "-50%",
                              y: 0,
                            }}
                            exit={{ opacity: 0, x: "-50%" }}
                          >
                            <p className="w-full text-h3 text-text-primary">
                              {displayHeadline(art)}
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
                              {displayAuthorMeta(art)}
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
                              <StatusBadge status={art.status} />
                            </div>
                          </motion.div>
                        );
                      })
                  : null}
              </AnimatePresence>

              {/* Memory line above glass/frame (06); hide if it would hit lamp/title at short heights */}
              <AnimatePresence>
                {showMemoryLine
                  ? (() => {
                      const r = hallFocusSlot.frameRect;
                      const glassTop = r.y + r.h * emptyInset.top;
                      const lineH = 20;
                      const gap = 16;
                      const topDes = glassTop - gap - lineH;
                      const lampBottom =
                        layout.lamp.y + layout.lamp.h + 8;
                      const titleTop = layout.captions.titleY;
                      // Title is below object for Melitopol; for others title is below frame.
                      // Hide when no room above glass without overlapping lamp (or title if above).
                      const titleAbove =
                        titleTop + 24 < glassTop;
                      const fits =
                        topDes * px >= 16 &&
                        topDes >= lampBottom &&
                        (!titleAbove || topDes + lineH + 8 <= titleTop);
                      if (!fits) return null;
                      return (
                        <motion.p
                          key="memory-line"
                          className="pointer-events-none absolute z-[10] text-center text-body-md text-text-primary"
                          style={{
                            left: (r.x + r.w / 2) * px,
                            top: topDes * px,
                            width: Math.max(280, r.w) * px,
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
                          {memoryLineCopy(artworkId)}
                        </motion.p>
                      );
                    })()
                  : null}
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
                (hintStolen || hintTour || hintPassport) ? (
                  <>
                    <motion.p
                      className="pointer-events-none absolute z-[10] text-right text-label-md leading-4 text-text-primary"
                      style={{
                        left: markerPos.hintLeft * px,
                        top: markerPos.hintTop * px,
                        width: markerPos.hintW * px,
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {hintStolen ? (
                        <>Торкнись, щоб згадати</>
                      ) : hintPassport ? (
                        <>Торкнись картини</>
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
          onSaveWallpaper={() => {
            setDetailZone(null);
            setPhase("wallpaper");
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
        continueLabel={continueLabel}
        onContinue={goContinueFromPassport}
        onAskGuide={() => {
          setDetailZone(null);
          setGuidePrefill(null);
          setGuideDetail(null);
          setPhase("ask-guide");
        }}
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
        onSaved={({ shared }) => {
          setWallpaperShared(shared);
          setPhase("wallpaper-saved");
        }}
      />

      <WallpaperSavedScreen
        open={phase === "wallpaper-saved"}
        previewSrc={focus.image ?? focus.wallpaper}
        artworkTitle={displayHeadline(focus)}
        sharedViaShare={wallpaperShared}
        onContinue={() => {
          setPhase("about");
        }}
      />

      <RouteMapScreen
        key={nextPath ? `route-${nextPath.n}` : "route"}
        open={phase === "route"}
        next={nextPath ?? null}
        onDepart={departNext}
        onRevisit={(path, opts) => {
          const reopen = opts.reopen ? "&reopen=1" : "";
          router.replace(
            `/journey?path=${path.n}&autostart=1&revisit=1${reopen}`,
          );
        }}
      />
    </div>
  );
}
