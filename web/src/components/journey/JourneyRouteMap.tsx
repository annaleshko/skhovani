"use client";

import { JourneyFlow } from "@/components/journey/JourneyFlow";
import {
  RouteMapScreen,
  type DepartOpts,
} from "@/components/journey/RouteMapScreen";
import { getNextPath, type ResolvedPath } from "@/data/journey";
import { useAppState } from "@/state/AppState";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

/**
 * Standalone 02в — `/journey?mode=route` (also used from /finish).
 * «Вирушити» flies in-place from the 02в map cam (sheet slides under overlay).
 * Star revisit: `/journey?path=N&autostart=1&revisit=1`.
 */
export function JourneyRouteMap() {
  const router = useRouter();
  const { completedPaths } = useAppState();
  const next = getNextPath(completedPaths) ?? null;
  const [routeFlight, setRouteFlight] = useState<{
    pathN: number;
    mapCam: DepartOpts["mapCam"];
  } | null>(null);

  const onDepart = useCallback((path: ResolvedPath, opts: DepartOpts) => {
    setRouteFlight({ pathN: path.n, mapCam: opts.mapCam });
  }, []);

  const onRevisit = useCallback(
    (path: ResolvedPath, opts: { reopen: boolean }) => {
      const reopen = opts.reopen ? "&reopen=1" : "";
      router.replace(
        `/journey?path=${path.n}&autostart=1&revisit=1${reopen}`,
      );
    },
    [router],
  );

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[430px] bg-screen">
      <RouteMapScreen
        open
        next={next}
        onDepart={onDepart}
        onRevisit={onRevisit}
      />
      {routeFlight ? (
        <div className="absolute inset-0 z-[60]">
          <JourneyFlow
            pathN={routeFlight.pathN}
            autostart
            fromRouteMap
            initialCam={routeFlight.mapCam}
          />
        </div>
      ) : null}
    </div>
  );
}
