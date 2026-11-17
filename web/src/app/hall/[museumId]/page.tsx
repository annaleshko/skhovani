"use client";

import { HallExperience } from "@/components/hall/HallExperience";
import { getMuseum } from "@/data";
import { useAppState } from "@/state/AppState";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function HallInner() {
  const params = useParams<{ museumId: string }>();
  const search = useSearchParams();
  const { ready } = useAppState();
  const museum = getMuseum(params.museumId);
  const pathNRaw = search.get("path");
  const pathN = pathNRaw != null ? Number(pathNRaw) : null;
  const artworkId = Number(search.get("artwork") ?? museum?.artworkIds[0] ?? 0);

  if (!ready) return <div className="min-h-dvh bg-screen" aria-busy />;
  if (!museum || !artworkId) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-screen px-xl text-body-md text-text-secondary">
        Залу не знайдено
      </div>
    );
  }

  return (
    <HallExperience
      museumId={params.museumId}
      pathN={Number.isFinite(pathN) ? pathN : null}
      artworkId={artworkId}
    />
  );
}

export default function HallPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-screen" aria-busy />}>
      <HallInner />
    </Suspense>
  );
}
