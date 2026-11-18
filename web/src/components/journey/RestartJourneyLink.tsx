"use client";

import { Button } from "@/components/ui";
import { useAppState } from "@/state/AppState";
import { resetHomeHref } from "@/state/storage";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Small «Почати спочатку» under 02 / 02в primary → confirm → explicit reset.
 */
export function RestartJourneyLink() {
  const router = useRouter();
  const { resetAll } = useAppState();
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <div className="mt-md flex flex-col gap-sm">
        <p className="text-body-md text-text-secondary">
          Почати шлях спочатку? Прогрес буде скинуто.
        </p>
        <Button
          onClick={() => {
            resetAll();
            router.replace(resetHomeHref());
          }}
        >
          Так, почати
        </Button>
        <Button variant="ghost" onClick={() => setConfirm(false)}>
          Скасувати
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirm(true)}
      className="mt-md min-h-11 self-center text-caption text-text-secondary underline-offset-2 hover:text-text-primary hover:underline"
    >
      Почати спочатку
    </button>
  );
}
