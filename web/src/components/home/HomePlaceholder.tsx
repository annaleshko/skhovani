"use client";

import { Button } from "@/components/ui";
import { getDemoStartCity } from "@/data/demo-user";
import { getMuseumShortLabel } from "@/data/museums";
import { getNextPath, isJourneyComplete, ALL_DONE_COPY } from "@/data/journey";
import { haversineKm } from "@/lib/geo";
import { useAppState } from "@/state/AppState";
import Link from "next/link";

/** Temporary Home until — next path + «Летимо».*/
export function HomePlaceholder() {
  const { user, completedPaths } = useAppState();
  const next = getNextPath(completedPaths);
  const start = getDemoStartCity();

  if (isJourneyComplete(completedPaths) || !next) {
    return (
      <main className="flex h-full flex-col justify-end gap-lg px-xl pb-[calc(48px+var(--safe-bottom))] pt-[calc(48px+var(--safe-top))]">
        <p className="text-overline uppercase text-text-accent">Сховані</p>
        <h1 className="text-h1">{ALL_DONE_COPY.title}</h1>
        <p className="text-body-lg text-text-secondary">{ALL_DONE_COPY.body}</p>
      </main>
    );
  }

  const km = haversineKm(start, next.museum);

  return (
    <main className="flex h-full flex-col justify-end gap-lg px-xl pb-[calc(48px+var(--safe-bottom))] pt-[calc(48px+var(--safe-top))]">
      <p className="text-overline uppercase text-text-accent">Сьогодні</p>
      <h1 className="text-h1">Привіт, {user.nameVocative}</h1>
      <p className="text-body-lg text-text-secondary">
        Шлях до {getMuseumShortLabel(next.museumId)} · ≈ {km} км
      </p>
      <Link href={`/journey?path=${next.n}`} className="block w-full">
        <Button>Летимо</Button>
      </Link>
    </main>
  );
}
