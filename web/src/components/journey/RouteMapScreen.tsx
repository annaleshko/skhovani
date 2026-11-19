"use client";

import { Button } from "@/components/ui";
import { DottedRoute } from "@/components/map/DottedRoute";
import { MapLandArt } from "@/components/map/MapLandArt";
import { MapMuseumHits } from "@/components/map/MapMuseumHits";
import { MapPin } from "@/components/map/MapPin";
import { MapStar } from "@/components/map/MapStar";
import { MuseumDot } from "@/components/map/MuseumDot";
import { RestartJourneyLink } from "@/components/journey/RestartJourneyLink";
import { getMuseum } from "@/data";
import {
  ALL_DONE_COPY,
  getPath,
  getLastOpenedPathInMuseum,
  getNextPathInMuseum,
  getPathOrigin,
  getVisitedMuseumOrder,
  isMuseumPassed,
  type ResolvedPath,
} from "@/data/journey";
import {
  JOURNEY_MUSEUM_ORDER,
  routeSheetBlurbForPath,
} from "@/data/museum-copy";
import { getMuseumShortLabel } from "@/data/museums";
import { camera07 } from "@/lib/camera";
import {
  arcControl,
  getMapViewBox,
  haversineKm,
  projectToMap,
} from "@/lib/geo";
import { layoutMapLabels, type MapLabelMarker } from "@/lib/map-label";
import {
  defaultSpring,
  easings,
  motionTokens,
  useReducedMotionSafe,
} from "@/lib/motion";
import { useAppState } from "@/state/AppState";
import { resetHomeHref } from "@/state/storage";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const FRAME = { w: 390, h: 844 };

type Props = {
  open: boolean;
  /** Journey-order next path when the screen opens. */
  next: ResolvedPath | null;
  onDepart: (path: ResolvedPath) => void;
  /**
   * Star museum tap (already opened) — flight without sheet.
   * `reopen` when all museum paths are done (hall shows last opened, revealed).
   */
  onRevisit?: (path: ResolvedPath, opts: { reopen: boolean }) => void;
};

/** Same 07 framing as JourneyFlow flight frame 0. */
function toStageCam07(stageW: number, stageH: number) {
  const cam = camera07();
  const sx = stageW / FRAME.w;
  const sy = stageH / FRAME.h;
  return { tx: cam.tx * sx, ty: cam.ty * sy, scale: cam.scale * sx };
}

/**
 * screenв — design
 * Origin = start city; rays to visited; target = bright dotted route.
 */
export function RouteMapScreen({ open, next, onDepart, onRevisit }: Props) {
  const router = useRouter();
  const reduced = useReducedMotionSafe();
  const { completedPaths, startCityId, resetAll } = useAppState();
  const vb = getMapViewBox();
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [sheetExit, setSheetExit] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const mapStageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: FRAME.w, h: FRAME.h });

  const defaultMuseumId = next?.museumId ?? JOURNEY_MUSEUM_ORDER[0];
  /** null = follow journey-order next; set when the user taps a museum. */
  const [pickedMuseumId, setPickedMuseumId] = useState<string | null>(null);
  const selectedMuseumId = pickedMuseumId ?? defaultMuseumId;

  const sheetPath = useMemo(
    () => getNextPathInMuseum(selectedMuseumId, completedPaths) ?? null,
    [completedPaths, selectedMuseumId],
  );

  const journeyDone =
    completedPaths.length > 0 &&
    !next &&
    JOURNEY_MUSEUM_ORDER.every(
      (id) => !getNextPathInMuseum(id, completedPaths),
    );

  const origin = useMemo(() => {
    const pathForOrigin = sheetPath ?? next ?? getPath(1);
    if (!pathForOrigin) {
      return getPathOrigin(startCityId, getPath(1)!);
    }
    return getPathOrigin(startCityId, pathForOrigin);
  }, [next, sheetPath, startCityId]);

  const startPt = useMemo(
    () => projectToMap(origin.city.lat, origin.city.lng),
    [origin.city.lat, origin.city.lng],
  );

  const targetMuseum = getMuseum(selectedMuseumId);
  const targetPt = useMemo(() => {
    if (!targetMuseum) return startPt;
    return projectToMap(targetMuseum.lat, targetMuseum.lng);
  }, [startPt, targetMuseum]);

  const distanceKm = useMemo(() => {
    if (!targetMuseum) return 0;
    return haversineKm(origin.city, targetMuseum);
  }, [origin.city, targetMuseum]);

  const visitedOrder = useMemo(
    () => getVisitedMuseumOrder(completedPaths),
    [completedPaths],
  );
  const visitedSet = useMemo(() => new Set(visitedOrder), [visitedOrder]);

  const ctrl = useMemo(
    () => arcControl(startPt, targetPt),
    [startPt, targetPt],
  );

  const labelLayout = useMemo(() => {
    const markers: MapLabelMarker[] = [];
    for (const id of JOURNEY_MUSEUM_ORDER) {
      const m = getMuseum(id);
      if (!m) continue;
      const p = projectToMap(m.lat, m.lng);
      markers.push({ id, x: p.x, y: p.y, label: m.city });
    }
    return layoutMapLabels(markers);
  }, []);

  const hitTargets = useMemo(() => {
    return JOURNEY_MUSEUM_ORDER.map((id) => {
      const m = getMuseum(id);
      if (!m) return null;
      const p = projectToMap(m.lat, m.lng);
      return { id, x: p.x, y: p.y, label: m.city };
    }).filter((t): t is NonNullable<typeof t> => Boolean(t));
  }, []);

  useEffect(() => {
    const el = mapStageRef.current;
    if (!el) return;
    const measure = () => {
      setStageSize({
        w: el.clientWidth || FRAME.w,
        h: el.clientHeight || FRAME.h,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  const mapCam = useMemo(
    () => toStageCam07(stageSize.w, stageSize.h),
    [stageSize.h, stageSize.w],
  );

  const handleDepart = (path: ResolvedPath) => {
    if (sheetExit) return;
    // Sheet slides down while JourneyFlow mounts with the same cam07.
    setSheetExit(true);
    onDepart(path);
  };

  const onMuseumTap = (id: string) => {
    if (sheetExit) return;
    // Museum tap → free-explore hall (not «Вирушити»).
    if (onRevisit) {
      const nextIn = getNextPathInMuseum(id, completedPaths);
      if (nextIn) {
        onRevisit(nextIn, { reopen: false });
        return;
      }
      const last = getLastOpenedPathInMuseum(id, completedPaths);
      if (last) {
        onRevisit(last, { reopen: true });
        return;
      }
    }
    setPickedMuseumId(id);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={rootRef}
          className="absolute inset-0 z-40 flex flex-col bg-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: motionTokens.mapFadeIn }}
        >
          <header className="relative z-50 shrink-0 px-xl pt-[calc(56px+var(--safe-top))]">
            <h1 className="text-h1">Твій маршрут</h1>
            <p className="mt-sm text-body-md text-text-secondary">
              10 творів у 5 музеях. Тапни на будь-який музей.
            </p>
          </header>

          {/* Full-screen map stage — identical 07 camera as JourneyFlow frame 0. */}
          <div ref={mapStageRef} className="pointer-events-none absolute inset-0">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[42%] h-[55%] w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse at center, color-mix(in srgb, var(--color-bg-accent) 35%, transparent), transparent 70%)",
              }}
            />
            <div
              className="absolute left-0 top-0"
              style={{
                width: vb.w,
                height: vb.h,
                transform: `translate(${mapCam.tx}px, ${mapCam.ty}px) scale(${mapCam.scale})`,
                transformOrigin: "0 0",
              }}
            >
              <svg
                viewBox={`0 0 ${vb.w} ${vb.h}`}
                width={vb.w}
                height={vb.h}
                className="block"
                role="img"
                aria-label="Карта маршруту музеями"
              >
                <MapLandArt />

                {visitedOrder.map((id) => {
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
                })}

                {targetMuseum ? (
                  <DottedRoute
                    start={startPt}
                    ctrl={ctrl}
                    end={targetPt}
                    dot={2}
                    gap={6}
                    opacity={0.85}
                    routeKey={`sel-${selectedMuseumId}`}
                  />
                ) : null}

                <MapPin
                  x={startPt.x}
                  y={startPt.y}
                  label={origin.abroad ? "Ти" : origin.city.name}
                  variant="start"
                />

                {visitedOrder.map((id) => {
                  if (id === selectedMuseumId) return null;
                  const m = getMuseum(id);
                  if (!m) return null;
                  const p = projectToMap(m.lat, m.lng);
                  const place = labelLayout.get(id);
                  return (
                    <MapStar
                      key={`vis-${id}`}
                      x={p.x}
                      y={p.y}
                      size={14}
                      label={m.city}
                      labelSide={place?.side ?? "right"}
                      labelDy={place?.dy ?? 0}
                      glow="soft"
                      labelTone="secondary"
                    />
                  );
                })}

                {JOURNEY_MUSEUM_ORDER.map((id) => {
                  if (id === selectedMuseumId || visitedSet.has(id)) return null;
                  const m = getMuseum(id);
                  if (!m) return null;
                  const p = projectToMap(m.lat, m.lng);
                  const place = labelLayout.get(id);
                  return (
                    <MuseumDot
                      key={id}
                      x={p.x}
                      y={p.y}
                      label={m.city}
                      labelSide={place?.side ?? "right"}
                      labelDy={place?.dy ?? 0}
                      tone="dim"
                    />
                  );
                })}

                {targetMuseum ? (
                  visitedSet.has(selectedMuseumId) ? (
                    <MapStar
                      key={`target-${selectedMuseumId}`}
                      x={targetPt.x}
                      y={targetPt.y}
                      size={22}
                      label={targetMuseum.city}
                      labelSide={
                        labelLayout.get(selectedMuseumId)?.side ?? "right"
                      }
                      labelDy={labelLayout.get(selectedMuseumId)?.dy ?? 0}
                      glow="strong"
                      labelTone="primary"
                      pulsing={!reduced}
                      appear
                    />
                  ) : (
                    <MapPin
                      key={`target-${selectedMuseumId}`}
                      x={targetPt.x}
                      y={targetPt.y}
                      label={targetMuseum.city}
                      labelSide={
                        labelLayout.get(selectedMuseumId)?.side === "left"
                          ? "left"
                          : "right"
                      }
                      labelDy={labelLayout.get(selectedMuseumId)?.dy ?? 0}
                      variant="target"
                      pulsing={!reduced}
                      appear
                    />
                  )
                ) : null}
              </svg>
              <MapMuseumHits
                className="pointer-events-auto absolute inset-0 z-[1]"
                targets={hitTargets}
                onSelect={onMuseumTap}
              />
            </div>
          </div>

          <motion.div
            className="relative z-50 mt-auto shrink-0 rounded-t-lg border-t border-border-subtle bg-surface px-xl pb-[calc(24px+var(--safe-bottom))] pt-xl"
            initial={{ y: "100%" }}
            animate={{ y: sheetExit ? "100%" : 0 }}
            transition={
              sheetExit
                ? { duration: motionTokens.sheetHide, ease: easings.easeIn }
                : defaultSpring
            }
          >
            {journeyDone ? (
              <>
                <h2 className="text-h2">{ALL_DONE_COPY.title}</h2>
                {/* * * */}
                <p className="mt-sm text-body-md text-text-secondary">
                  {ALL_DONE_COPY.body}
                </p>
                <div className="mt-lg flex flex-col gap-sm">
                  {confirmRestart ? (
                    <>
                      <p className="text-body-md text-text-secondary">
                        Почати шлях спочатку? Прогрес буде скинуто.
                      </p>
                      <Button
                        onClick={() => {
                          resetAll();
                          router.replace(resetHomeHref());
                        }}
                      >
                        Так, почати
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setConfirmRestart(false)}
                      >
                        Скасувати
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setConfirmRestart(true)}>
                      {ALL_DONE_COPY.cta}
                    </Button>
                  )}
                </div>
              </>
            ) : sheetPath ? (
              <>
                <h2 className="text-h2">
                  Далі — {getMuseumShortLabel(sheetPath.museumId)}
                </h2>
                <p className="mt-sm text-body-md text-text-secondary">
                  ≈ {distanceKm} км від тебе.{" "}
                  {routeSheetBlurbForPath(sheetPath)}
                </p>
                <div className="mt-lg flex flex-col items-stretch">
                  <Button
                    onClick={() => handleDepart(sheetPath)}
                    disabled={sheetExit}
                  >
                    Вирушити
                  </Button>
                  <RestartJourneyLink />
                </div>
              </>
            ) : (
              <>
                <h2 className="text-h2">
                  Далі — {getMuseumShortLabel(selectedMuseumId)}
                </h2>
                <p className="mt-sm text-body-md text-text-secondary">
                  {isMuseumPassed(selectedMuseumId, completedPaths)
                    ? "Усі твори в цьому музеї вже відкриті. Обери інший музей на карті."
                    : "Обери музей на карті."}
                </p>
                <div className="mt-lg flex flex-col items-stretch">
                  <RestartJourneyLink />
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
