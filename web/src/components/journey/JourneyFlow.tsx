"use client";

import { Button } from "@/components/ui";
import { DottedRoute } from "@/components/map/DottedRoute";
import { MapPin } from "@/components/map/MapPin";
import { MapStar } from "@/components/map/MapStar";
import { MuseumDot } from "@/components/map/MuseumDot";
import { getMuseum, getMuseums } from "@/data";
import {
  cityGenitiveForMuseum,
  JOURNEY_MUSEUM_ORDER,
  museumFacadeBlurb,
  pathSheetBlurb,
} from "@/data/museum-copy";
import {
  FACADE_ASPECT,
  getMuseumDisplayName,
  getMuseumShortLabel,
  getMuseumUi,
  type MuseumUi,
} from "@/data/museums";
import {
  getPath,
  getPathOrigin,
  getVisitedMuseumOrder,
  shouldSkipMapToHall,
  type ResolvedPath,
} from "@/data/journey";
import {
  camera07,
  cameraPlaceAt,
  cameraProjectPoint,
  FRAME,
  MAP_07,
  ZOOM_FOCUS,
  ZOOM_SCALE,
  type CameraTransform,
} from "@/lib/camera";
import {
  arcControl,
  getMapViewBox,
  haversineKm,
  pointOnQuad,
  projectToMap,
  type MapPoint,
} from "@/lib/geo";
import { layoutMapLabels, mapLabelSide } from "@/lib/map-label";
import {
  easings,
  motionTokens,
  useReducedMotionSafe,
} from "@/lib/motion";
import { useAppState } from "@/state/AppState";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
} from "framer-motion";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MapLandArt } from "@/components/map/MapLandArt";
import { RestartJourneyLink } from "./RestartJourneyLink";
import { RouteTrail, type TrailItem } from "./RouteTrail";
import { pickPath } from "./pickPath";

type Phase =
  | "boot"
  // MVP v2: disabled — onboarding / «Привіт, Анно»
  // | "e1"
  | "map"
  | "flight"
  | "zoom"
  | "occupation"
  | "facade"
  | "entering";

type Props = {
  pathN?: number;
  /** From 02в «Вирушити» — skip screen-02 sheet and start flight. */
  autostart?: boolean;
  /** Star museum revisit — fast flight + auto facade → hall. */
  revisit?: boolean;
  /** Hall shows last opened artwork already revealed. */
  reopenHall?: boolean;
  /** Free hall exploration (museum tap on 02в only). */
  exploreHall?: boolean;
  /**
   * From 02в «Вирушить» — skip path-1 sheet; flight still uses cam07 → cam09
   * (02в map is framed with the same 07 camera so there is no jump).
   */
  fromRouteMap?: boolean;
};

const PICK_DELAY_MS = 0;
const FACADE_AUTO_MS = 250;
/** Revisit: full name sheet visible ≥1.2s after fade-in, then auto-enter. */
const REVISIT_FACADE_MS = 1200;
const REVISIT_FLIGHT_SEC = 1.2;
const OCCUPATION_HOLD_MS = 1600;
const TRAIL_LEN = 18;
/** Spec 07 entry timeline (ms from enterMap start) */
const ENTRY_FADE_MS = motionTokens.mapFadeIn * 1000; // 600
const ENTRY_PIN_MS = 400;
const ENTRY_ARC_MS = motionTokens.dottedDraw * 1000; // 800
const ENTRY_TARGET_MS = 300;
const ENTRY_T_PIN = ENTRY_FADE_MS;
const ENTRY_T_ARC = ENTRY_T_PIN + ENTRY_PIN_MS;
const ENTRY_T_TARGET = ENTRY_T_ARC + ENTRY_ARC_MS;
const ENTRY_T_SHEET = ENTRY_T_TARGET + ENTRY_TARGET_MS; // ≈ 2500 → sheet slide 300 ≈ 2.8s
const GLOW_R_07 = 100; // Ø 200
const GLOW_R_09 = 160; // Ø 320
const vb = getMapViewBox();

type FacadeImgLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
  originX: number;
  originY: number;
};

/**
 * Width-fit facade (no object-fit crop), ground 12px above the sheet.
 * Scales down only when the building would collide with the trail.
 */
function computeFacadeImgLayout(
  rootW: number,
  sheetTop: number,
  trailBottom: number,
  ui: MuseumUi,
): FacadeImgLayout {
  const maxW = Math.max(1, rootW);
  const maxH = maxW * FACADE_ASPECT;
  const bandTop = trailBottom + 16;
  const bandBottom = sheetTop - 12;
  const available = Math.max(48, bandBottom - bandTop);
  const buildingFrac = Math.max(0.05, ui.facadeGround - ui.facadeTop);
  const scale = Math.min(1, available / (buildingFrac * maxH));
  const width = maxW * scale;
  const height = maxH * scale;
  const left = (maxW - width) / 2;
  let top = bandBottom - ui.facadeGround * height;
  const buildingTop = top + ui.facadeTop * height;
  if (buildingTop < bandTop) {
    top = bandTop - ui.facadeTop * height;
  }
  return {
    left,
    top,
    width,
    height,
    originX: left + (ui.doorX / 100) * width,
    originY: top + (ui.doorY / 100) * height,
  };
}

/**
 * Design-space 07 camera → stage pixels.
 * Width drives scale (1 viewBox unit tracks CSS px × sx). Keep for 07 only —
 * do NOT use this to adapt a cameraPlaceAt() result (breaks when sx ≠ sy).
 */
function toStageCam07(
  cam: CameraTransform,
  stageW: number,
  stageH: number,
): CameraTransform {
  const sx = stageW / FRAME.w;
  const sy = stageH / FRAME.h;
  return { tx: cam.tx * sx, ty: cam.ty * sy, scale: cam.scale * sx };
}

/**
 * Screen 9 camera — Figma design space (scale 6.22, city at 208×356).
 * Not scaled by stage width (that produced 6.86 on 430-wide shells).
 */
function stageCam09(pt: MapPoint): CameraTransform {
  return cameraPlaceAt(pt, ZOOM_SCALE, ZOOM_FOCUS.x, ZOOM_FOCUS.y);
}

export function JourneyFlow({
  pathN,
  autostart = false,
  revisit = false,
  reopenHall = false,
  exploreHall = false,
}: Props) {
  const router = useRouter();
  const reduced = useReducedMotionSafe();
  const { startCityId, completedPaths, setCurrentPath } = useAppState();
  const [phase, setPhase] = useState<Phase>("boot");
  const [path, setPath] = useState<ResolvedPath | null>(null);
  /** Path 1 only — «Твій шлях» sheet. Paths ≥2 confirm on 02в. */
  const [showPathConfirm, setShowPathConfirm] = useState(true);
  const [originAbroad, setOriginAbroad] = useState(false);
  const [startCity, setStartCity] = useState(() => ({
    id: "kyiv",
    name: "Київ",
    oblast: "Київ",
    lat: 50.4501,
    lng: 30.5234,
  }));
  const [sheetVisible, setSheetVisible] = useState(false);
  const [showStartPin, setShowStartPin] = useState(false);
  const [arcDrawn, setArcDrawn] = useState(false);
  const [showTargetPin, setShowTargetPin] = useState(false);
  /** Active route opacity during flight (1 → fade in last 20%). */
  const [flightRouteOpacity, setFlightRouteOpacity] = useState(0.85);
  const [occupationNote, setOccupationNote] = useState(false);
  const [facadeOpacity, setFacadeOpacity] = useState(0);
  /** Sheet-anchored facade image box (kept through door zoom). */
  const [facadeImg, setFacadeImg] = useState<FacadeImgLayout | null>(null);
  const [blackout, setBlackout] = useState(0);
  const [debugMap] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("debug") === "map",
  );
  const [stageSize, setStageSize] = useState<{ w: number; h: number }>({
    w: FRAME.w,
    h: FRAME.h,
  });
  /** After «Летимо», stage size + 09 camera are frozen for the whole flight→zoom. */
  const journeyLockedRef = useRef(false);
  const lockedStageRef = useRef<{ w: number; h: number }>({
    w: FRAME.w,
    h: FRAME.h,
  });
  const lockedCam09Ref = useRef<CameraTransform | null>(null);
  const prevCamFrameRef = useRef<CameraTransform | null>(null);

  const cam07Design = useMemo(() => camera07(), []);
  const initialStageCam = useMemo(
    () => toStageCam07(cam07Design, FRAME.w, FRAME.h),
    [cam07Design],
  );

  const camX = useMotionValue(initialStageCam.tx);
  const camY = useMotionValue(initialStageCam.ty);
  const camScale = useMotionValue(initialStageCam.scale);
  const mapOpacity = useMotionValue(0);
  const flightT = useMotionValue(0);
  const glowOpacity = useMotionValue(0);
  const facadeScale = useMotionValue(1.02);
  const doorCamScale = useMotionValue(1);

  const facadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Dedicated revisit→hall timer — never cleared by goFacade fade restarts. */
  const revisitEnterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterDoorRef = useRef<() => void>(() => {});
  /** Synced before enterMap so flight→zoom→facade closures see the picked path. */
  const pathRef = useRef<ResolvedPath | null>(null);
  const revisitRef = useRef(revisit);
  const reopenHallRef = useRef(reopenHall);
  const exploreHallRef = useRef(exploreHall);
  const entryTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mapStageRef = useRef<HTMLDivElement>(null);
  const mapLayerRef = useRef<HTMLDivElement>(null);
  const flightLogRaf = useRef<number | null>(null);
  const facadeRootRef = useRef<HTMLDivElement>(null);
  const facadeCardRef = useRef<HTMLDivElement>(null);
  const facadeTrailRef = useRef<HTMLElement>(null);
  const phaseRef = useRef<Phase>(phase);
  const glowRef = useRef<SVGGElement>(null);
  const startPinRef = useRef<SVGGElement>(null);
  const targetPinRef = useRef<SVGGElement>(null);
  const flightDotRef = useRef<SVGGElement>(null);
  const trailRefs = useRef<(SVGCircleElement | null)[]>([]);

  const startPt = useMemo(() => projectToMap(startCity.lat, startCity.lng), [startCity]);
  const targetPt = useMemo(() => {
    if (!path) return startPt;
    return projectToMap(path.museum.lat, path.museum.lng);
  }, [path, startPt]);
  const ctrl = useMemo(() => arcControl(startPt, targetPt), [startPt, targetPt]);

  const distanceKm = useMemo(() => {
    if (!path) return 0;
    return haversineKm(startCity, path.museum);
  }, [path, startCity]);

  /**
   * Other journey museums (not the target / not visited) — dim markers on screen 02.
   */
  const visitedOrder = useMemo(
    () => getVisitedMuseumOrder(completedPaths),
    [completedPaths],
  );
  const dimMuseums = useMemo(() => {
    if (!path) return [];
    const visited = new Set(visitedOrder);
    return JOURNEY_MUSEUM_ORDER.filter(
      (id) =>
        id !== path.museumId &&
        id !== startCity.id &&
        !visited.has(id),
    )
      .map((id) => getMuseum(id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m));
  }, [path, startCity.id, visitedOrder]);

  const map02Labels = useMemo(() => {
    const markers = JOURNEY_MUSEUM_ORDER.map((id) => {
      const m = getMuseum(id);
      if (!m) return null;
      const p = projectToMap(m.lat, m.lng);
      return { id, x: p.x, y: p.y, label: m.city };
    }).filter((m): m is NonNullable<typeof m> => Boolean(m));
    return layoutMapLabels(markers);
  }, []);

  const museumUi = path ? getMuseumUi(path.museumId) : undefined;

  // Anchor facade image to the bottom sheet (and under the trail) on every viewport.
  useLayoutEffect(() => {
    if (phase !== "facade" && phase !== "entering") return;
    if (phase === "entering") return; // keep last layout while door zooms
    const root = facadeRootRef.current;
    const card = facadeCardRef.current;
    const ui = museumUi;
    if (!root || !card || !ui) return;

    const measure = () => {
      const r = facadeRootRef.current;
      const c = facadeCardRef.current;
      const trail = facadeTrailRef.current;
      if (!r || !c || !ui) return;
      const rootW = r.clientWidth;
      // Layout box (ignores sheet slide transform) — card shares bottom with root.
      const sheetTop = Math.max(0, r.clientHeight - c.offsetHeight);
      const trailBottom = trail
        ? trail.offsetTop + trail.offsetHeight
        : 0;
      const next = computeFacadeImgLayout(rootW, sheetTop, trailBottom, ui);
      setFacadeImg((prev) => {
        if (
          prev &&
          Math.abs(prev.left - next.left) < 0.5 &&
          Math.abs(prev.top - next.top) < 0.5 &&
          Math.abs(prev.width - next.width) < 0.5 &&
          Math.abs(prev.height - next.height) < 0.5
        ) {
          return prev;
        }
        return next;
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    ro.observe(card);
    const trail = facadeTrailRef.current;
    if (trail) ro.observe(trail);
    window.addEventListener("resize", measure);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", measure);
    // Sheet spring / fonts can settle a beat later.
    const t1 = window.setTimeout(measure, 50);
    const t2 = window.setTimeout(measure, 320);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      vv?.removeEventListener("resize", measure);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [phase, museumUi, revisit]);

  const trailItems: TrailItem[] | null = useMemo(() => {
    if (!path) return null;
    if (phase === "zoom" || phase === "occupation") {
      return [
        { label: startCity.name, state: "passed" },
        { label: path.museum.city, state: "current" },
        { label: "Музей", state: "upcoming" },
      ];
    }
    if (phase === "facade" || phase === "entering") {
      return [
        { label: startCity.name, state: "passed" },
        { label: path.museum.city, state: "passed" },
        { label: "Музей", state: "current" },
      ];
    }
    return null;
  }, [path, phase, startCity.name]);

  const writeOverlay = useCallback(
    (cam: CameraTransform, tFlight: number, showDot: boolean) => {
      const targetScreen = cameraProjectPoint(targetPt, cam);
      if (glowRef.current) {
        glowRef.current.setAttribute(
          "transform",
          `translate(${targetScreen.x} ${targetScreen.y})`,
        );
      }
      if (startPinRef.current) {
        const s = cameraProjectPoint(startPt, cam);
        startPinRef.current.setAttribute("transform", `translate(${s.x} ${s.y})`);
      }
      if (targetPinRef.current) {
        targetPinRef.current.setAttribute(
          "transform",
          `translate(${targetScreen.x} ${targetScreen.y})`,
        );
      }
      if (flightDotRef.current) {
        // Firefly travels along the dotted route (start → target).
        if (showDot && tFlight >= 0 && tFlight < 1) {
          const dot = pointOnQuad(startPt, ctrl, targetPt, tFlight);
          const s = cameraProjectPoint(dot, cam);
          flightDotRef.current.setAttribute("transform", `translate(${s.x} ${s.y})`);
          flightDotRef.current.setAttribute("opacity", "1");
        } else {
          flightDotRef.current.setAttribute("opacity", "0");
        }
      }
      // Trail stays constant screen size (overlay); radius ~2px feel
      const trailR = 2.5;
      for (let i = 0; i < TRAIL_LEN; i++) {
        const el = trailRefs.current[i];
        if (!el) continue;
        const ti = tFlight - (i + 1) * 0.035;
        if (!showDot || ti <= 0 || tFlight <= 0) {
          el.setAttribute("opacity", "0");
          continue;
        }
        const p = pointOnQuad(startPt, ctrl, targetPt, ti);
        const s = cameraProjectPoint(p, cam);
        el.setAttribute("cx", String(s.x));
        el.setAttribute("cy", String(s.y));
        el.setAttribute("r", String(trailR));
        el.setAttribute("opacity", String(((TRAIL_LEN - i) / TRAIL_LEN) * 0.45));
      }
    },
    [ctrl, startPt, targetPt],
  );

  const readCam = useCallback(
    (): CameraTransform => ({
      tx: camX.get(),
      ty: camY.get(),
      scale: camScale.get(),
    }),
    [camScale, camX, camY],
  );

  const setCam = useCallback(
    (cam: CameraTransform) => {
      camX.set(cam.tx);
      camY.set(cam.ty);
      camScale.set(cam.scale);
    },
    [camScale, camX, camY],
  );

  /**
   * Flight camera: follow the firefly; focus eases start → museum (cam07 → cam09).
   * Geometry is passed in (not closed over React state) so autostart / 02в
   * flights that run before `setPath` commits still target the right museum.
   */
  const camForFlightT = useCallback(
    (
      t: number,
      stageW: number,
      stageH: number,
      cam09: CameraTransform,
      start: MapPoint,
      ctrlPt: MapPoint,
      target: MapPoint,
    ): CameraTransform => {
      const c0 = toStageCam07(cam07Design, stageW, stageH);
      const startFocus = cameraProjectPoint(start, c0);
      const focusX = startFocus.x + (ZOOM_FOCUS.x - startFocus.x) * t;
      const focusY = startFocus.y + (ZOOM_FOCUS.y - startFocus.y) * t;
      const scale = c0.scale + (cam09.scale - c0.scale) * t;
      const dot = pointOnQuad(start, ctrlPt, target, t);
      return cameraPlaceAt(dot, scale, focusX, focusY);
    },
    [cam07Design],
  );

  useEffect(() => {
    const el = mapStageRef.current;
    if (!el) return;
    const measure = () => {
      // Journey lock: ignore resizes after «Летимо» so the 09 camera never recomputes.
      if (journeyLockedRef.current) return;
      const w = el.clientWidth || FRAME.w;
      const h = el.clientHeight || FRAME.h;
      setStageSize({ w, h });
      const p = phaseRef.current;
      if (p === "map" || p === "boot") {
        const cam = toStageCam07(camera07(), w, h);
        setCam(cam);
        writeOverlay(cam, 0, false);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [setCam, writeOverlay]);

  // Dev: warn on post-animation snaps (>40px translate with nearly unchanged scale).
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    let raf = 0;
    const tick = () => {
      const cam = {
        tx: camX.get(),
        ty: camY.get(),
        scale: camScale.get(),
      };
      const prev = prevCamFrameRef.current;
      const p = phaseRef.current;
      const inJourney =
        p === "flight" || p === "zoom" || p === "occupation";
      if (prev && inJourney) {
        const dtx = Math.abs(cam.tx - prev.tx);
        const dty = Math.abs(cam.ty - prev.ty);
        const dScale = Math.abs(cam.scale - prev.scale);
        // Smooth flight changes scale; a recompute snap keeps scale and teleports x/y.
        if ((dtx > 40 || dty > 40) && dScale < 0.05) {
          console.warn(
            `[journey camera] jump Δtx=${dtx.toFixed(1)} Δty=${dty.toFixed(1)} ` +
              `scale ${prev.scale.toFixed(2)}→${cam.scale.toFixed(2)} phase=${p}`,
          );
        }
      }
      prevCamFrameRef.current = cam;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [camScale, camX, camY]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    revisitRef.current = revisit;
  }, [revisit]);

  useEffect(() => {
    reopenHallRef.current = reopenHall;
  }, [reopenHall]);

  useEffect(() => {
    exploreHallRef.current = exploreHall;
  }, [exploreHall]);

  useEffect(() => {
    if (path) pathRef.current = path;
  }, [path]);

  // Re-apply pin transforms after every React commit that may wipe setAttribute
  // (phase → zoom/occupation re-renders the overlay while the camera is static).
  useLayoutEffect(() => {
    if (!showStartPin && !showTargetPin) return;
    writeOverlay(readCam(), flightT.get(), phaseRef.current === "flight");
  }, [phase, flightT, readCam, showStartPin, showTargetPin, writeOverlay]);

  useMotionValueEvent(camX, "change", () => {
    writeOverlay(readCam(), flightT.get(), phaseRef.current === "flight");
  });
  useMotionValueEvent(camY, "change", () => {
    writeOverlay(readCam(), flightT.get(), phaseRef.current === "flight");
  });
  useMotionValueEvent(camScale, "change", () => {
    writeOverlay(readCam(), flightT.get(), phaseRef.current === "flight");
  });
  useMotionValueEvent(flightT, "change", (t) => {
    writeOverlay(readCam(), t, phaseRef.current === "flight");
  });

  const clearEntryTimers = useCallback(() => {
    entryTimers.current.forEach(clearTimeout);
    entryTimers.current = [];
  }, []);

  const scheduleEntry = useCallback(
    (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      entryTimers.current.push(id);
    },
    [],
  );

  const runFlightRef = useRef<() => void>(() => {});

  const enterMap = useCallback((opts?: { autoFlight?: boolean }) => {
    const autoFlight = Boolean(opts?.autoFlight);
    clearEntryTimers();
    journeyLockedRef.current = false;
    lockedCam09Ref.current = null;
    setPhase("map");
    // Always the same 07 framing as 02 / 02в — flight frame 0 = this cam.
    const cam = toStageCam07(camera07(), stageSize.w, stageSize.h);
    setCam(cam);
    flightT.set(0);
    writeOverlay(cam, 0, false);

    // «Вирушити» / autostart / 02в: skip draw-in — fly from cam07 immediately.
    if (autoFlight) {
      mapOpacity.set(1);
      glowOpacity.set(1);
      setShowStartPin(true);
      setArcDrawn(true);
      setShowTargetPin(true);
      setSheetVisible(false);
      scheduleEntry(() => runFlightRef.current(), 0);
      return;
    }

    if (reduced) {
      mapOpacity.set(1);
      glowOpacity.set(1);
      setShowStartPin(true);
      setArcDrawn(true);
      setShowTargetPin(true);
      setSheetVisible(true);
      return;
    }
    // Absolute timeline ≈ 2.8s — no nested onComplete / extra gaps
    mapOpacity.set(0);
    glowOpacity.set(0);
    setShowStartPin(false);
    setArcDrawn(false);
    setShowTargetPin(false);
    setSheetVisible(false);
    animate(mapOpacity, 1, {
      duration: motionTokens.mapFadeIn,
      ease: easings.easeOut,
    });
    scheduleEntry(() => setShowStartPin(true), ENTRY_T_PIN);
    scheduleEntry(() => setArcDrawn(true), ENTRY_T_ARC);
    scheduleEntry(() => {
      setShowTargetPin(true);
      glowOpacity.set(0);
      animate(glowOpacity, 1, { duration: ENTRY_TARGET_MS / 1000, ease: easings.easeOut });
    }, ENTRY_T_TARGET);
    scheduleEntry(() => setSheetVisible(true), ENTRY_T_SHEET);
  }, [
    clearEntryTimers,
    flightT,
    glowOpacity,
    mapOpacity,
    reduced,
    scheduleEntry,
    setCam,
    stageSize.h,
    stageSize.w,
    writeOverlay,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const delay = reduced ? 0 : PICK_DELAY_MS;
      const picked =
        pathN != null
          ? await (async () => {
              await new Promise((r) => setTimeout(r, delay));
              return getPath(pathN);
            })()
          : await pickPath(completedPaths, delay);

      if (cancelled) return;
      if (!picked) {
        router.replace("/");
        return;
      }

      // Path 1 from city picker: ALWAYS 02 «Твій шлях» sheet (never skip to hall).
      // Same-museum consecutive (6→7…) may skip map only after path 1 is done.
      if (
        pathN == null &&
        picked.n !== 1 &&
        shouldSkipMapToHall(completedPaths, picked)
      ) {
        setCurrentPath(picked.n);
        router.replace(
          `/hall/${picked.museumId}?path=${picked.n}&artwork=${picked.artworkId}`,
        );
        return;
      }

      // Paths ≥2 confirm on 02в — do not open screen-02 «Твій шлях».
      if (pathN == null && picked.n > 1) {
        router.replace("/journey?mode=route");
        return;
      }

      // Path 1: sheet + «Вирушити» unless explicit autostart (from 02в depart).
      // Revisit never applies to path 1 / city picker.
      const isPath1 = picked.n === 1;
      const confirm = isPath1 && !autostart;
      const autoFlight = !confirm;
      setShowPathConfirm(confirm);

      const origin = getPathOrigin(startCityId, picked);
      // Sync refs BEFORE enterMap — autoFlight runs flight in the same tick
      // while React state `path` is still null (stale closures).
      pathRef.current = picked;
      revisitRef.current = revisit;
      reopenHallRef.current = reopenHall;
      exploreHallRef.current = exploreHall;
      setStartCity(origin.city);
      setOriginAbroad(origin.abroad);
      setPath(picked);
      setCurrentPath(picked.n);
      enterMap({ autoFlight });
    })();
    return () => {
      cancelled = true;
      clearEntryTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPop = () => {
      window.history.pushState({ journey: true }, "");
    };
    window.history.pushState({ journey: true }, "");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const clearRevisitEnterTimer = useCallback((reason: string) => {
    if (!revisitEnterTimer.current) return;
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[revisit] timer cancelled: ${reason}`);
    }
    clearTimeout(revisitEnterTimer.current);
    revisitEnterTimer.current = null;
  }, []);

  const enterDoor = useCallback(() => {
    const p = pathRef.current;
    const ui = p ? getMuseumUi(p.museumId) : undefined;
    if (!p || !ui) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[revisit] enterDoor early-return path=${Boolean(p)} museumUi=${Boolean(ui)}`,
        );
      }
      return;
    }
    if (facadeTimer.current) clearTimeout(facadeTimer.current);
    clearRevisitEnterTimer("enterDoor");
    setPhase("entering");
    const reopenQs = reopenHallRef.current ? "&reopen=1" : "";
    const exploreQs = exploreHallRef.current ? "&explore=1" : "";
    const hallUrl = `/hall/${p.museumId}?path=${p.n}&artwork=${p.artworkId}${reopenQs}${exploreQs}`;
    if (reduced) {
      setBlackout(1);
      router.push(hallUrl);
      return;
    }
    animate(doorCamScale, 1.3, {
      duration: motionTokens.doorEnter,
      ease: easings.easeIn,
    });
    const t0 = performance.now();
    const fade = () => {
      const prog = Math.min(
        1,
        (performance.now() - t0) / (motionTokens.doorEnter * 1000),
      );
      setBlackout(prog);
      if (prog < 1) requestAnimationFrame(fade);
      else router.push(hallUrl);
    };
    requestAnimationFrame(fade);
  }, [clearRevisitEnterTimer, doorCamScale, reduced, router]);

  useEffect(() => {
    enterDoorRef.current = enterDoor;
  }, [enterDoor]);

  useEffect(() => {
    return () => {
      clearRevisitEnterTimer("unmount");
      if (facadeTimer.current) clearTimeout(facadeTimer.current);
    };
  }, [clearRevisitEnterTimer]);

  const scheduleRevisitEnter = useCallback(() => {
    const p = pathRef.current;
    const isRevisit = revisitRef.current;
    // Revisit auto-enter never for path 1
    if (!isRevisit || !p || p.n === 1) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[revisit] scheduleRevisitEnter early-return revisit=${isRevisit} pathN=${p?.n ?? "null"}`,
        );
      }
      return;
    }
    clearRevisitEnterTimer("reschedule");
    const ms = reduced
      ? motionTokens.reducedCrossfade * 1000
      : REVISIT_FACADE_MS;
    revisitEnterTimer.current = setTimeout(() => {
      revisitEnterTimer.current = null;
      enterDoorRef.current();
    }, ms);
  }, [clearRevisitEnterTimer, reduced]);

  const goFacade = useCallback(() => {
    if (facadeTimer.current) clearTimeout(facadeTimer.current);
    setOccupationNote(false);
    setPhase("facade");
    setFacadeOpacity(0);
    facadeScale.set(1.02);
    if (reduced) {
      setFacadeOpacity(1);
      facadeScale.set(1);
      scheduleRevisitEnter();
      return;
    }
    animate(facadeScale, 1, { duration: motionTokens.facadeScale, ease: easings.easeOut });
    const t0 = performance.now();
    const fade = () => {
      const prog = Math.min(
        1,
        (performance.now() - t0) / (motionTokens.facadeCrossfade * 1000),
      );
      setFacadeOpacity(prog);
      if (prog < 1) requestAnimationFrame(fade);
      else scheduleRevisitEnter();
    };
    requestAnimationFrame(fade);
  }, [facadeScale, reduced, scheduleRevisitEnter]);

  const afterZoom = useCallback(() => {
    const p = pathRef.current;
    const isRevisit = revisitRef.current;
    // Revisit: skip occupation note — straight to short facade hold (not path 1)
    if (isRevisit && p && p.n !== 1) {
      facadeTimer.current = setTimeout(
        () => goFacade(),
        reduced ? 0 : FACADE_AUTO_MS,
      );
      return;
    }
    if (isRevisit && process.env.NODE_ENV !== "production") {
      console.warn(
        `[revisit] afterZoom non-revisit branch pathN=${p?.n ?? "null"}`,
      );
    }
    const occupied = Boolean(p?.museum.occupied);
    if (occupied && !reduced) {
      setPhase("occupation");
      setOccupationNote(true);
      facadeTimer.current = setTimeout(() => goFacade(), OCCUPATION_HOLD_MS);
    } else {
      facadeTimer.current = setTimeout(() => goFacade(), FACADE_AUTO_MS);
    }
  }, [goFacade, reduced]);

  const runZoom = useCallback(() => {
    setPhase("zoom");
    flightT.set(1);
    const end = lockedCam09Ref.current;
    if (!end) return;
    if (reduced) {
      setCam(end);
      glowOpacity.set(1);
      writeOverlay(end, 1, false);
      afterZoom();
      return;
    }
    // Already at end from flight — hold camera; only glow animates.
    // Do not recompute or setCam to a different transform.
    setCam(end);
    writeOverlay(end, 1, false);
    glowOpacity.set(0.35);
    animate(glowOpacity, 1, {
      duration: motionTokens.zoomCity,
      ease: easings.easeOut,
      onComplete: () => afterZoom(),
    });
  }, [afterZoom, flightT, glowOpacity, reduced, setCam, writeOverlay]);

  const runFlight = useCallback(() => {
    // Resolve geometry from pathRef — autostart/02в may fire before setPath commits.
    const active = pathRef.current;
    if (!active) {
      console.warn("[journey] runFlight skipped: pathRef empty");
      return;
    }
    const origin = getPathOrigin(startCityId, active);
    const start = projectToMap(origin.city.lat, origin.city.lng);
    const target = projectToMap(active.museum.lat, active.museum.lng);
    const ctrlPt = arcControl(start, target);

    // Lock full-screen stage + 09 camera once (header/sheet are overlays — no reflow).
    const el = mapStageRef.current;
    const w = el?.clientWidth || stageSize.w || FRAME.w;
    const h = el?.clientHeight || stageSize.h || FRAME.h;
    lockedStageRef.current = { w, h };
    lockedCam09Ref.current = stageCam09(target);
    journeyLockedRef.current = true;
    setStageSize({ w, h });

    const cam07 = toStageCam07(cam07Design, w, h);
    const cam09 = lockedCam09Ref.current;
    // Frame 0 = cam07 (same framing as 02 / 02в).
    setCam(cam07);

    // Dev / prod-with-flag: log camera each frame for QA.
    if (
      process.env.NODE_ENV === "development" ||
      process.env.NEXT_PUBLIC_FLIGHT_LOG === "1"
    ) {
      if (flightLogRaf.current) cancelAnimationFrame(flightLogRaf.current);
      const samples: {
        t: number;
        tx: number;
        ty: number;
        scale: number;
        targetScreen: { x: number; y: number };
      }[] = [];
      const t0 = performance.now();
      const flightMs = (revisit ? REVISIT_FLIGHT_SEC : motionTokens.flight) * 1000;
      const tick = () => {
        const now = performance.now();
        const cam = readCam();
        const scr = cameraProjectPoint(target, cam);
        samples.push({
          t: Math.round(now - t0),
          tx: Math.round(cam.tx * 10) / 10,
          ty: Math.round(cam.ty * 10) / 10,
          scale: Math.round(cam.scale * 1000) / 1000,
          targetScreen: {
            x: Math.round(scr.x * 10) / 10,
            y: Math.round(scr.y * 10) / 10,
          },
        });
        if (now - t0 < flightMs + 80) {
          flightLogRaf.current = requestAnimationFrame(tick);
          return;
        }
        flightLogRaf.current = null;
        const f0 = samples[0];
        const last = samples[samples.length - 1];
        let maxJump = 0;
        let monoZoom = true;
        for (let i = 1; i < samples.length; i++) {
          const a = samples[i - 1]!;
          const b = samples[i]!;
          const dt = Math.max(1, b.t - a.t);
          // Normalize to ~16ms frame so sparse RAF gaps don't inflate the jump.
          const frameJump = Math.max(
            Math.abs(b.tx - a.tx),
            Math.abs(b.ty - a.ty),
          ) * (16 / dt);
          maxJump = Math.max(maxJump, frameJump);
          if (b.scale + 0.0005 < a.scale) monoZoom = false;
        }
        const centreErr = last
          ? Math.hypot(
              last.targetScreen.x - ZOOM_FOCUS.x,
              last.targetScreen.y - ZOOM_FOCUS.y,
            )
          : null;
        console.info("[shovani:flight-log]", {
          path: active.n,
          museum: active.museumId,
          viewport: { w, h },
          cam07: {
            tx: Math.round(cam07.tx * 10) / 10,
            ty: Math.round(cam07.ty * 10) / 10,
            scale: Math.round(cam07.scale * 1000) / 1000,
          },
          cam09: {
            tx: Math.round(cam09.tx * 10) / 10,
            ty: Math.round(cam09.ty * 10) / 10,
            scale: Math.round(cam09.scale * 1000) / 1000,
          },
          frame0: f0 ?? null,
          final: last ?? null,
          focusTarget: ZOOM_FOCUS,
          maxJumpPx: Math.round(maxJump * 10) / 10,
          monoZoom,
          finalCentreErrPx:
            centreErr == null ? null : Math.round(centreErr * 10) / 10,
          samples,
        });
      };
      flightLogRaf.current = requestAnimationFrame(tick);
    }

    // Sheet slides down while the camera already moves (no wait).
    setSheetVisible(false);
    setPhase("flight");
    setFlightRouteOpacity(0.85);
    flightT.set(0);
    mapOpacity.set(1);

    const flightSec = revisit ? REVISIT_FLIGHT_SEC : motionTokens.flight;
    if (reduced) {
      setCam(cam09);
      flightT.set(1);
      setFlightRouteOpacity(0);
      writeOverlay(cam09, 1, false);
      setTimeout(() => runZoom(), motionTokens.reducedCrossfade * 1000);
      return;
    }
    animate(flightT, 1, {
      duration: flightSec,
      ease: easings.easeInOut,
      onUpdate: (t) => {
        const cam = camForFlightT(t, w, h, cam09, start, ctrlPt, target);
        setCam(cam);
        // Route stays visible; fade only in the last 20%.
        setFlightRouteOpacity(t < 0.8 ? 0.85 : 0.85 * (1 - (t - 0.8) / 0.2));
      },
      onComplete: () => {
        setCam(cam09);
        setFlightRouteOpacity(0);
        writeOverlay(cam09, 1, false);
        runZoom();
      },
    });
  }, [
    cam07Design,
    camForFlightT,
    flightT,
    mapOpacity,
    readCam,
    reduced,
    revisit,
    runZoom,
    setCam,
    stageSize.h,
    stageSize.w,
    startCityId,
    writeOverlay,
  ]);

  useEffect(() => {
    runFlightRef.current = runFlight;
  }, [runFlight]);

  const skipToFacade = () => {
    if (phase === "zoom" || phase === "occupation") goFacade();
  };

  const showMap =
    phase === "map" ||
    phase === "flight" ||
    phase === "zoom" ||
    phase === "occupation" ||
    (phase === "facade" && facadeOpacity < 1);

  const hideFarLabels = phase === "flight" || phase === "zoom" || phase === "occupation";
  const showMapTrail = trailItems && (phase === "zoom" || phase === "occupation");
  const onZoom = phase === "zoom" || phase === "occupation";
  const glowR = onZoom ? GLOW_R_09 : GLOW_R_07;
  const breatheGlow = phase === "map" && showTargetPin && !reduced;

  if (!path) {
    return <div className="min-h-dvh bg-screen" aria-busy />;
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-screen text-text-primary">
      {/* MVP v2: disabled — E1 «Будуємо шлях» / «Привіт, Анно» */}

      {showMapTrail ? <RouteTrail items={trailItems} /> : null}

      {/* Map stage — ALWAYS full-screen; flight/zoom only move the camera */}
      {showMap && (
        <div
          ref={mapStageRef}
          className="absolute inset-0 z-0"
          onClick={
            phase === "zoom" || phase === "occupation" ? skipToFacade : undefined
          }
        >
          <motion.div
            ref={mapLayerRef}
            className="absolute left-0 top-0"
            style={{
              opacity: mapOpacity,
              x: camX,
              y: camY,
              scale: camScale,
              transformOrigin: "0 0",
              width: vb.w,
              height: vb.h,
            }}
          >
            <svg
              viewBox={`0 0 ${vb.w} ${vb.h}`}
              width={vb.w}
              height={vb.h}
              className="block"
              role="img"
              aria-label="Карта України"
            >
              <MapLandArt shadow={phase === "map"} />
              {/* Rays start → visited (50%, 2px/6px); active start → target (85%) */}
              {phase === "map" && !hideFarLabels
                ? visitedOrder.map((id) => {
                    const m = getMuseum(id);
                    if (!m) return null;
                    const end = projectToMap(m.lat, m.lng);
                    return (
                      <DottedRoute
                        key={`ray-${id}`}
                        start={startPt}
                        ctrl={arcControl(startPt, end)}
                        end={end}
                        dot={2}
                        gap={6}
                        opacity={0.5}
                        animateDraw={false}
                        routeKey={`ray-${id}`}
                      />
                    );
                  })
                : null}
              {/* Active route: visible on map + whole flight (fade last 20%). */}
              {(phase === "map" && arcDrawn) || phase === "flight" ? (
                <DottedRoute
                  start={startPt}
                  ctrl={ctrl}
                  end={targetPt}
                  dot={2}
                  gap={6}
                  routeKey={`path-${path?.n ?? 0}-${path?.museumId ?? ""}`}
                  opacity={
                    phase === "flight" ? flightRouteOpacity : 0.85
                  }
                  animateDraw={phase === "map"}
                />
              ) : null}
              {phase === "map" && !hideFarLabels
                ? visitedOrder.map((id) => {
                    if (id === path?.museumId) return null;
                    const m = getMuseum(id);
                    if (!m) return null;
                    const p = projectToMap(m.lat, m.lng);
                    const place = map02Labels.get(id);
                    return (
                      <MapStar
                        key={`vis-${id}`}
                        x={p.x}
                        y={p.y}
                        size={14}
                        label={m.city}
                        labelSide={place?.side ?? mapLabelSide(p.x)}
                        labelDy={place?.dy ?? 0}
                        glow="soft"
                        labelTone="secondary"
                      />
                    );
                  })
                : null}
              {/* Dim unvisited journey museums — screen 02 */}
              {phase === "map" && !hideFarLabels
                ? dimMuseums.map((m) => {
                    const p = projectToMap(m.lat, m.lng);
                    const place = map02Labels.get(m.id);
                    return (
                      <MuseumDot
                        key={m.id}
                        x={p.x}
                        y={p.y}
                        label={m.city}
                        labelSide={place?.side ?? mapLabelSide(p.x)}
                        labelDy={place?.dy ?? 0}
                        tone="dim"
                      />
                    );
                  })
                : null}
              {debugMap &&
                getMuseums().map((m) => {
                  const p = projectToMap(m.lat, m.lng);
                  return (
                    <g key={`dbg-${m.id}`} transform={`translate(${p.x} ${p.y})`}>
                      <circle r={3} fill="#7FCB94" />
                      <text
                        y={-8}
                        textAnchor="middle"
                        fill="#7FCB94"
                        fontSize={9}
                        fontFamily="var(--font-manrope), sans-serif"
                      >
                        {m.city}
                      </text>
                    </g>
                  );
                })}
            </svg>
          </motion.div>

          {/* Constant screen-size overlay — positions written from motion values */}
          <motion.svg
            className="pointer-events-none absolute inset-0"
            width={stageSize.w}
            height={stageSize.h}
            viewBox={`0 0 ${stageSize.w} ${stageSize.h}`}
            style={{ opacity: mapOpacity }}
            aria-hidden
          >
            <defs>
              {/* 07: center 0.45 → 40% 0.18 → transparent; 9 uses same stops, stronger via glowOpacity */}
              <radialGradient id="city-glow-screen" cx="50%" cy="50%" r="50%">
                <stop
                  offset="0%"
                  stopColor="var(--color-bg-accent)"
                  stopOpacity={onZoom ? 0.55 : 0.45}
                />
                <stop offset="40%" stopColor="var(--color-bg-accent)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="var(--color-bg-accent)" stopOpacity="0" />
              </radialGradient>
            </defs>

            <g ref={glowRef}>
              <motion.circle
                r={glowR}
                fill="url(#city-glow-screen)"
                style={{
                  opacity: glowOpacity,
                  transformBox: "fill-box",
                  transformOrigin: "center",
                }}
                animate={
                  breatheGlow ? { scale: [0.9, 1.05, 0.9] } : { scale: 1 }
                }
                transition={
                  breatheGlow
                    ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.3 }
                }
              />
            </g>

            {Array.from({ length: TRAIL_LEN }, (_, i) => (
              <circle
                key={`trail-${i}`}
                ref={(el) => {
                  trailRefs.current[i] = el;
                }}
                r={2.5}
                fill="var(--color-bg-accent)"
                opacity={0}
              />
            ))}

            <g ref={startPinRef} opacity={showStartPin && !hideFarLabels ? 1 : 0}>
              <MapPin
                x={0}
                y={0}
                label={originAbroad ? "Ти" : startCity.name}
                variant="start"
              />
            </g>

            {/* Target pin stays visible in flight/zoom/occupation (start pin hides). */}
            <g
              ref={targetPinRef}
              opacity={showTargetPin ? 1 : 0}
              style={{ pointerEvents: "none" }}
            >
              {/* Star only after museum opened; otherwise ring+dot target pin */}
              {visitedOrder.includes(path.museumId) ? (
                <MapStar
                  x={0}
                  y={0}
                  size={22}
                  label={path.museum.city}
                  labelSide="right"
                  glow="strong"
                  labelTone="primary"
                  pulsing={!reduced && phase === "map"}
                />
              ) : (
                <MapPin
                  x={0}
                  y={0}
                  label={path.museum.city}
                  labelSide="right"
                  variant="target"
                  pulsing={!reduced && phase === "map"}
                />
              )}
            </g>

            <g ref={flightDotRef} opacity={0}>
              <circle r={8} fill="var(--color-bg-accent)" opacity={0.35} />
              <circle
                r={4.5}
                fill="var(--color-bg-accent)"
                style={{ filter: "drop-shadow(0 0 6px var(--color-bg-accent))" }}
              />
            </g>
          </motion.svg>
        </div>
      )}

      {/* Header — MVP v2 screen 02 «Твій шлях» (path 1 only) */}
      {phase === "map" && showPathConfirm && (
        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-xl pb-md pt-[calc(56px+var(--safe-top))]">
          <h1 className="text-h1">Твій шлях</h1>
          <p className="mt-sm text-body-md text-text-secondary">
            10 творів у 5 музеях. Сьогодні шлях веде до{" "}
            {cityGenitiveForMuseum(path.museumId)}.
          </p>
        </header>
      )}

      <AnimatePresence>
        {occupationNote && (
          <motion.p
            className="pointer-events-none absolute bottom-32 left-0 right-0 z-20 px-xl text-center text-body-md text-text-secondary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* TODO(confirm): occupation note copy */}
            {path.museum.city} — місто під окупацією
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheetVisible && phase === "map" && showPathConfirm && (
          <motion.div
            className="absolute inset-x-0 bottom-0 z-20 rounded-t-lg border-t border-border-subtle bg-surface px-xl pb-[calc(24px+var(--safe-bottom))] pt-xl"
            initial={reduced ? false : { y: "100%" }}
            animate={{ y: 0 }}
            exit={{
              y: "100%",
              transition: {
                duration: motionTokens.sheetHide,
                ease: easings.easeIn,
              },
            }}
            transition={{
              duration: motionTokens.sheetSlide,
              ease: easings.easeOut,
            }}
          >
            <h2 className="text-h2">
              Твій шлях — {getMuseumShortLabel(path.museumId)}
            </h2>
            <p className="mt-sm text-body-md text-text-secondary">
              {originAbroad
                ? `Звідти, де ти зараз. ${pathSheetBlurb(path.museumId)}`
                : `≈ ${distanceKm} км від тебе. ${pathSheetBlurb(path.museumId)}`}
            </p>
            <div className="mt-lg flex flex-col items-stretch">
              <Button onClick={runFlight}>Вирушити</Button>
              <RestartJourneyLink />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Facade 11 — width-fit image anchored so ground sits just above the sheet */}
      {(phase === "facade" || phase === "entering") && museumUi && (
        <motion.div
          ref={facadeRootRef}
          className="absolute inset-0 z-40 overflow-hidden"
          style={{
            opacity: Math.max(facadeOpacity, phase === "entering" ? 1 : facadeOpacity),
            backgroundColor: museumUi.facadeFill,
          }}
        >
          <motion.div
            className="absolute inset-0 overflow-hidden"
            style={{
              scale: phase === "entering" ? doorCamScale : facadeScale,
              transformOrigin: facadeImg
                ? `${facadeImg.originX}px ${facadeImg.originY}px`
                : `${museumUi.doorX}% ${museumUi.doorY}%`,
              backgroundColor: museumUi.facadeFill,
            }}
          >
            {phase === "facade" && !revisit ? (
              <button
                type="button"
                aria-label="Зайти в музей"
                onClick={enterDoor}
                className="absolute z-[1] cursor-pointer border-0 bg-transparent p-0"
                style={
                  facadeImg
                    ? {
                        left: facadeImg.left,
                        top: facadeImg.top,
                        width: facadeImg.width,
                        height: facadeImg.height,
                      }
                    : { inset: 0 }
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={museumUi.facadeSrc}
                  alt=""
                  className="pointer-events-none size-full select-none"
                  draggable={false}
                />
              </button>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={museumUi.facadeSrc}
                alt=""
                className="pointer-events-none absolute z-[1] select-none"
                style={
                  facadeImg
                    ? {
                        left: facadeImg.left,
                        top: facadeImg.top,
                        width: facadeImg.width,
                        height: facadeImg.height,
                      }
                    : { inset: 0, width: "100%", height: "100%" }
                }
                draggable={false}
              />
            )}
          </motion.div>

          {phase === "facade" && trailItems && !revisit ? (
            <RouteTrail
              items={trailItems}
              style={{ left: 24, top: 76 }}
              ref={facadeTrailRef}
            />
          ) : null}

          {phase === "facade" && !revisit ? (
            <motion.div
              ref={facadeCardRef}
              className="absolute inset-x-0 bottom-0 z-20 rounded-t-lg border-t border-border-subtle bg-surface px-xl pb-[calc(24px+var(--safe-bottom))] pt-xl"
              initial={reduced ? false : { y: "100%" }}
              animate={{ y: 0 }}
              transition={{ duration: motionTokens.sheetSlide, ease: easings.easeOut }}
            >
              <p className="text-overline uppercase text-text-accent">Ласкаво просимо</p>
              <h2 className="mt-md text-h2 break-words">
                {getMuseumDisplayName(path.museumId)}
              </h2>
              <p className="mt-sm text-body-md text-text-secondary">
                {museumFacadeBlurb(path.museumId)}
              </p>
              <div className="mt-lg">
                <Button onClick={enterDoor}>Зайти всередину</Button>
              </div>
            </motion.div>
          ) : null}
        </motion.div>
      )}

      {/* Revisit sheet: screen-space (outside scaled/overflow facade) so it is never clipped */}
      {phase === "facade" && revisit && path ? (
        <div
          ref={facadeCardRef}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[45] rounded-t-lg border-t border-border-subtle bg-surface px-xl pb-[calc(24px+var(--safe-bottom))] pt-xl"
          aria-hidden
        >
          <p className="text-overline uppercase text-text-accent">
            Ласкаво просимо
          </p>
          <h2 className="mt-md text-h2 break-words">
            {getMuseumDisplayName(path.museumId)}
          </h2>
        </div>
      ) : null}

      <div
        className="pointer-events-none absolute inset-0 z-50 bg-black"
        style={{ opacity: blackout }}
        aria-hidden
      />

      {/* Invisible 07 land-box marker for layout sanity (dev only) */}
      {debugMap && phase === "map" && (
        <div
          className="pointer-events-none absolute z-[5] border border-dashed border-status-safe/40"
          style={{
            left: MAP_07.x * (stageSize.w / FRAME.w),
            top: MAP_07.y * (stageSize.h / FRAME.h),
            width: MAP_07.w * (stageSize.w / FRAME.w),
            height: MAP_07.h * (stageSize.w / FRAME.w),
          }}
        />
      )}
    </div>
  );
}

