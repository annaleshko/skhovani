import { cn } from "@/lib/cn";
import Image from "next/image";

export type MuseumCardState = "passed" | "next" | "ahead";

type Props = {
  title: string;
  city: string;
  status: string;
  facadeSrc?: string | null;
  state?: MuseumCardState;
  className?: string;
  onClick?: () => void;
};

/** Museum card — Пройдений / Наступний / Попереду. */
export function MuseumCard({
  title,
  city,
  status,
  facadeSrc,
  state = "passed",
  className,
  onClick,
}: Props) {
  const ahead = state === "ahead";
  const next = state === "next";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full min-h-[44px] items-center gap-md rounded-md bg-surface p-lg text-left",
        className,
      )}
    >
      <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded-sm border border-border-subtle bg-screen">
        {facadeSrc ? (
          <Image
            src={facadeSrc}
            alt=""
            fill
            className={cn("object-cover", ahead && "opacity-40")}
            sizes="64px"
          />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-sm">
        <span className="flex flex-wrap gap-2xs">
          <span className="inline-flex h-6 items-center rounded-sm bg-surface-raised px-sm text-caption text-text-secondary">
            {city}
          </span>
          <span
            className={cn(
              "inline-flex h-6 items-center rounded-sm px-sm text-caption",
              ahead
                ? "bg-surface-raised text-text-secondary"
                : next
                  ? "border border-border-accent text-text-accent"
                  : "bg-accent-subtle text-text-accent",
            )}
          >
            {status}
          </span>
        </span>
        <span className="text-label-lg text-text-primary">{title}</span>
      </span>
      <span aria-hidden className="shrink-0 text-text-secondary">
        ›
      </span>
    </button>
  );
}
