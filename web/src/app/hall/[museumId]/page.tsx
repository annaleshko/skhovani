"use client";

import { Button } from "@/components/ui";
import { getMuseum } from "@/data";
import { getMuseumDisplayName, getMuseumUi } from "@/data/museums";
import { useAppState } from "@/state/AppState";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function HallInner() {
  const params = useParams<{ museumId: string }>();
  const search = useSearchParams();
  const { ready } = useAppState();
  const museum = getMuseum(params.museumId);
  const ui = getMuseumUi(params.museumId);
  const pathN = search.get("path");
  const artworkId = search.get("artwork");

  if (!ready) return <div className="min-h-dvh bg-screen" aria-busy />;

  return (
    <main className="relative flex min-h-dvh flex-col bg-screen">
      {ui ? (
        <div className="relative mx-xl mt-[calc(48px+var(--safe-top))] h-48 overflow-hidden rounded-md">
          <Image src={ui.hallSrc} alt="" fill className="object-cover opacity-60" sizes="390px" />
        </div>
      ) : null}
      <div className="mt-auto px-xl pb-[calc(48px+var(--safe-bottom))] pt-2xl">
        <p className="text-overline uppercase text-text-accent">Зала</p>
        <h1 className="mt-md text-h2">
          {getMuseumDisplayName(params.museumId) || museum?.fullName || params.museumId}
        </h1>
        <p className="mt-sm text-body-md text-text-secondary">
          {/* TODO(copy): hall placeholder until Stage 5 */}
          Зала з’явиться на наступному етапі. Шлях {pathN ?? "—"}, твір {artworkId ?? "—"}.
        </p>
        <div className="mt-lg">
          <Link href="/">
            <Button variant="secondary">На головну</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function HallPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-screen" aria-busy />}>
      <HallInner />
    </Suspense>
  );
}
