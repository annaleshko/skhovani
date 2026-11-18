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
  pathSheetBlurb,
} from "@/data/museum-copy";
import {
  FACADE_NATIVE_H,
  FACADE_NATIVE_W,
  getMuseumDisplayName,
  getMuseumShortLabel,
  getMuseumUi,
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
};

const PICK_DELAY_MS = 0;
const FACADE_AUTO_MS = 600;
const OCCUPATION_HOLD_MS = 2500;
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

/**
 * Fit facade into [availTop, availBottom]; scale down if needed (min 0.75).
 * `y` may only move up (≤ 0) — never leave a gap below the top of the screen.
 */
function fitFacadeLayout(
  screenW: number,
  availTop: number,
  availBottom: number,
  buildingTopY: number,
  groundY: number,
): { width: number; height: number; x: number; y: number; scale: number } {
  const fullH = screenW * (FACADE_NATIVE_H / FACADE_NATIVE_W);
  const buildingFrac = Math.max(0.01, groundY - buildingTopY);
  const buildingAtFull = buildingFrac * fullH;
  const availH = Math.max(1, availBottom - availTop);
  let scale = 1;
  if (buildingAtFull > availH) {
    scale = Math.max(0.75, availH / buildingAtFull);
  }
  const width = screenW * scale;
  const height = fullH * scale;
  // Align ground to availBottom, but never shift the image down (Figma y=0 at 390×844).
  const y = Math.min(0, availBottom - groundY * height);
  const x = (screenW - width) / 2;
  return { width, height, x, y, scale };
}

export function JourneyFlow({ pathN, autostart = false }: Props) {
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
  const [occupationNote, setOccupationNote] = useState(false);
  const [facadeOpacity, setFacadeOpacity] = useState(0);
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
  const facadeScale = useMotionValue(1.05);
  const doorCamScale = useMotionValue(1);

  const facadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entryTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mapStageRef = useRef<HTMLDivElement>(null);
  const facadeRootRef = useRef<HTMLDivElement>(null);
  const facadeCardRef = useRef<HTMLDivElement>(null);
  const facadeTrailRef = useRef<HTMLElement>(null);
  const [facadeCardTop, setFacadeCardTop] = useState<number>(FRAME.h);
  const [facadeTrailBottom, setFacadeTrailBottom] = useState(96);
  const [facadeWidth, setFacadeWidth] = useState<number>(FRAME.w);
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

  const museumUi = path ? getMuseumUi(path.museumId) : undefined;

  const facadeLayout = useMemo(() => {
    if (!museumUi) {
      return { width: facadeWidth, height: facadeWidth * (FACADE_NATIVE_H / FACADE_NATIVE_W), x: 0, y: 0, scale: 1 };
    }
    const availTop = facadeTrailBottom + 16;
    const availBottom = facadeCardTop - 24;
    return fitFacadeLayout(
      facadeWidth,
      availTop,
      availBottom,
      museumUi.buildingTopY,
      museumUi.groundY,
    );
  }, [facadeCardTop, facadeTrailBottom, facadeWidth, museumUi]);

  useEffect(() => {
    if (phase !== "facade" && phase !== "entering") return;
    const root = facadeRootRef.current;
    if (!root) return;
    const measure = () => {
      const card = facadeCardRef.current;
      const trail = facadeTrailRef.current;
      const rootRect = root.getBoundingClientRect();
      setFacadeWidth(rootRect.width || FRAME.w);
      if (trail) {
        setFacadeTrailBottom(trail.getBoundingClientRect().bottom - rootRect.top);
      }
      if (!card) return;
      const cardRect = card.getBoundingClientRect();
      setFacadeCardTop(cardRect.top - rootRect.top);
    };
    measure();
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    const card = facadeCardRef.current;
    if (card) ro.observe(card);
    const trail = facadeTrailRef.current;
    if (trail) ro.observe(trail);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [phase, path?.museumId]);

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
        if (showDot && tFlight > 0 && tFlight < 1) {
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

  /** Flight camera: follow the dot while easing 07 → locked 09 (scale 6.22, focus 208×356). */
  const camForFlightT = useCallback(
    (t: number, stageW: number, stageH: number, cam09: CameraTransform): CameraTransform => {
      const c0 = toStageCam07(cam07Design, stageW, stageH);
      const startFocus = cameraProjectPoint(startPt, c0);
      const focusX = startFocus.x + (ZOOM_FOCUS.x - startFocus.x) * t;
      const focusY = startFocus.y + (ZOOM_FOCUS.y - startFocus.y) * t;
      const scale = c0.scale + (cam09.scale - c0.scale) * t;
      const dot = pointOnQuad(startPt, ctrl, targetPt, t);
      return cameraPlaceAt(dot, scale, focusX, focusY);
    },
    [cam07Design, ctrl, startPt, targetPt],
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

  // Place overlay pins once they mount
  useEffect(() => {
    if (!showStartPin && !showTargetPin) return;
    writeOverlay(readCam(), flightT.get(), phaseRef.current === "flight");
  }, [flightT, readCam, showStartPin, showTargetPin, writeOverlay]);

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
    const cam = toStageCam07(camera07(), stageSize.w, stageSize.h);
    setCam(cam);
    flightT.set(0);
    glowOpacity.set(0);
    writeOverlay(cam, 0, false);
    if (reduced) {
      mapOpacity.set(1);
      glowOpacity.set(1);
      setShowStartPin(true);
      setArcDrawn(true);
      setShowTargetPin(true);
      if (autoFlight) {
        setSheetVisible(false);
        scheduleEntry(() => runFlightRef.current(), 0);
      } else {
        setSheetVisible(true);
      }
      return;
    }
    // Absolute timeline ≈ 2.8s — no nested onComplete / extra gaps
    mapOpacity.set(0);
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
    if (autoFlight) {
      // Pins + arc ready, then fly — no screen-02 sheet
      scheduleEntry(() => runFlightRef.current(), ENTRY_T_SHEET);
    } else {
      scheduleEntry(() => setSheetVisible(true), ENTRY_T_SHEET);
    }
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

      // Consecutive paths in the same museum → hall directly (no map).
      if (pathN == null && shouldSkipMapToHall(completedPaths, picked)) {
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

      const confirm = picked.n === 1 && !autostart;
      const autoFlight = !confirm;
      setShowPathConfirm(confirm);

      const origin = getPathOrigin(startCityId, picked);
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

  const goFacade = useCallback(() => {
    if (facadeTimer.current) clearTimeout(facadeTimer.current);
    setOccupationNote(false);
    setPhase("facade");
    setFacadeOpacity(0);
    facadeScale.set(1.05);
    if (reduced) {
      setFacadeOpacity(1);
      facadeScale.set(1);
      return;
    }
    animate(facadeScale, 1, { duration: motionTokens.facadeScale, ease: easings.easeOut });
    const t0 = performance.now();
    const fade = () => {
      const p = Math.min(1, (performance.now() - t0) / (motionTokens.facadeCrossfade * 1000));
      setFacadeOpacity(p);
      if (p < 1) requestAnimationFrame(fade);
    };
    requestAnimationFrame(fade);
  }, [facadeScale, reduced]);

  const afterZoom = useCallback(() => {
    const occupied = Boolean(path?.museum.occupied);
    if (occupied && !reduced) {
      setPhase("occupation");
      setOccupationNote(true);
      facadeTimer.current = setTimeout(() => goFacade(), OCCUPATION_HOLD_MS);
    } else {
      facadeTimer.current = setTimeout(() => goFacade(), FACADE_AUTO_MS);
    }
  }, [goFacade, path, reduced]);

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
    // Lock full-screen stage + 09 camera once (header/sheet are overlays — no reflow).
    const el = mapStageRef.current;
    const w = el?.clientWidth || stageSize.w || FRAME.w;
    const h = el?.clientHeight || stageSize.h || FRAME.h;
    lockedStageRef.current = { w, h };
    lockedCam09Ref.current = stageCam09(targetPt);
    journeyLockedRef.current = true;
    setStageSize({ w, h });

    const hadSheet = sheetVisible;
    setSheetVisible(false);
    setPhase("flight");
    flightT.set(0);
    mapOpacity.set(1);

    const cam09 = lockedCam09Ref.current;

    const startFlight = () => {
      if (reduced) {
        setCam(cam09);
        flightT.set(1);
        writeOverlay(cam09, 1, false);
        setTimeout(() => runZoom(), motionTokens.reducedCrossfade * 1000);
        return;
      }
      animate(flightT, 1, {
        duration: motionTokens.flight,
        ease: easings.easeInOut,
        onUpdate: (t) => {
          const cam = camForFlightT(t, w, h, cam09);
          setCam(cam);
        },
        onComplete: () => {
          // Same transform as the last flight frame — no snap.
          setCam(cam09);
          writeOverlay(cam09, 1, false);
          runZoom();
        },
      });
    };

    // Wait for sheet hide only when the path-1 sheet was visible
    setTimeout(
      startFlight,
      reduced || !hadSheet ? 0 : motionTokens.sheetHide * 1000,
    );
  }, [
    camForFlightT,
    flightT,
    mapOpacity,
    reduced,
    runZoom,
    setCam,
    sheetVisible,
    stageSize.h,
    stageSize.w,
    targetPt,
    writeOverlay,
  ]);

  useEffect(() => {
    runFlightRef.current = runFlight;
  }, [runFlight]);

  const enterDoor = useCallback(() => {
    if (!path || !museumUi) return;
    setPhase("entering");
    if (reduced) {
      setBlackout(1);
      router.push(`/hall/${path.museumId}?path=${path.n}&artwork=${path.artworkId}`);
      return;
    }
    animate(doorCamScale, 1.3, {
      duration: motionTokens.doorEnter,
      ease: easings.easeIn,
    });
    const t0 = performance.now();
    const fade = () => {
      const p = Math.min(1, (performance.now() - t0) / (motionTokens.doorEnter * 1000));
      setBlackout(p);
      if (p < 1) requestAnimationFrame(fade);
      else router.push(`/hall/${path.museumId}?path=${path.n}&artwork=${path.artworkId}`);
    };
    requestAnimationFrame(fade);
  }, [doorCamScale, museumUi, path, reduced, router]);

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
              <image href="/map/map.svg" width={vb.w} height={vb.h} />
              {/* Dotted start → target (map phase); flight keeps trail overlay */}
              {phase === "map" && arcDrawn ? (
                <DottedRoute
                  start={startPt}
                  ctrl={ctrl}
                  end={targetPt}
                  routeKey={`path-${path?.n ?? 0}-${path?.museumId ?? ""}`}
                  opacity={0.6}
                />
              ) : null}
              {/* Constellation: visited museums in journey order */}
              {phase === "map" && !hideFarLabels && visitedOrder.length >= 2
                ? visitedOrder.slice(0, -1).map((id, i) => {
                    const nextId = visitedOrder[i + 1]!;
                    const aM = getMuseum(id);
                    const bM = getMuseum(nextId);
                    if (!aM || !bM) return null;
                    const a = projectToMap(aM.lat, aM.lng);
                    const b = projectToMap(bM.lat, bM.lng);
                    return (
                      <DottedRoute
                        key={`const-${id}-${nextId}`}
                        start={a}
                        ctrl={arcControl(a, b)}
                        end={b}
                        opacity={0.25}
                        animateDraw={false}
                        routeKey={`const-${id}-${nextId}`}
                      />
                    );
                  })
                : null}
              {phase === "map" && !hideFarLabels
                ? visitedOrder.map((id) => {
                    if (id === path?.museumId) return null;
                    const m = getMuseum(id);
                    if (!m) return null;
                    const p = projectToMap(m.lat, m.lng);
                    return (
                      <MapStar
                        key={`vis-${id}`}
                        x={p.x}
                        y={p.y}
                        size={14}
                        label={m.city}
                        labelSide={id === "lviv" ? "left" : "right"}
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
                    return (
                      <MuseumDot
                        key={m.id}
                        x={p.x}
                        y={p.y}
                        label={m.city}
                        labelSide={m.id === "lviv" ? "left" : "right"}
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

            <g ref={targetPinRef} opacity={showTargetPin ? 1 : 0}>
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
            exit={{ y: "100%" }}
            transition={{ duration: motionTokens.sheetSlide, ease: easings.easeOut }}
          >
            <h2 className="text-h2">
              Твій шлях — {getMuseumShortLabel(path.museumId)}
            </h2>
            <p className="mt-sm text-body-md text-text-secondary">
              {originAbroad
                ? `Звідти, де ти зараз. ${pathSheetBlurb(path.museumId)}`
                : `≈ ${distanceKm} км від тебе. ${pathSheetBlurb(path.museumId)}`}
            </p>
            <div className="mt-lg">
              <Button onClick={runFlight}>Вирушити</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Facade 11 — native aspect, shifted so groundY sits just above the card */}
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
            className="absolute inset-0"
            style={{
              scale: phase === "entering" ? doorCamScale : facadeScale,
              transformOrigin: `${museumUi.doorX}% ${museumUi.doorY}%`,
              backgroundColor: museumUi.facadeFill,
            }}
          >
            {phase === "facade" ? (
              <button
                type="button"
                aria-label="Зайти в музей"
                onClick={enterDoor}
                className="absolute z-[1] cursor-pointer border-0 bg-transparent p-0"
                style={{
                  left: facadeLayout.x,
                  top: facadeLayout.y,
                  width: facadeLayout.width,
                  height: facadeLayout.height,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={museumUi.facadeSrc}
                  alt=""
                  className="block size-full max-w-none"
                  draggable={false}
                />
              </button>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={museumUi.facadeSrc}
                alt=""
                className="absolute block max-w-none"
                style={{
                  left: facadeLayout.x,
                  top: facadeLayout.y,
                  width: facadeLayout.width,
                  height: facadeLayout.height,
                }}
                draggable={false}
              />
            )}
          </motion.div>

          {phase === "facade" && trailItems ? (
            <RouteTrail
              items={trailItems}
              style={{ left: 24, top: 76 }}
              ref={facadeTrailRef}
            />
          ) : null}

          {phase === "facade" && (
            <motion.div
              ref={facadeCardRef}
              className="absolute inset-x-0 bottom-0 z-20 rounded-t-lg border-t border-border-subtle bg-surface px-xl pb-[calc(24px+var(--safe-bottom))] pt-xl"
              initial={reduced ? false : { y: "100%" }}
              animate={{ y: 0 }}
              transition={{ duration: motionTokens.sheetSlide, ease: easings.easeOut }}
              onAnimationComplete={() => {
                const root = facadeRootRef.current;
                const card = facadeCardRef.current;
                if (!root || !card) return;
                const rootRect = root.getBoundingClientRect();
                const cardRect = card.getBoundingClientRect();
                setFacadeCardTop(cardRect.top - rootRect.top);
              }}
            >
              <p className="text-overline uppercase text-text-accent">Ласкаво просимо</p>
              <h2 className="mt-md text-h2">{getMuseumDisplayName(path.museumId)}</h2>
              <p className="mt-sm text-body-md text-text-secondary">
                Двері відчинені. Усередині на тебе чекає твір.
              </p>
              <div className="mt-lg">
                <Button onClick={enterDoor}>Зайти всередину</Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

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

