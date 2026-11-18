"use client";

import { RouteMapScreen } from "@/components/journey/RouteMapScreen";
import { getNextPath, type ResolvedPath } from "@/data/journey";
import { useAppState } from "@/state/AppState";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Standalone 02в — `/journey?mode=route` (also used from /finish).
 * «Вирушити» always flies via `/journey?path=N&autostart=1` (map → flight → 04).
 * Star revisit (museum already opened): `/journey?path=N&autostart=1&revisit=1`.
 * Never skip straight to hall from 02в sheet — that shortcut is star-tap only.
 */
export function JourneyRouteMap() {
  const router = useRouter();
  const { completedPaths } = useAppState();
  const next = getNextPath(completedPaths) ?? null;

  const onDepart = useCallback(
    (path: ResolvedPath) => {
      // Always flight + facade from 02в «Вирушити» (including path 1).
      router.replace(`/journey?path=${path.n}&autostart=1`);
    },
    [router],
  );

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
    </div>
  );
}
