"use client";

import { AboutSheet } from "@/components/about/AboutSheet";
import { JourneyFlow } from "@/components/journey/JourneyFlow";
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
  getPathForArtwork,
  getPaths,
  getNextPathInMuseum,
  type ResolvedPath,
} from "@/data/journey";
import { getMuseumShortLabel } from "@/data/museums";
import {
  displayAuthorMeta,
  displayHeadline,
} from "@/lib/artwork-display";
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
/** Melitopol vitrine interior only (Figma stolen state). */
const VITRINE_BLUR_FILTER = "blur(14px) brightness(0.5)";

function stolenBlurFor(artworkId: number): string {
  return artworkId === 3 ? VITRINE_BLUR_FILTER : STOLEN_BLUR_FILTER;
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
  const slots = useMemo(() => layout?.slots ?? [], [layout]);
  const [viewArtworkId, setViewArtworkId] = useState(artworkId);
  /** Active hall focus — may diverge from URL when freely exploring. */
  const [hallActiveId, setHallActiveId] = useState(artworkId);
  const [hallActivePathN, setHallActivePathN] = useState(pathN);
  const completedWithCurrent = useMemo(() => {
    if (hallActivePathN == null) return completedPaths;
    return completedPaths.includes(hallActivePathN)
      ? completedPaths
      : [...completedPaths, hallActivePathN].sort((a, b) => a - b);
  }, [completedPaths, hallActivePathN]);
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
  const focusSlotIndex = Math.max(
    0,
    slots.findIndex((s) => s.artworkId === viewArtworkId),
  );
  const pathSlotIndex = Math.max(
    0,
    slots.findIndex((s) => s.artworkId === hallActiveId),
  );
  const focus = getArtwork(viewArtworkId) ?? getArtwork(slots[0]?.artworkId ?? -1);
  const isReplayPassport = viewArtworkId !== hallActiveId;

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
  /** 02в → flight without /journey navigation (same cam07 framing). */
  const [routeFlight, setRouteFlight] = useState<number | null>(null);
  const [focusKey, setFocusKey] = useState(artworkId);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const hallStageInnerRef = useRef<HTMLDivElement>(null);
  const [viewH, setViewH] = useState(844);
  const [viewW, setViewW] = useState(390);
  const [scrollLeftPx, setScrollLeftPx] = useState(0);
  /** Focus frame in design px after object-contain (from DOM measure). */
  const [focusFrameDes, setFocusFrameDes] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const neighborTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Same-museum next path: reset hall state during render (keeps scroll position)
  if (artworkId !== focusKey) {
    setFocusKey(artworkId);
    setViewArtworkId(artworkId);
    setHallActiveId(artworkId);
    setHallActivePathN(pathN);
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
  // Cover scale: fill the viewport (no letterbox). Crop overflow; centre the stage.
  const px = Math.max(viewW / 390, viewH / 844);
  const stageH = designH * px;
  const stageOffsetY = (viewH - stageH) / 2;
  // Side pads so edge frames can centre and the wall never shows its end.
  const edgePadDes = Math.max(24, Math.ceil(viewW / (2 * px)));
  const hallWidthPx = Math.max((designW + edgePadDes * 2) * px, viewW);

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
    const centerX =
      (slot.frameRect.x + edgePadDes + slot.frameRect.w / 2) * px;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const left = Math.min(
      maxScroll,
      Math.max(0, centerX - el.clientWidth / 2),
    );
    const t = window.setTimeout(() => {
      scrollLeftTo(el, left, motionTokens.hallScroll, reduced);
    }, 40);
    return () => window.clearTimeout(t);
  }, [pathSlotIndex, phase, reduced, slots, px, hallActiveId, edgePadDes]);

  // Track horizontal scroll for hint-ring viewport clamp
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || phase !== "hall") return;
    const onScroll = () => setScrollLeftPx(el.scrollLeft);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [phase]);

  // Measure the rendered focus frame (object-contain) → design px for the hint ring.
  useEffect(() => {
    if (phase !== "hall" || px <= 0) return;
    const measure = () => {
      const stage = hallStageInnerRef.current;
      const frame = stage?.querySelector(
        `[data-hall-idx="${artworkId}"]`,
      ) as HTMLElement | null;
      const img = frame?.querySelector("img") as HTMLImageElement | null;
      if (!stage || !frame) return;
      const stageBox = stage.getBoundingClientRect();
      const box = (img ?? frame).getBoundingClientRect();
      let x = (box.left - stageBox.left + scrollLeftPx) / px;
      let y = (box.top - stageBox.top) / px;
      let w = box.width / px;
      let h = box.height / px;
      if (img && img.naturalWidth > 0 && img.clientWidth > 0) {
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        const cw = img.clientWidth;
        const ch = img.clientHeight;
        const scale = Math.min(cw / nw, ch / nh);
        const rw = nw * scale;
        const rh = nh * scale;
        const ox = (cw - rw) / 2;
        const oy = (ch - rh) / 2;
        x = (box.left - stageBox.left + scrollLeftPx + ox) / px;
        y = (box.top - stageBox.top + oy) / px;
        w = rw / px;
        h = rh / px;
      }
      setFocusFrameDes((prev) => {
        if (
          prev &&
          Math.abs(prev.x - x) < 0.5 &&
          Math.abs(prev.y - y) < 0.5 &&
          Math.abs(prev.w - w) < 0.5 &&
          Math.abs(prev.h - h) < 0.5
        ) {
          return prev;
        }
        return { x, y, w, h };
      });
    };
    measure();
    const id = window.setTimeout(measure, 160);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", measure);
    };
  }, [phase, artworkId, px, scrollLeftPx, viewW, viewH, stolenPhase]);

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
        const centerX =
          (slot.frameRect.x + edgePadDes + slot.frameRect.w / 2) * px;
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
  }, [phase, px, reduced, slots, edgePadDes]);

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

  const beginArtworkFlow = useCallback(
    (artId: number) => {
      const art = getArtwork(artId);
      const pathFor = getPathForArtwork(artId);
      if (!art || !pathFor) return;
      setNeighborId(null);
      setDetailZone(null);
      setViewArtworkId(artId);
      setHallActiveId(artId);
      setHallActivePathN(pathFor.n);
      if (reopenHall || openedIds.has(artId)) {
        setStolenPhase("remembered");
        setPhase("about");
        return;
      }
      if (art.status === "stolen") {
        setStolenPhase("empty");
        clearRevealTimers();
        // Defer reveal so focus/status state commits first.
        window.setTimeout(() => startReveal(), 0);
        return;
      }
      setStolenPhase("remembered");
      openTour();
    },
    [clearRevealTimers, openedIds, openTour, reopenHall, startReveal],
  );

  const onFrameTap = (slot: HallSlot) => {
    const art = getArtwork(slot.artworkId);
    if (!art) return;

    // Already-opened neighbour → passport 16 (replay), keep hall active as-is
    if (art.id !== hallActiveId && openedIds.has(art.id)) {
      setNeighborId(null);
      setDetailZone(null);
      setViewArtworkId(art.id);
      setPhase("about");
      return;
    }

    // Free exploration: any unopened frame is tappable (or re-tap active)
    if (art.id !== hallActiveId) {
      beginArtworkFlow(art.id);
      return;
    }

    // Active frame
    setViewArtworkId(hallActiveId);
    if (reopenHall || openedIds.has(hallActiveId)) {
      if (reopenHall || stolenPhase !== "empty") {
        setPhase("about");
        return;
      }
    }
    if (art.status === "stolen") {
      if (stolenPhase === "empty") {
        clearRevealTimers();
        startReveal();
        return;
      }
      openTour();
      return;
    }
    openTour();
  };

  const completeCurrentPath = useCallback(() => {
    if (hallActivePathN != null && focus) {
      markPathComplete(hallActivePathN, focus.id);
    }
  }, [focus, hallActivePathN, markPathComplete]);

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

  const departNext = useCallback((path: ResolvedPath) => {
    // Fly inside this tree — JourneyFlow starts at cam07 (same as 02в map).
    setRouteFlight(path.n);
  }, []);

  /** Next unopened in this hall, else null → 02в / «Шлях пройдено». */
  const continueInHall = useMemo(() => {
    const base = isReplayPassport ? completedPaths : completedWithCurrent;
    return getNextPathInMuseum(museumId, base) ?? null;
  }, [completedPaths, completedWithCurrent, isReplayPassport, museumId]);

  const continueGlobal = useMemo(() => {
    const base = isReplayPassport ? completedPaths : completedWithCurrent;
    return getNextPath(base) ?? null;
  }, [completedPaths, completedWithCurrent, isReplayPassport]);

  const continueLabel = useMemo(() => {
    if (continueInHall) {
      return `Далі — ${getMuseumShortLabel(continueInHall.museumId)}`;
    }
    if (continueGlobal) {
      return `Далі — ${getMuseumShortLabel(continueGlobal.museumId)}`;
    }
    return "Шлях пройдено";
  }, [continueGlobal, continueInHall]);

  const goContinueFromPassport = useCallback(() => {
    setDetailZone(null);

    // Reopened passport: don't mark the in-progress hall focus done.
    if (isReplayPassport) {
      if (continueInHall) {
        beginArtworkFlow(continueInHall.artworkId);
        return;
      }
      setViewArtworkId(hallActiveId);
      setPhase("route");
      return;
    }

    completeCurrentPath();
    if (continueInHall) {
      // Stay in hall — next unopened artwork here.
      beginArtworkFlow(continueInHall.artworkId);
      return;
    }
    // No more in this hall → 02в (route to first unvisited path globally).
    setViewArtworkId(hallActiveId);
    setPhase("route");
  }, [
    beginArtworkFlow,
    completeCurrentPath,
    continueInHall,
    hallActiveId,
    isReplayPassport,
  ]);

  useEffect(() => {
    return () => {
      clearRevealTimers();
      if (neighborTimer.current) clearTimeout(neighborTimer.current);
    };
  }, [clearRevealTimers]);

  const litSlotIds = useMemo(() => {
    const ids = new Set<number>(openedIds);
    ids.add(hallActiveId);
    return ids;
  }, [openedIds, hallActiveId]);

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
    showHall ? hallActiveId : focus.id,
  );

  const showUi = intro === "ui" || intro === "done";
  const showCone = intro === "cone" || intro === "bright" || showUi;
  const showLamp = intro !== "black";
  const paintingBright = intro === "bright" || showUi;
  const darknessAlpha = intro === "black" ? 1 : 0.7;
  const coneOpacity = isShelter ? 0.7 : 0.9;

  const hintStolen = isStolen && stolenPhase === "empty" && !reopenHall;
  const hintTour = (isShelter || isSaved) && showUi && !reopenHall;
  const hintPassport = reopenHall && showUi;

  // Figma 05: ring ON the frame's top-right after scale (design rect × px).
  // Label above the ring, right-aligned, max-width 140px — never overlaps ring.
  // Melitopol: ring on glass top-right; label INSIDE glass under top edge, left of ring.
  const markerPos = (() => {
    const box = hallFocusSlot.frameRect;
    const inset = emptyInset;
    const glass = {
      x: box.x + box.w * inset.left,
      y: box.y + box.h * inset.top,
      w: box.w * (1 - inset.left - inset.right),
      h: box.h * (1 - inset.top - inset.bottom),
    };
    let cx: number;
    let cy: number;
    let frameTop: number;
    if (museumId === "melitopol") {
      cx = glass.x + edgePadDes + glass.w - 8;
      cy = glass.y + 14;
      frameTop = glass.y;
    } else {
      const measured = focusFrameDes;
      const rawR = measured && measured.w > 8 ? measured : box;
      const r = {
        x: Math.max(box.x, Math.min(rawR.x, box.x + box.w * 0.15)),
        y: Math.max(box.y, Math.min(rawR.y, box.y + box.h * 0.15)),
        w: Math.min(rawR.w, box.w),
        h: Math.min(rawR.h, box.h),
      };
      cx = Math.min(r.x + r.w - 22, box.x + box.w - 26) + edgePadDes;
      cy = Math.max(r.y + 12, box.y + 12);
      frameTop = Math.max(r.y, box.y);
    }
    const half = 28.5;
    const gap = 8;
    let hintW = 140;
    const hintH = hintPassport || hintTour ? 40 : 22;
    const margin = 12 / px;
    const scrollDes = scrollLeftPx / px;
    const visL = scrollDes;
    const visR = scrollDes + viewW / px;
    const visT = 0;
    let hintLeft: number;
    let hintTop: number;
    if (museumId === "melitopol") {
      // Ring on glass top-right; hint INSIDE glass under top edge, left of ring.
      // Empty-state copy is hidden while this hint is visible (see empty label).
      const badgeBottom = (layout.captions.badgeY ?? 208) + 28;
      hintW = 130;
      // cx already includes edgePadDes
      hintLeft = cx - half - gap - hintW;
      hintTop = Math.max(frameTop + 12, badgeBottom + 16);
      // Keep under the glass top edge, never on the badge row.
      if (hintTop < badgeBottom + 16) {
        hintTop = badgeBottom + 16;
      }
      if (hintTop + hintH > glass.y + glass.h * 0.35) {
        hintTop = Math.max(badgeBottom + 16, glass.y + 10);
      }
    } else {
      // Above the ring, right-aligned; never overlap the ring.
      hintLeft = cx - hintW;
      hintTop = cy - half - gap - hintH;
      if (hintTop + hintH > cy - half - 2) {
        hintTop = cy - half - gap - hintH;
      }
    }
    hintLeft = Math.min(
      Math.max(hintLeft, visL + margin),
      visR - margin - hintW,
    );
    hintTop = Math.max(hintTop, visT + margin);
    return { cx, cy, hintLeft, hintTop, hintW, hintH };
  })();
  const markerCx = markerPos.cx;
  const markerCy = markerPos.cy;

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
          {/* Full-viewport wall bleed — covers letterbox / short-phone gaps. */}
          {layout?.wallSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={layout.wallSrc}
              alt=""
              className="pointer-events-none absolute inset-0 z-0 size-full select-none object-cover object-center"
              draggable={false}
            />
          ) : null}
          <div
            ref={scrollerRef}
            className="absolute inset-0 z-[1] cursor-grab overflow-x-auto overflow-y-hidden snap-x snap-mandatory select-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ userSelect: "none", WebkitUserSelect: "none" }}
          >
            <div
              className="relative"
              style={{
                width: hallWidthPx,
                height: viewH,
              }}
            >
              <div
                ref={hallStageInnerRef}
                className="absolute left-0 right-0"
                style={{
                  top: stageOffsetY,
                  height: stageH,
                  width: hallWidthPx,
                }}
              >
              {/* 1. Wall — covers the full cover-scaled stage. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={layout.wallSrc}
                alt=""
                className="pointer-events-none absolute inset-0 z-0 size-full max-w-none select-none object-cover object-center"
                draggable={false}
              />

              {/* 2. ALL frames under darkness (unopened stay here) */}
              {slots.map((slot) => {
                const art = getArtwork(slot.artworkId);
                const isPathFocus = slot.artworkId === hallActiveId;
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
                // Blur stolen interiors with no hidden plate (Melitopol glass /
                // neighbors). Path-focus Melitopol stays blurred under darkness
                // before the lamp layer paints.
                const needsBlurCover =
                  !isOpenedFrame &&
                  !slot.hiddenSrc &&
                  art?.status === "stolen";
                return (
                  <motion.div
                    key={`base-${slot.artworkId}`}
                    data-hall-idx={slot.artworkId}
                    className="absolute z-[1] snap-center"
                    style={{
                      left: (r.x + edgePadDes) * px,
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

              {/* 3. Darkness (stage covers viewport via cover scale) */}
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
                          s.artworkId === hallActiveId),
                    )
                    .map((slot) => {
                      const isActive = slot.artworkId === hallActiveId;
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
                        slot.lampX +
                        edgePadDes +
                        layout.lamp.w / 2 -
                        layout.cone.w / 2;
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
                              left: (slot.frameRect.x + edgePadDes) * px,
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
                                {/* Opaque scrim so sharp chrome under the glass can't bleed through blur */}
                                <motion.div
                                  className="absolute inset-0 bg-black"
                                  initial={false}
                                  animate={{
                                    opacity:
                                      stolenPhase === "empty" ? 0.72 : 0,
                                  }}
                                  transition={{
                                    duration: revealDuration,
                                    ease: easings.easeInOut,
                                  }}
                                />
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
                                    scale:
                                      stolenPhase === "empty" &&
                                      slot.artworkId === 3
                                        ? 1.06
                                        : 1,
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
                              stolenPhase === "empty" &&
                              // Melitopol: hint replaces this copy so they never overlap.
                              !(museumId === "melitopol" && hintStolen) ? (
                                (() => {
                                  // Narrow openings (Капуцин, Дама): keep copy inside the opening.
                                  const openW =
                                    slot.frameRect.w *
                                    (1 - inset.left - inset.right);
                                  const narrow =
                                    slot.artworkId === 5 ||
                                    slot.artworkId === 7 ||
                                    openW < 140;
                                  // While captions are up, hide empty copy on narrow frames
                                  // so it never overlaps title/author/badge.
                                  if (narrow && showUi) return null;
                                  const fontPx = narrow
                                    ? Math.max(10, Math.min(12, openW * 0.09))
                                    : Math.max(
                                        11,
                                        Math.min(14, openW * 0.085),
                                      );
                                  return (
                                    <motion.div
                                      key="empty-label"
                                      className="absolute flex items-center justify-center text-center"
                                      style={{
                                        ...emptyInsetCss,
                                        padding: narrow ? 6 : 8,
                                      }}
                                      initial={false}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                      transition={{
                                        duration: revealDuration,
                                        ease: easings.easeInOut,
                                      }}
                                    >
                                      <p
                                        className="max-w-full text-text-secondary"
                                        style={{
                                          fontSize: fontPx,
                                          lineHeight: 1.25,
                                          display: "-webkit-box",
                                          WebkitLineClamp: 3,
                                          WebkitBoxOrient: "vertical",
                                          overflow: "hidden",
                                          textShadow:
                                            "0 1px 6px rgba(0,0,0,0.85)",
                                        }}
                                      >
                                        Цього твору зараз немає в Україні
                                      </p>
                                    </motion.div>
                                  );
                                })()
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
                        const isActive = slot.artworkId === hallActiveId;
                        const targetOpacity = isActive ? 1 : 0.85;
                        return (
                          <motion.div
                            key={`lamp-${slot.artworkId}`}
                            className="pointer-events-none absolute z-[8]"
                            style={{
                              left: (slot.lampX + edgePadDes) * px,
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

              {/* 5. Captions — every opened frame + active; scroll with frames */}
              <AnimatePresence>
                {showUi
                  ? slots
                      .filter(
                        (s) =>
                          s.artworkId === hallActiveId ||
                          openedIds.has(s.artworkId),
                      )
                      .map((slot) => {
                        const art = getArtwork(slot.artworkId);
                        if (!art) return null;
                        const isActiveCap = slot.artworkId === hallActiveId;
                        return (
                          <motion.div
                            key={`cap-${slot.artworkId}`}
                            data-hall-caption={slot.artworkId}
                            className="pointer-events-none absolute z-[9] flex max-w-[226px] flex-col items-center text-center"
                            style={{
                              left:
                                (slot.frameRect.x +
                                  edgePadDes +
                                  slot.frameRect.w / 2) *
                                px,
                              top: layout.captions.titleY * px,
                              width: 226 * px,
                              opacity: 1,
                            }}
                            initial={{ opacity: 0, x: "-50%", y: 6 }}
                            animate={{
                              opacity: 1,
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
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                              title={displayAuthorMeta(art)}
                            >
                              {displayAuthorMeta(art)}
                            </p>
                            {!(
                              museumId === "melitopol" &&
                              isActiveCap &&
                              hintPassport
                            ) ? (
                              <div
                                className="flex w-full flex-wrap items-center justify-center gap-sm"
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
                            ) : null}
                          </motion.div>
                        );
                      })
                  : null}
              </AnimatePresence>

              <AnimatePresence>
                {showUi &&
                neighborId == null &&
                (hintStolen || hintTour || hintPassport) ? (
                  <>
                    <motion.p
                      className="pointer-events-none absolute z-[10] text-right text-label-md leading-snug text-text-primary"
                      style={{
                        left: markerPos.hintLeft * px,
                        top: markerPos.hintTop * px,
                        width: markerPos.hintW * px,
                        maxWidth: 140 * px,
                        whiteSpace: "normal",
                        overflow: "visible",
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {hintStolen ? (
                        <>Торкнись, щоб згадати</>
                      ) : hintPassport ? (
                        <>
                          Торкнись, щоб
                          <br />
                          почати тур
                        </>
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
        previewSrc={focus.wallpaper ?? focus.image}
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

      {routeFlight != null ? (
        <div className="absolute inset-0 z-[60]">
          <JourneyFlow pathN={routeFlight} autostart fromRouteMap />
        </div>
      ) : null}
    </div>
  );
}
