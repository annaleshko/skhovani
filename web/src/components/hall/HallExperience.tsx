"use client";

import { AboutSheet } from "@/components/about/AboutSheet";
import { RouteMapScreen } from "@/components/journey/RouteMapScreen";
import { WallpaperSavedScreen } from "@/components/journey/WallpaperSavedScreen";
import { StatusBadge } from "@/components/ui";
import { TourStage } from "@/components/tour/TourStage";
import { WallpaperScreen } from "@/components/wallpaper/WallpaperScreen";
import { getArtwork, getMuseum } from "@/data";
import { getHallLayout, type HallSlot } from "@/data/hall-layouts";
import { getHallAssets } from "@/data/halls";
import {
  getNextPath,
  shouldSkipMapToHall,
} from "@/data/journey";
import type { Artwork } from "@/data/types";
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
import { CoveredSheet } from "./CoveredSheet";

type Phase =
  | "hall"
  | "tour"
  | "about"
  | "wallpaper"
  | "wallpaper-saved"
  | "route"
  | "ask-guide";

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

/**
 * Hall 12 — wall → frames → darkness 70% → opened + lamp + cone → captions.
 * Refs: docs/figma-refs/12-hall.png (Figma 92:4217), Kherson wall 156:15129.
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
  /** Reduced motion always shows the settled hall; ignore in-progress steps. */
  const intro: Intro = reduced ? "done" : introStep;
  const [covered, setCovered] = useState<Artwork | null>(null);
  const [shakeId, setShakeId] = useState<number | null>(null);
  const [tourKey, setTourKey] = useState(0);
  const [startExplore, setStartExplore] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [viewH, setViewH] = useState(844);
  const didScroll = useRef(false);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setViewH(el.clientHeight || 844);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const designH = layout?.designHeight ?? 844;
  const designW = layout?.designWidth ?? 390;
  const px = viewH / designH;
  const hallWidthPx = designW * px;

  // Center on path artwork (retry until scroller has width)
  useEffect(() => {
    if (phase !== "hall" || !slots[focusSlotIndex]) return;
    const el = scrollerRef.current;
    if (!el) return;
    const slot = slots[focusSlotIndex]!;
    const center = () => {
      const centerX = (slot.frameRect.x + slot.frameRect.w / 2) * px;
      const left = Math.max(0, centerX - el.clientWidth / 2);
      el.scrollTo({
        left,
        behavior: didScroll.current || reduced ? "auto" : "smooth",
      });
      didScroll.current = true;
    };
    center();
    const t = window.setTimeout(center, 50);
    return () => window.clearTimeout(t);
  }, [focusSlotIndex, phase, reduced, slots, px]);

  // Entry: darkness 100%→70% (400) → lamp flicker (300) → cone (500) → bright → UI
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

  const showUi = intro === "ui" || intro === "done";
  const showCone = intro === "cone" || intro === "bright" || showUi;
  const showLamp = intro !== "black";
  const paintingBright = intro === "bright" || showUi;
  /** Settled darkness is always 70% — alpha in the color, element opacity stays 1. */
  const darknessAlpha = intro === "black" ? 1 : 0.7;

  const onFrameTap = (slot: HallSlot) => {
    const art = getArtwork(slot.artworkId);
    if (!art) return;
    if (art.id === focus?.id) {
      setStartExplore(false);
      setTourKey((k) => k + 1);
      setPhase("tour");
      return;
    }
    setShakeId(art.id);
    window.setTimeout(() => setShakeId(null), motionTokens.frameShake * 1000);
    setCovered(art);
  };

  const onTourDone = useCallback(() => {
    if (focus) markTourSeen(focus.id);
    setPhase("about");
  }, [focus, markTourSeen]);

  const completeCurrentPath = useCallback(() => {
    if (pathN != null && focus) markPathComplete(pathN, focus.id);
  }, [focus, markPathComplete, pathN]);

  /** Passport × or after wallpaper-saved → 02в route map. */
  const goToRouteMap = useCallback(() => {
    completeCurrentPath();
    setPhase("route");
  }, [completeCurrentPath]);

  const departNext = useCallback(() => {
    if (!nextPath) {
      router.replace("/");
      return;
    }
    if (nextSameMuseum) {
      router.replace(
        `/hall/${nextPath.museumId}?path=${nextPath.n}&artwork=${nextPath.artworkId}`,
      );
      return;
    }
    router.replace(`/journey?path=${nextPath.n}`);
  }, [nextPath, nextSameMuseum, router]);

  if (!focus || !museum || !layout) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-screen px-xl text-body-md text-text-secondary">
        Залу не знайдено
      </div>
    );
  }

  const showHall = phase === "hall" || covered != null;
  const focusSlot = slots[focusSlotIndex]!;
  const lampX = focusSlot.lampX;
  /** Figma 92:4276 — 353×745 at y 99, centered on lamp (not scaled to the frame). */
  const coneX = lampX + layout.lamp.w / 2 - layout.cone.w / 2;
  const coneTop = layout.cone.y;
  /** Figma 93:4551 — ring center is 26.5 left / 11.5 below the frame's top-right. */
  const markerCx =
    focusSlot.frameRect.x + focusSlot.frameRect.w - 26.5;
  const markerCy = focusSlot.frameRect.y + 11.5;

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

              {/* 2. ALL artworks under darkness (normal PNG; hidden art for covered) */}
              {slots.map((slot) => {
                const art = getArtwork(slot.artworkId);
                const open = slot.artworkId === focus.id;
                const r = slot.frameRect;
                const src =
                  !open && slot.hiddenSrc ? slot.hiddenSrc : slot.frameSrc;
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

              {/* 3. Darkness over the whole wall — ends at rgba(0,0,0,0.7), never opaque */}
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

              {/* 4. Cone (above darkness, below opened frame) + opened art + lamp */}
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
                      ? { opacity: 0.9 }
                      : intro === "done" || intro === "ui"
                        ? { opacity: [0.85, 1, 0.85] }
                        : { opacity: 0.9 }
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
                    /* Figma 92:4276 «projector» is authored wide-top; on screen it's rotated 180°. */
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
                  transition={{ duration: reduced ? 0 : 0.35, ease: easings.easeOut }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={focusSlot.frameSrc}
                    alt=""
                    className="size-full object-contain drop-shadow-[1px_8px_12px_rgba(0,0,0,0.25)]"
                    draggable={false}
                  />
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

              {/* 5. Captions under every frame (above darkness) + hint on opened.
                  Framer Motion owns `transform`, so centering uses x:"-50%" (not Tailwind -translate-x-1/2). */}
              <AnimatePresence>
                {showUi
                  ? slots.map((slot) => {
                      const art = getArtwork(slot.artworkId);
                      if (!art) return null;
                      const open = slot.artworkId === focus.id;
                      const cx =
                        (slot.frameRect.x + slot.frameRect.w / 2) * px;
                      // Covered titles sit under darkness so they don't spoil 12б.
                      const z = open ? 9 : 4;
                      return (
                        <motion.div
                          key={`cap-${slot.artworkId}`}
                          data-hall-caption={slot.artworkId}
                          className="pointer-events-none absolute flex max-w-[226px] flex-col items-center text-center"
                          style={{
                            left: cx,
                            top: layout.captions.titleY * px,
                            width: 226 * px,
                            zIndex: z,
                          }}
                          initial={{ opacity: 0, x: "-50%", y: 6 }}
                          animate={{ opacity: 1, x: "-50%", y: 0 }}
                          exit={{ opacity: 0, x: "-50%" }}
                        >
                          <p className="w-full text-h3 text-text-primary">
                            {art.title}
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
                            {art.author} · {shortYear(art.year)}
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

              <AnimatePresence>
                {showUi ? (
                  <>
                    {/* Hint: right-aligned above the ring (Figma 125:6469) */}
                    <motion.p
                      className="pointer-events-none absolute z-[10] text-right text-label-md leading-4 text-text-primary"
                      style={{
                        left: markerCx * px,
                        top: (markerCy - 11.5 - 55) * px,
                        width: 145 * px,
                      }}
                      initial={{ opacity: 0, x: "-50%" }}
                      animate={{ opacity: 1, x: "-50%" }}
                    >
                      Торкнись картини,
                      <br />
                      щоб почати тур
                    </motion.p>
                    {/* Ring: Figma 93:4551 center = frame TR + (−26.5, +11.5) */}
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

      <CoveredSheet
        open={Boolean(covered)}
        city={museum.city}
        year={covered?.year ?? ""}
        onClose={() => setCovered(null)}
      />

      {(phase === "tour" || phase === "about" || phase === "wallpaper") && (
        <TourStage
          key={tourKey}
          artwork={focus}
          onTourDone={onTourDone}
          startExplore={
            startExplore || phase === "about" || phase === "wallpaper"
          }
        />
      )}

      <AboutSheet
        artwork={focus}
        open={phase === "about"}
        showFinish={pathN != null}
        onClose={goToRouteMap}
        onWallpaper={() => setPhase("wallpaper")}
        onAskGuide={() => {
          setPhase("ask-guide");
          setTimeout(() => setPhase("about"), 100);
        }}
        onReplayTour={() => {
          setStartExplore(false);
          setTourKey((k) => k + 1);
          setPhase("tour");
        }}
        onFinishPath={goToRouteMap}
      />

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
        onContinue={() => setPhase("route")}
      />

      <RouteMapScreen
        open={phase === "route"}
        next={nextPath ?? null}
        onDepart={departNext}
      />
    </div>
  );
}
