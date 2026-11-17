"use client";

import { Button } from "@/components/ui";
import { getMuseum } from "@/data";
import { useAppState } from "@/state/AppState";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

/** Stage 8 placeholder — constellation final comes later. */
function FinishInner() {
  const search = useSearchParams();
  const { ready, completedPaths } = useAppState();
  const pathN = search.get("path");
  const museum = getMuseum(search.get("museum") ?? "");

  if (!ready) return <div className="min-h-dvh bg-screen" aria-busy />;

  return (
    <main className="flex min-h-dvh flex-col bg-screen px-xl pb-[calc(24px+var(--safe-bottom))] pt-[calc(56px+var(--safe-top))]">
      <p className="text-overline uppercase text-text-accent">Фінал</p>
      <h1 className="mt-md text-h1 text-text-primary">Перший твір у світлі</h1>
      <p className="mt-sm text-body-md text-text-secondary">
        {/* TODO(copy): Stage 8 constellation copy */}
        {museum
          ? `${museum.city} засвітився на твоїй карті.`
          : "Музей засвітився на твоїй карті."}
      </p>
      <p className="mt-lg text-caption text-text-secondary">
        Шлях {pathN ?? "—"} · пройдено {completedPaths.length}
      </p>
      <div className="mt-auto space-y-sm">
        <Link href="/">
          <Button>На головну</Button>
        </Link>
        <Link href="/reset">
          <Button variant="ghost">Скинути демо</Button>
        </Link>
      </div>
    </main>
  );
}

export default function FinishPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-screen" aria-busy />}>
      <FinishInner />
    </Suspense>
  );
}
