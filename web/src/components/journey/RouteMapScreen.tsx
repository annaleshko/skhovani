"use client";

import { Button } from "@/components/ui";
import { DottedRoute } from "@/components/map/DottedRoute";
import { MapPin } from "@/components/map/MapPin";
import { MapStar } from "@/components/map/MapStar";
import { MuseumDot } from "@/components/map/MuseumDot";
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
  routeSheetBlurb,
} from "@/data/museum-copy";
import { getMuseumShortLabel } from "@/data/museums";
import {
  arcControl,
  getMapViewBox,
  haversineKm,
  projectToMap,
} from "@/lib/geo";
import { layoutMapLabels, type MapLabelMarker } from "@/lib/map-label";
import {
  defaultSpring,
  motionTokens,
  useReducedMotionSafe,
} from "@/lib/motion";
import { useAppState } from "@/state/AppState";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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

/**
 * MVP v2 screen 02в — Figma `238:1557`, ref `docs/figma-refs-v2/02v-route-map.png`.
 * Origin = start city; rays to visited; target = bright dotted route.
 */
export function RouteMapScreen({ open, next, onDepart, onRevisit }: Props) {
  const router = useRouter();
  const reduced = useReducedMotionSafe();
  const { completedPaths, startCityId } = useAppState();
  const vb = getMapViewBox();
  const [confirmRestart, setConfirmRestart] = useState(false);

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

  const onMuseumTap = (id: string) => {
    // Star = at least one artwork opened → straight in (no sheet)
    if (visitedSet.has(id) && onRevisit) {
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

  /** Selected museum is a star → sheet still shows for non-revisit path picks from journey sheet. */
  const selectedIsStar = visitedSet.has(selectedMuseumId);

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

              {/* Faint rays: start → each visited museum */}
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
                    opacity={0.22}
                    animateDraw={false}
                    routeKey={`ray-${id}`}
                  />
                );
              })}

              {/* Bright start → selected target */}
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
                const place = labelLayout.get(id);
                return (
                  <MapStar
                    key={`vis-${id}`}
                    x={p.x}
                    y={p.y}
                    size={14}
                    label={m.city}
                    labelSide={place?.side === "top" || place?.side === "bottom" ? place.side : place?.side ?? "right"}
                    labelDy={place?.dy ?? 0}
                    glow="soft"
                    labelTone="secondary"
                    onClick={() => onMuseumTap(id)}
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
                    onClick={() => onMuseumTap(id)}
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
                    onClick={() => onMuseumTap(selectedMuseumId)}
                  />
                ) : (
                  <MapPin
                    key={`target-${selectedMuseumId}`}
                    x={targetPt.x}
                    y={targetPt.y}
                    label={targetMuseum.city}
                    labelSide="right"
                    variant="target"
                    pulsing={!reduced}
                    appear
                    onClick={() => onMuseumTap(selectedMuseumId)}
                  />
                )
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
                <h2 className="text-h2">{ALL_DONE_COPY.title}</h2>
                {/* TODO(copy confirm) */}
                <p className="mt-sm text-body-md text-text-secondary">
                  {ALL_DONE_COPY.body}
                </p>
                <div className="mt-lg flex flex-col gap-sm">
                  {confirmRestart ? (
                    <>
                      <p className="text-body-md text-text-secondary">
                        Скинути прогрес і почати з початку?
                      </p>
                      <Button onClick={() => router.push("/reset")}>
                        Так, почати знову
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
            ) : sheetPath && !selectedIsStar ? (
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
            ) : sheetPath && selectedIsStar ? (
              // Star selected via default journey next — still show depart for first-time sheet path
              // (star tap uses onRevisit; sheet CTA for journey-order next when it happens to be a star city)
              <>
                <h2 className="text-h2">
                  Далі — {getMuseumShortLabel(sheetPath.museumId)}
                </h2>
                <p className="mt-sm text-body-md text-text-secondary">
                  ≈ {distanceKm} км від тебе. {routeSheetBlurb(sheetPath.museumId)}
                </p>
                <div className="mt-lg">
                  <Button
                    onClick={() =>
                      onRevisit
                        ? onRevisit(sheetPath, { reopen: false })
                        : onDepart(sheetPath)
                    }
                  >
                    Вирушити
                  </Button>
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
              </>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
