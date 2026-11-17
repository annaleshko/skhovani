"use client";

import { AboutSheet } from "@/components/about/AboutSheet";
import { TourStage } from "@/components/tour/TourStage";
import { WallpaperScreen } from "@/components/wallpaper/WallpaperScreen";
import {
  getArtwork,
  getArtworksByMuseum,
  getMuseum,
} from "@/data";
import { getHallAssets } from "@/data/halls";
import type { Artwork } from "@/data/types";
import {
  easings,
  motionTokens,
  useReducedMotionSafe,
} from "@/lib/motion";
import { useAppState } from "@/state/AppState";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CoveredSheet } from "./CoveredSheet";
import { HallFrameCard } from "./HallFrameCard";

type Phase = "hall" | "tour" | "about" | "wallpaper" | "ask-guide";

type Props = {
  museumId: string;
  pathN: number | null;
  artworkId: number;
};

/**
 * Full journey after the door: hall → tour → about → wallpapers / finish.
 * One absolute full-screen stage; phases swap overlays without layout jumps.
 */
export function HallExperience({ museumId, pathN, artworkId }: Props) {
  const router = useRouter();
  const reduced = useReducedMotionSafe();
  const { markPathComplete, markTourSeen } = useAppState();
  const museum = getMuseum(museumId);
  const hall = getHallAssets(museumId);
  const artworks = useMemo(() => {
    const list = getArtworksByMuseum(museumId);
    // Prefer museum.artworkIds order
    if (museum) {
      return museum.artworkIds
        .map((id) => getArtwork(id))
        .filter((a): a is Artwork => Boolean(a));
    }
    return list;
  }, [museum, museumId]);

  const focus = getArtwork(artworkId) ?? artworks[0];
  const focusIndex = Math.max(
    0,
    artworks.findIndex((a) => a.id === focus?.id),
  );

  const [phase, setPhase] = useState<Phase>("hall");
  const [lights, setLights] = useState<number>(() =>
    // reduced: all lit immediately
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 99
      : -1,
  );
  const [hint, setHint] = useState(false);
  const [covered, setCovered] = useState<Artwork | null>(null);
  const [shakeId, setShakeId] = useState<number | null>(null);
  const [tourKey, setTourKey] = useState(0);
  const [startExplore, setStartExplore] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Enter: spotlights one by one, focus last (timers only — no sync setState)
  useEffect(() => {
    if (phase !== "hall" || reduced) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const order = artworks.map((_, i) => i).filter((i) => i !== focusIndex);
    order.push(focusIndex);
    order.forEach((_idx, step) => {
      timers.push(
        setTimeout(
          () => setLights(step + 1),
          step * motionTokens.spotlight.step * 1000,
        ),
      );
    });
    timers.push(
      setTimeout(
        () => setHint(true),
        order.length * motionTokens.spotlight.step * 1000 +
          motionTokens.spotlight.duration * 1000,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [artworks, focusIndex, phase, reduced]);

  useEffect(() => {
    if (reduced) {
      const t = setTimeout(() => setHint(true), 0);
      return () => clearTimeout(t);
    }
  }, [reduced]);

  // Snap to focus artwork
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || phase !== "hall") return;
    const card = el.querySelector<HTMLElement>(`[data-hall-idx="${focusIndex}"]`);
    if (card) {
      const left = card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2;
      el.scrollTo({ left, behavior: reduced ? "auto" : "smooth" });
    }
  }, [focusIndex, phase, reduced]);

  const litCount = lights;
  const isLit = (i: number) => {
    if (litCount < 0) return false;
    if (litCount >= artworks.length) return true;
    // Light frames in order: non-focus first, focus last
    const order = artworks.map((_, idx) => idx).filter((idx) => idx !== focusIndex);
    order.push(focusIndex);
    return new Set(order.slice(0, litCount)).has(i);
  };

  const onFrameTap = (a: Artwork) => {
    if (a.id === focus?.id) {
      setStartExplore(false);
      setTourKey((k) => k + 1);
      setPhase("tour");
      return;
    }
    setShakeId(a.id);
    setTimeout(() => setShakeId(null), motionTokens.frameShake * 1000);
    setCovered(a);
  };

  const onTourDone = useCallback(() => {
    if (focus) markTourSeen(focus.id);
    setPhase("about");
  }, [focus, markTourSeen]);

  const finishPath = () => {
    if (pathN != null && focus) {
      markPathComplete(pathN, focus.id);
    }
    router.push(
      `/finish?path=${pathN ?? ""}&artwork=${focus?.id ?? ""}&museum=${museumId}`,
    );
  };

  if (!focus || !museum) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-screen px-xl text-body-md text-text-secondary">
        Залу не знайдено
      </div>
    );
  }

  const showHall = phase === "hall" || covered != null;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-screen text-text-primary">
      {/* Hall stage — always absolute full-screen while in hall */}
      {showHall ? (
        <div className="absolute inset-0 z-0">
          <Image
            src={hall.panorama}
            alt=""
            fill
            priority
            className="object-cover opacity-90"
            sizes="(max-width: 430px) 100vw, 430px"
          />
          <div className="absolute inset-0 bg-black/55" />

          {/* Projector cone over focus */}
          <motion.div
            className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: hint || litCount > 0 ? 0.85 : 0 }}
            transition={{ duration: motionTokens.spotlight.duration, ease: easings.easeOut }}
          >
            <Image
              src={hall.lightCone}
              alt=""
              width={360}
              height={700}
              className="h-[70dvh] w-auto opacity-80"
            />
          </motion.div>

          <div
            ref={scrollerRef}
            className="absolute inset-x-0 top-[28%] flex snap-x snap-mandatory gap-xl overflow-x-auto px-[79px] pb-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {artworks.map((a, i) => (
              <div key={a.id} data-hall-idx={i} className="snap-center">
                <HallFrameCard
                  artwork={a}
                  open={a.id === focus.id}
                  lit={isLit(i)}
                  shaking={shakeId === a.id}
                  frameSrc={hall.frame}
                  onTap={() => onFrameTap(a)}
                />
              </div>
            ))}
          </div>

          <AnimatePresence>
            {hint && phase === "hall" ? (
              <motion.p
                className="pointer-events-none absolute left-1/2 top-[26%] z-10 w-40 -translate-x-1/2 text-center text-label-md text-text-primary"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                Торкнись картини,
                <br />
                щоб почати тур
              </motion.p>
            ) : null}
          </AnimatePresence>
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
          startExplore={startExplore || phase === "about" || phase === "wallpaper"}
        />
      )}

      <AboutSheet
        artwork={focus}
        open={phase === "about"}
        showFinish={pathN != null}
        onWallpaper={() => setPhase("wallpaper")}
        onAskGuide={() => {
          // TODO(chat): Stage 7 guide sheet
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
