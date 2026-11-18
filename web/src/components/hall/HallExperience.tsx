"use client";

import { AboutSheet } from "@/components/about/AboutSheet";
import { StatusBadge } from "@/components/ui";
import { TourStage } from "@/components/tour/TourStage";
import { WallpaperScreen } from "@/components/wallpaper/WallpaperScreen";
import { getArtwork, getMuseum } from "@/data";
import { getHallLayout, type HallSlot } from "@/data/hall-layouts";
import { getHallAssets } from "@/data/halls";
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

type Phase = "hall" | "tour" | "about" | "wallpaper" | "ask-guide";

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
 * Hall 12 — dark wall + composed frame groups; one lamp/cone on the opened work.
 * Ref: docs/figma-refs/12-hall.png (Figma 92:4217).
 */
export function HallExperience({ museumId, pathN, artworkId }: Props) {
  const router = useRouter();
  const reduced = useReducedMotionSafe();
  const { markPathComplete, markTourSeen } = useAppState();
  const museum = getMuseum(museumId);
  const hallUi = getHallAssets(museumId);
  const layout = getHallLayout(museumId);

  const slots = useMemo(() => layout?.slots ?? [], [layout]);
  const focusSlotIndex = Math.max(
    0,
    slots.findIndex((s) => s.artworkId === artworkId),
  );
  const focus = getArtwork(artworkId) ?? getArtwork(slots[0]?.artworkId ?? -1);

  const [phase, setPhase] = useState<Phase>("hall");
  type Intro = "black" | "lamp" | "cone" | "bright" | "ui" | "done";
  const [intro, setIntro] = useState<Intro>(reduced ? "done" : "black");
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
      el.scrollTo({ left, behavior: didScroll.current || reduced ? "auto" : "smooth" });
      didScroll.current = true;
    };
    center();
    const t = window.setTimeout(center, 50);
    return () => clearTimeout(t);
  }, [focusSlotIndex, phase, reduced, slots, px]);

  // Entry animation: black → lamp flicker → cone → brighten → UI (timers only)
  useEffect(() => {
    if (phase !== "hall") return;
    if (reduced) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setIntro("lamp"), 400));
    timers.push(setTimeout(() => setIntro("cone"), 400 + 300));
    timers.push(setTimeout(() => setIntro("bright"), 400 + 300 + 500));
    timers.push(setTimeout(() => setIntro("ui"), 400 + 300 + 500 + 200));
    timers.push(setTimeout(() => setIntro("done"), 400 + 300 + 500 + 400));
    return () => timers.forEach(clearTimeout);
  }, [phase, reduced, artworkId]);

  const showUi = intro === "ui" || intro === "done";
  const showCone = intro === "cone" || intro === "bright" || showUi;
  const showLamp = intro !== "black";
  const paintingBright = intro === "bright" || showUi;

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

  const finishPath = () => {
    if (pathN != null && focus) markPathComplete(pathN, focus.id);
    router.push(
      `/finish?path=${pathN ?? ""}&artwork=${focus?.id ?? ""}&museum=${museumId}`,
    );
  };

  if (!focus || !museum || !layout) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-screen px-xl text-body-md text-text-secondary">
        Залу не знайдено
      </div>
    );
  }

  const showHall = phase === "hall" || covered != null;
  const focusSlot = slots[focusSlotIndex]!;
  const lampX =
    focusSlot.frameRect.x + focusSlot.frameRect.w / 2 - layout.lamp.w / 2;
  const coneX =
    focusSlot.frameRect.x + focusSlot.frameRect.w / 2 - layout.cone.w / 2;

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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={layout.wallSrc}
                alt=""
                className="pointer-events-none absolute left-0 top-0 h-dvh w-auto max-w-none select-none"
                draggable={false}
              />

              {/* Frame groups */}
              {slots.map((slot) => {
                const art = getArtwork(slot.artworkId);
                const open = slot.artworkId === focus.id;
                const r = slot.frameRect;
                const p = slot.paintingRect;
                return (
                  <motion.div
                    key={slot.artworkId}
                    data-hall-idx={slot.artworkId}
                    className="absolute snap-center"
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
                      src={slot.frameSrc}
                      alt=""
                      className="pointer-events-none absolute inset-0 size-full object-contain drop-shadow-[1px_8px_12px_rgba(0,0,0,0.25)]"
                      style={{
                        filter:
                          open && paintingBright
                            ? "brightness(1.15) contrast(1.06)"
                            : open
                              ? "brightness(0.6)"
                              : "brightness(0.32)",
                      }}
                      draggable={false}
                    />
                    {/* Covered: solid dark over painting rect only (frame stays) */}
                    {!open ? (
                      <div
                        className="pointer-events-none absolute bg-hall-dark"
                        style={{
                          left: (p.x - r.x) * px,
                          top: (p.y - r.y) * px,
                          width: p.w * px,
                          height: p.h * px,
                          opacity: 0.94,
                        }}
                      />
                    ) : null}
                    <button
                      type="button"
                      aria-label={
                        art ? `${art.title}, ${art.author}` : `Твір ${slot.artworkId}`
                      }
                      className="absolute inset-0 z-[1] min-h-[44px] min-w-[44px] cursor-pointer bg-transparent"
                      onClick={() => onFrameTap(slot)}
                    />
                  </motion.div>
                );
              })}

              {/* Single lamp + cone for opened artwork */}
              <AnimatePresence>
                {showLamp ? (
                  <motion.div
                    key="lamp"
                    className="pointer-events-none absolute z-[2]"
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

              {showCone ? (
                <motion.div
                  className="pointer-events-none absolute z-[1]"
                  style={{
                    left: coneX * px,
                    top: (layout.lamp.y + layout.lamp.h * 0.4) * px,
                    width: layout.cone.w * px,
                    height: Math.min(layout.cone.h, designH - layout.lamp.y) * px,
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
                    className="size-full object-contain mix-blend-screen"
                    draggable={false}
                  />
                </motion.div>
              ) : null}

              {/* Title + meta + badge under opened frame */}
              <AnimatePresence>
                {showUi ? (
                  <motion.div
                    className="pointer-events-none absolute z-[3] flex w-[226px] -translate-x-1/2 flex-col items-center gap-2xs text-center"
                    style={{
                      left:
                        (focusSlot.frameRect.x + focusSlot.frameRect.w / 2) * px,
                      top: (focusSlot.frameRect.y + focusSlot.frameRect.h + 20) * px,
                    }}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <p className="text-h3 text-text-primary">{focus.title}</p>
                    <p className="text-body-md text-text-caption">
                      {focus.author} · {shortYear(focus.year)}
                    </p>
                    <StatusBadge status={focus.status} className="mt-2xs" />
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Hint + gold marker */}
              <AnimatePresence>
                {showUi ? (
                  <>
                    <motion.p
                      className="pointer-events-none absolute z-[4] w-[145px] -translate-x-1/2 text-center text-label-md leading-4 text-text-primary"
                      style={{
                        left:
                          (focusSlot.frameRect.x + focusSlot.frameRect.w * 0.92) *
                          px,
                        top: (focusSlot.frameRect.y - 55) * px,
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      Торкнись картини,
                      <br />
                      щоб почати тур
                    </motion.p>
                    <motion.div
                      className="pointer-events-none absolute z-[4] size-[57px] -translate-x-1/2"
                      style={{
                        left:
                          (focusSlot.frameRect.x + focusSlot.frameRect.w) * px,
                        top: (focusSlot.frameRect.y - 17) * px,
                      }}
                      animate={
                        reduced
                          ? { opacity: 1, scale: 1 }
                          : { opacity: [0.85, 1, 0.85], scale: [1, 1.08, 1] }
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

              {/* Entry black veil */}
              <motion.div
                className="pointer-events-none absolute inset-0 z-[5] bg-hall-dark"
                initial={false}
                animate={{ opacity: intro === "black" && !reduced ? 1 : 0 }}
                transition={{ duration: 0.4, ease: easings.easeOut }}
              />
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
        onFinishPath={finishPath}
      />

      <WallpaperScreen
        artwork={focus}
        open={phase === "wallpaper"}
        onClose={() => setPhase("about")}
      />
    </div>
  );
}
