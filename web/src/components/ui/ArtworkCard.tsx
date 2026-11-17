import { cn } from "@/lib/cn";
import type { ArtworkStatus } from "@/data/types";
import Image from "next/image";
import { StatusBadge } from "./StatusBadge";

type Props = {
  title: string;
  meta?: string;
  imageSrc?: string | null;
  state?: "lit" | "covered";
  showStatus?: boolean;
  status?: ArtworkStatus;
  className?: string;
  onClick?: () => void;
};

/** Figma Artwork Card 72:724 — Lit / Covered */
export function ArtworkCard({
  title,
  meta,
  imageSrc,
  state = "lit",
  showStatus = false,
  status = "shelter",
  className,
  onClick,
}: Props) {
  const covered = state === "covered";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex w-full flex-col gap-sm text-left", className)}
    >
      <span
        className={cn(
          "relative flex h-[208px] w-full overflow-hidden rounded-md",
          covered ? "items-center justify-center bg-surface-raised" : "bg-surface",
        )}
      >
        {!covered && imageSrc ? (
          <Image src={imageSrc} alt="" fill className="object-cover" sizes="164px" />
        ) : null}
        {covered ? (
          <span aria-hidden className="text-text-accent drop-shadow-spark">
            ✦
          </span>
        ) : (
          <span
            aria-hidden
            className="absolute right-md top-md text-text-accent drop-shadow-spark"
          >
            ✦
          </span>
        )}
        {showStatus ? (
          <StatusBadge status={status} className="absolute left-2 top-2 backdrop-blur-md" />
        ) : null}
      </span>
      <span className="flex flex-col">
        <span className="text-label-md text-text-primary">{title}</span>
        {meta ? <span className="text-caption text-text-secondary">{meta}</span> : null}
      </span>
    </button>
  );
}
