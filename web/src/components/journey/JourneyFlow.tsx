"use client";

import { Button } from "@/components/ui";
import { MapPin } from "@/components/map/MapPin";
import { getMuseums } from "@/data";
import { getDemoStartCity } from "@/data/demo-user";
import {
  getMuseumDisplayName,
  getMuseumShortLabel,
  getMuseumUi,
} from "@/data/museums";
import { getPath, type ResolvedPath } from "@/data/journey";
import {
  camera07,
  camera09,
  cameraPlaceAt,
  cameraProjectPoint,
  FRAME,
  MAP_07,
  ZOOM_FOCUS,
  type CameraTransform,
} from "@/lib/camera";
import {
  arcControl,
  getMapViewBox,
  haversineKm,
  pointOnQuad,
  projectToMap,
  quadPath,
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
  useTransform,
} from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RouteTrail, type TrailItem } from "./RouteTrail";
import { pickPath } from "./pickPath";

type Phase =
  | "boot"
  | "e1"
  | "map"
  | "flight"
  | "zoom"
  | "occupation"
  | "facade"
  | "entering";

type Props = {
  pathN?: number;
};

const E1_THRESHOLD_MS = 400;
/** Only wait when a real async pick is slow — no artificial delay that always triggers E1 */
const PICK_DELAY_MS = 0;
const FACADE_AUTO_MS = 600;
const OCCUPATION_HOLD_MS = 2500;
const DOOR_HINT = { x: 122, y: 456 } as const;
const TRAIL_LEN = 18;
/** Spec 07 entry timeline (ms from enterMap start) */
const ENTRY_FADE_MS = motionTokens.mapFadeIn * 1000; // 600
const ENTRY_PIN_MS = 400;
const ENTRY_ARC_MS = motionTokens.arcDraw * 1000; // 1200
const ENTRY_TARGET_MS = 300;
const ENTRY_T_PIN = ENTRY_FADE_MS;
const ENTRY_T_ARC = ENTRY_T_PIN + ENTRY_PIN_MS;
const ENTRY_T_TARGET = ENTRY_T_ARC + ENTRY_ARC_MS;
const ENTRY_T_SHEET = ENTRY_T_TARGET + ENTRY_TARGET_MS; // ≈ 2500 → sheet slide 300 ≈ 2.8s
const GLOW_R_07 = 100; // Ø 200
const GLOW_R_09 = 160; // Ø 320
const vb = getMapViewBox();

/** Design-space camera → stage pixels (width drives scale). */
function toStageCam(
  cam: CameraTransform,
  stageW: number,
  stageH: number,
): CameraTransform {
  const sx = stageW / FRAME.w;
  const sy = stageH / FRAME.h;
  return { tx: cam.tx * sx, ty: cam.ty * sy, scale: cam.scale * sx };
}

function toStagePt(pt: { x: number; y: number }, stageW: number, stageH: number) {
  return { x: pt.x * (stageW / FRAME.w), y: pt.y * (stageH / FRAME.h) };
}

export function JourneyFlow({ pathN }: Props) {
  const router = useRouter();
  const reduced = useReducedMotionSafe();
  const { user, completedPaths, setCurrentPath } = useAppState();
  const startCity = getDemoStartCity();

  const [phase, setPhase] = useState<Phase>("boot");
  const [path, setPath] = useState<ResolvedPath | null>(null);
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

  const cam07Design = useMemo(() => camera07(), []);
  const initialStageCam = useMemo(
    () => toStageCam(cam07Design, FRAME.w, FRAME.h),
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
  /** Keep arc ~2px on screen under CSS transform scale */
  const arcStrokeWidth = useTransform(camScale, (s) => 2 / Math.max(s, 0.001));

  const facadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entryTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mapStageRef = useRef<HTMLDivElement>(null);
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
  const arcD = useMemo(() => quadPath(startPt, ctrl, targetPt), [startPt, ctrl, targetPt]);

  const distanceKm = useMemo(() => {
    if (!path) return 0;
    return haversineKm(startCity, path.museum);
  }, [path, startCity]);

  const museumUi = path ? getMuseumUi(path.museumId) : undefined;
  const artworkCount = path?.museum.artworkIds.length ?? 0;

  const cam09Design = useMemo(() => camera09(targetPt), [targetPt]);

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

  /** Flight camera: follow the dot while easing 07 → 09. */
  const camForFlightT = useCallback(
    (t: number, stageW: number, stageH: number): CameraTransform => {
      const c0 = toStageCam(cam07Design, stageW, stageH);
      const c1 = toStageCam(cam09Design, stageW, stageH);
      const startFocus = cameraProjectPoint(startPt, c0);
      const focus9 = toStagePt(ZOOM_FOCUS, stageW, stageH);
      const focusX = startFocus.x + (focus9.x - startFocus.x) * t;
      const focusY = startFocus.y + (focus9.y - startFocus.y) * t;
      const scale = c0.scale + (c1.scale - c0.scale) * t;
      const dot = pointOnQuad(startPt, ctrl, targetPt, t);
      return cameraPlaceAt(dot, scale, focusX, focusY);
    },
    [cam07Design, cam09Design, ctrl, startPt, targetPt],
  );

  useEffect(() => {
    const el = mapStageRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth || FRAME.w;
      const h = el.clientHeight || FRAME.h;
      setStageSize({ w, h });
      const p = phaseRef.current;
      if (p === "map" || p === "boot" || p === "e1") {
        const cam = toStageCam(camera07(), w, h);
        setCam(cam);
        writeOverlay(cam, 0, false);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [setCam, writeOverlay]);

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

  const enterMap = useCallback(() => {
    clearEntryTimers();
    setPhase("map");
    const cam = toStageCam(camera07(), stageSize.w, stageSize.h);
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
      setSheetVisible(true);
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
    const started = performance.now();
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
      const elapsed = performance.now() - started;
      if (!picked) {
        router.replace("/");
        return;
      }
      setPath(picked);
      setCurrentPath(picked.n);

      if (elapsed > E1_THRESHOLD_MS && !reduced) {
        setPhase("e1");
        setTimeout(() => {
          if (!cancelled) enterMap();
        }, 900);
      } else {
        enterMap();
      }
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
    const end = toStageCam(cam09Design, stageSize.w, stageSize.h);
    if (reduced) {
      setCam(end);
      glowOpacity.set(1);
      writeOverlay(end, 1, false);
      afterZoom();
      return;
    }
    // Stronger glow fades in over the zoom
    glowOpacity.set(0.35);
    animate(glowOpacity, 1, {
      duration: motionTokens.zoomCity,
      ease: easings.easeOut,
    });
    const opts = {
      duration: motionTokens.zoomCity,
      ease: easings.easeInOut,
    } as const;
    animate(camX, end.tx, opts);
    animate(camY, end.ty, opts);
    animate(camScale, end.scale, {
      ...opts,
      onComplete: () => {
        writeOverlay(end, 1, false);
        afterZoom();
      },
    });
  }, [
    afterZoom,
    cam09Design,
    camScale,
    camX,
    camY,
    flightT,
    glowOpacity,
    reduced,
    setCam,
    stageSize.h,
    stageSize.w,
    writeOverlay,
  ]);

  const runFlight = useCallback(() => {
    setSheetVisible(false);
    setPhase("flight");
    flightT.set(0);
    // Map stays visible — opacity already 1; no layout change
    mapOpacity.set(1);

    const startFlight = () => {
      if (reduced) {
        const end = toStageCam(cam09Design, stageSize.w, stageSize.h);
        setCam(end);
        flightT.set(1);
        writeOverlay(end, 1, false);
        setTimeout(() => runZoom(), motionTokens.reducedCrossfade * 1000);
        return;
      }
      const w = stageSize.w;
      const h = stageSize.h;
      animate(flightT, 1, {
        duration: motionTokens.flight,
        ease: easings.easeInOut,
        onUpdate: (t) => {
          const cam = camForFlightT(t, w, h);
          setCam(cam);
        },
        onComplete: () => {
          const end = toStageCam(cam09Design, w, h);
          setCam(end);
          writeOverlay(end, 1, false);
          runZoom();
        },
      });
    };

    // Wait for sheet hide, then fly — map never unmounts / reflows
    setTimeout(startFlight, reduced ? 0 : motionTokens.sheetHide * 1000);
  }, [
    cam09Design,
    camForFlightT,
    flightT,
    mapOpacity,
    reduced,
    runZoom,
    setCam,
    stageSize.h,
    stageSize.w,
    writeOverlay,
  ]);

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
      <AnimatePresence>
        {phase === "e1" && (
          <motion.div
            className="absolute inset-0 z-30 flex flex-col items-center justify-center px-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="relative mb-2xl h-40 w-full max-w-[280px]">
              <svg viewBox={`0 0 ${vb.w} ${vb.h}`} className="h-full w-full opacity-40">
                <image href="/map/map.svg" width={vb.w} height={vb.h} />
                <MapPin x={startPt.x} y={startPt.y} label={startCity.name} pulsing />
              </svg>
            </div>
            <p className="text-h3 text-text-primary">Будуємо шлях…</p>
            <p className="mt-sm text-center text-body-md text-text-secondary">
              Шукаємо, куди сьогодні веде твій шлях
            </p>
          </motion.div>
        )}
      </AnimatePresence>

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
              <motion.path
                d={arcD}
                fill="none"
                stroke="var(--color-bg-accent)"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={arcDrawn || phase !== "map" ? 0 : 1}
                style={{
                  strokeWidth: arcStrokeWidth,
                  transition: reduced
                    ? "none"
                    : `stroke-dashoffset ${motionTokens.arcDraw}s ease-in-out`,
                }}
              />
              {debugMap &&
                getMuseums().map((m) => {
                  const p = projectToMap(m.lat, m.lng);
                  return (
                    <g key={m.id} transform={`translate(${p.x} ${p.y})`}>
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
                label={startCity.name}
                variant="start"
                pulsing={phase === "map" && !reduced}
              />
            </g>

            <g ref={targetPinRef} opacity={showTargetPin ? 1 : 0}>
              <MapPin
                x={0}
                y={0}
                label={path.museum.city}
                labelSide="right"
                variant="target"
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

      {/* Header — above map, does not affect map layout */}
      {phase === "map" && (
        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-xl pb-md pt-[calc(56px+var(--safe-top))]">
          <h1 className="text-h1">Привіт, {user.nameVocative}</h1>
          <p className="mt-sm text-body-md text-text-secondary">
            Карта поки темна. Кожен твір, якому ти повернеш світло, засвітиться на ній зіркою.
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
        {sheetVisible && phase === "map" && (
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
              ≈ {distanceKm} км від тебе. У {shortMuseumPhrase(path.museumId)}{" "}
              {artworkCount} {worksWord(artworkCount)} чекають на тебе.
            </p>
            <div className="mt-lg">
              <Button onClick={runFlight}>Летимо</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Facade 11 — unchanged look */}
      {(phase === "facade" || phase === "entering") && museumUi && (
        <motion.div
          className="absolute inset-0 z-40 overflow-hidden bg-screen"
          style={{ opacity: Math.max(facadeOpacity, phase === "entering" ? 1 : facadeOpacity) }}
        >
          <motion.div
            className="absolute left-0 w-full overflow-hidden"
            style={{
              top: 119,
              height: 629,
              scale: phase === "entering" ? doorCamScale : facadeScale,
              transformOrigin: `${museumUi.doorX}% ${museumUi.doorY}%`,
            }}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {museumUi.facadeImageHeight && museumUi.facadeImageTop ? (
                <Image
                  src={museumUi.facadeSrc}
                  alt=""
                  width={778}
                  height={1258}
                  priority
                  className="absolute left-0 w-full max-w-none"
                  style={{
                    height: museumUi.facadeImageHeight,
                    width: "100%",
                    top: museumUi.facadeImageTop,
                    objectFit: "cover",
                    objectPosition: museumUi.facadeObjectPosition,
                  }}
                  sizes="(max-width: 430px) 100vw, 430px"
                />
              ) : (
                <Image
                  src={museumUi.facadeSrc}
                  alt=""
                  fill
                  priority
                  className="object-cover"
                  style={{ objectPosition: museumUi.facadeObjectPosition }}
                  sizes="(max-width: 430px) 100vw, 430px"
                />
              )}
            </div>
            {phase === "facade" && (
              <button
                type="button"
                aria-label="Торкнись дверей"
                onClick={enterDoor}
                className="absolute z-[1] -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${museumUi.doorX}%`,
                  top: `${museumUi.doorY}%`,
                  width: 72,
                  height: 96,
                }}
              />
            )}
          </motion.div>

          {phase === "facade" && trailItems ? (
            <RouteTrail items={trailItems} style={{ left: 24, top: 76 }} />
          ) : null}

          {phase === "facade" && (
            <>
              <button
                type="button"
                aria-label="Торкнись дверей"
                onClick={enterDoor}
                className="absolute z-30 flex items-center gap-2xs"
                style={{ left: DOOR_HINT.x, top: DOOR_HINT.y }}
              >
                <span className="relative flex size-8 items-center justify-center">
                  {!reduced && (
                    <span className="absolute inset-0 animate-ping rounded-full border-2 border-accent opacity-40" />
                  )}
                  <span className="absolute inset-0 rounded-full border-2 border-accent" />
                  <span className="size-2.5 rounded-full bg-accent" />
                </span>
                <span className="text-label-md text-text-primary">Торкнись дверей</span>
              </button>

              <motion.div
                className="absolute inset-x-0 bottom-0 z-20 rounded-t-lg border-t border-border-subtle bg-surface px-xl pb-[calc(24px+var(--safe-bottom))] pt-xl"
                initial={reduced ? false : { y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: motionTokens.sheetSlide, ease: easings.easeOut }}
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
            </>
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

function worksWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "твір";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "твори";
  return "творів";
}

function shortMuseumPhrase(museumId: string): string {
  // TODO(copy): proper locative forms
  if (museumId === "kherson") return "Херсонському художньому музеї";
  if (museumId === "melitopol") return "Мелітопольському музеї";
  if (museumId === "kharkiv") return "Харківському художньому музеї";
  if (museumId === "lviv") return "Національному музеї у Львові";
  if (museumId === "chernihiv") return "Чернігівському художньому музеї";
  return getMuseumDisplayName(museumId);
}
