"use client";

import { Button } from "@/components/ui";
import { MapPin } from "@/components/map/MapPin";
import { MuseumDot } from "@/components/map/MuseumDot";
import { getMuseum } from "@/data";
import {
  getLastCompletedPath,
  getNextPathInMuseum,
  getPathOrigin,
  isMuseumPassed,
  type ResolvedPath,
} from "@/data/journey";
import {
  JOURNEY_MUSEUM_ORDER,
  routeSheetBlurb,
} from "@/data/museum-copy";
import { getMuseumShortLabel } from "@/data/museums";
import { getStartCityOption, isAbroadCityId } from "@/data/start-cities";
import {
  arcControl,
  getMapViewBox,
  pointOnQuad,
  projectToMap,
  quadPath,
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

  const origin = useMemo(() => {
    if (sheetPath) {
      return getPathOrigin(startCityId, sheetPath, completedPaths);
    }
    const prev = getLastCompletedPath(completedPaths);
    if (prev) {
      return {
        city: {
          id: prev.museumId,
          name: prev.museum.city,
          oblast: "",
          lat: prev.museum.lat,
          lng: prev.museum.lng,
        },
        abroad: false,
      };
    }
    const abroad = isAbroadCityId(startCityId);
    const city = startCityId ? getStartCityOption(startCityId) : undefined;
    return {
      city: city ?? {
        id: "kyiv",
        name: "Київ",
        oblast: "",
        lat: 50.45,
        lng: 30.52,
      },
      abroad,
    };
  }, [completedPaths, sheetPath, startCityId]);

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
  const arcD = useMemo(() => quadPath(startPt, ctrl, targetPt), [startPt, ctrl, targetPt]);
  const midPt = useMemo(() => pointOnQuad(startPt, ctrl, targetPt, 0.5), [
    startPt,
    ctrl,
    targetPt,
  ]);

  const dashedD = useMemo(() => {
    const pts = JOURNEY_MUSEUM_ORDER.map((id) => {
      const m = getMuseum(id);
      return m ? projectToMap(m.lat, m.lng) : null;
    }).filter((p): p is NonNullable<typeof p> => Boolean(p));
    if (pts.length < 2) return "";
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
  }, []);

  const nextMuseumId = next?.museumId ?? null;
  const originMuseumId = JOURNEY_MUSEUM_ORDER.includes(
    origin.city.id as (typeof JOURNEY_MUSEUM_ORDER)[number],
  )
    ? origin.city.id
    : null;

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
            {/* Soft southern glow under the map */}
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

              {/* Dashed full route Херсон → … → Чернігів */}
              {dashedD ? (
                <path
                  d={dashedD}
                  fill="none"
                  stroke="var(--color-bg-accent)"
                  strokeOpacity={0.6}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null}

              {/* Solid arc previous → selected */}
              <path
                d={arcD}
                fill="none"
                stroke="var(--color-bg-accent)"
                strokeWidth={2}
                strokeLinecap="round"
              />
              <circle
                cx={midPt.x}
                cy={midPt.y}
                r={3}
                fill="var(--color-bg-accent)"
                style={{ filter: "drop-shadow(0 0 4px var(--color-bg-accent))" }}
              />

              {/* Start city pin only when origin is not already a journey museum */}
              {!originMuseumId ? (
                <MapPin
                  x={startPt.x}
                  y={startPt.y}
                  label={origin.abroad ? "Ти" : origin.city.name}
                  variant="start"
                />
              ) : null}

              {JOURNEY_MUSEUM_ORDER.map((id) => {
                const m = getMuseum(id);
                if (!m) return null;
                const p = projectToMap(m.lat, m.lng);
                const isSelected = id === selectedMuseumId;
                const passed = isMuseumPassed(id, completedPaths);
                const isNext = id === nextMuseumId;
                const isOrigin = id === originMuseumId;

                if (isSelected) {
                  return (
                    <g key={id}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={28}
                        fill="var(--color-bg-accent)"
                        opacity={reduced ? 0.18 : 0.22}
                      >
                        {!reduced ? (
                          <animate
                            attributeName="opacity"
                            values="0.12;0.28;0.12"
                            dur="2.4s"
                            repeatCount="indefinite"
                          />
                        ) : null}
                      </circle>
                      <MapPin
                        x={p.x}
                        y={p.y}
                        label={m.city}
                        labelSide="right"
                        variant="target"
                        pulsing={!reduced}
                        onClick={() => setPickedMuseumId(id)}
                      />
                    </g>
                  );
                }

                // Arc origin museum: single passed marker (one label, no duplicate pin)
                if (isOrigin) {
                  return (
                    <MuseumDot
                      key={id}
                      x={p.x}
                      y={p.y}
                      label={m.city}
                      labelSide={id === "lviv" ? "left" : "right"}
                      tone="passed"
                      onClick={() => setPickedMuseumId(id)}
                    />
                  );
                }

                return (
                  <MuseumDot
                    key={id}
                    x={p.x}
                    y={p.y}
                    label={m.city}
                    labelSide={id === "lviv" ? "left" : "right"}
                    tone={passed ? "passed" : isNext ? "next" : "dim"}
                    pulsing={!reduced && isNext && !isSelected}
                    onClick={() => setPickedMuseumId(id)}
                  />
                );
              })}
            </svg>
          </div>

          <motion.div
            className="shrink-0 rounded-t-lg border-t border-border-subtle bg-surface px-xl pb-[calc(24px+var(--safe-bottom))] pt-xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={defaultSpring}
          >
            {sheetPath ? (
              <>
                <h2 className="text-h2">
                  Далі — {getMuseumShortLabel(sheetPath.museumId)}
                </h2>
                <p className="mt-sm text-body-md text-text-secondary">
                  {routeSheetBlurb(sheetPath.museumId)}
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
