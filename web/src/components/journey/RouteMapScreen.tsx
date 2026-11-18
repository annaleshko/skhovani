"use client";

import { Button } from "@/components/ui";
import { DottedRoute } from "@/components/map/DottedRoute";
import { MapPin } from "@/components/map/MapPin";
import { MapStar } from "@/components/map/MapStar";
import { MuseumDot } from "@/components/map/MuseumDot";
import { getMuseum } from "@/data";
import {
  getPath,
  getNextPathInMuseum,
  getPathOrigin,
  getVisitedMuseumOrder,
  type ResolvedPath,
} from "@/data/journey";
import {
  JOURNEY_MUSEUM_ORDER,
  routeSheetBlurb,
} from "@/data/museum-copy";
import { getMuseumShortLabel } from "@/data/museums";
import {
  arcControl,
  getMapViewBox,
  haversineKm,
  projectToMap,
} from "@/lib/geo";
import {
  defaultSpring,
  motionTokens,
  useReducedMotionSafe,
} from "@/lib/motion";
import { useAppState } from "@/state/AppState";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";

type Props = {
  open: boolean;
  /** Journey-order next path when the screen opens. */
  next: ResolvedPath | null;
  onDepart: (path: ResolvedPath) => void;
};

/**
 * MVP v2 screen 02в — Figma `238:1557`, ref `docs/figma-refs-v2/02v-route-map.png`.
 * Origin = start city; visited museums = constellation stars; target = sparkle.
 */
export function RouteMapScreen({ open, next, onDepart }: Props) {
  const reduced = useReducedMotionSafe();
  const { completedPaths, startCityId } = useAppState();
  const vb = getMapViewBox();

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

  const ctrl = useMemo(() => arcControl(startPt, targetPt), [startPt, targetPt]);

  const visitedOrder = useMemo(
    () => getVisitedMuseumOrder(completedPaths),
    [completedPaths],
  );
  const visitedSet = useMemo(() => new Set(visitedOrder), [visitedOrder]);

  const distanceKm = useMemo(() => {
    if (!targetMuseum) return 0;
    return haversineKm(origin.city, targetMuseum);
  }, [origin.city, targetMuseum]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="absolute inset-0 z-40 flex flex-col bg-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: motionTokens.mapFadeIn }}
        >
          <header className="shrink-0 px-xl pt-[calc(56px+var(--safe-top))]">
            <h1 className="text-h1">Твій маршрут</h1>
            <p className="mt-sm text-body-md text-text-secondary">
              10 творів у 5 музеях. Тапни на будь-який музей.
            </p>
          </header>

          <div className="relative min-h-0 flex-1">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[42%] h-[55%] w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse at center, color-mix(in srgb, var(--color-bg-accent) 35%, transparent), transparent 70%)",
              }}
            />
            <svg
              viewBox={`0 0 ${vb.w} ${vb.h}`}
              className="absolute left-1/2 top-1/2 h-[70%] w-[92%] max-w-[360px] -translate-x-1/2 -translate-y-[42%]"
              role="img"
              aria-label="Карта маршруту музеями"
            >
              <image href="/map/map.svg" width={vb.w} height={vb.h} />

              {/* Constellation under active route: visited museums in visit order */}
              {visitedOrder.length >= 2
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

              {/* Start city → selected target (drawn above constellation) */}
              {targetMuseum ? (
                <DottedRoute
                  start={startPt}
                  ctrl={ctrl}
                  end={targetPt}
                  opacity={0.6}
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
                    onClick={() => setPickedMuseumId(id)}
                  />
                );
              })}

              {JOURNEY_MUSEUM_ORDER.map((id) => {
                if (id === selectedMuseumId || visitedSet.has(id)) return null;
                const m = getMuseum(id);
                if (!m) return null;
                const p = projectToMap(m.lat, m.lng);
                return (
                  <MuseumDot
                    key={id}
                    x={p.x}
                    y={p.y}
                    label={m.city}
                    labelSide={id === "lviv" ? "left" : "right"}
                    tone="dim"
                    onClick={() => setPickedMuseumId(id)}
                  />
                );
              })}

              {targetMuseum ? (
                <MapStar
                  key={`target-${selectedMuseumId}`}
                  x={targetPt.x}
                  y={targetPt.y}
                  size={22}
                  label={targetMuseum.city}
                  labelSide="right"
                  glow="strong"
                  labelTone="primary"
                  pulsing={!reduced}
                  appear
                  onClick={() => setPickedMuseumId(selectedMuseumId)}
                />
              ) : null}
            </svg>
          </div>

          <motion.div
            className="shrink-0 rounded-t-lg border-t border-border-subtle bg-surface px-xl pb-[calc(24px+var(--safe-bottom))] pt-xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={defaultSpring}
          >
            {journeyDone ? (
              <>
                <h2 className="text-h2">Шлях пройдено</h2>
                {/* TODO(copy): end-of-journey sheet body */}
                <p className="mt-sm text-body-md text-text-secondary">
                  Ти пройшов 10 творів у 5 музеях.
                </p>
              </>
            ) : sheetPath ? (
              <>
                <h2 className="text-h2">
                  Далі — {getMuseumShortLabel(sheetPath.museumId)}
                </h2>
                <p className="mt-sm text-body-md text-text-secondary">
                  ≈ {distanceKm} км від тебе. {routeSheetBlurb(sheetPath.museumId)}
                </p>
                <div className="mt-lg">
                  <Button onClick={() => onDepart(sheetPath)}>Вирушити</Button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-h2">
                  Далі — {getMuseumShortLabel(selectedMuseumId)}
                </h2>
                <p className="mt-sm text-body-md text-text-secondary">
                  Усі твори в цьому музеї вже відкриті. Обери інший музей на карті.
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
