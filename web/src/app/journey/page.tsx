"use client";

import { JourneyFlow } from "@/components/journey/JourneyFlow";
import { useAppState } from "@/state/AppState";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function JourneyInner() {
  const { ready } = useAppState();
  const params = useSearchParams();
  const raw = params.get("path");
  const pathN = raw ? Number(raw) : undefined;

  if (!ready) return <div className="min-h-dvh bg-screen" aria-busy />;

  return <JourneyFlow pathN={Number.isFinite(pathN) ? pathN : undefined} />;
}

export default function JourneyPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-screen" aria-busy />}>
      <JourneyInner />
    </Suspense>
  );
}
