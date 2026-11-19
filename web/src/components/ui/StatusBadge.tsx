import { cn } from "@/lib/cn";
import type { ArtworkStatus } from "@/data/types";

const LABELS: Record<ArtworkStatus, string> = {
  stolen: "Викрадений",
  shelter: "В укритті",
  saved: "Врятований",
  lost: "Втрачений",
};

const STYLES: Record<ArtworkStatus, string> = {
  stolen: "bg-status-stolen-bg text-status-stolen",
  shelter: "bg-status-shelter-bg text-status-shelter",
  saved: "bg-status-saved-bg text-status-saved",
  lost: "bg-status-lost-bg text-status-lost",
};

const DOT: Record<ArtworkStatus, string> = {
  stolen: "bg-status-stolen",
  shelter: "bg-status-shelter",
  saved: "bg-status-saved",
  lost: "bg-status-lost",
};

type Props = {
  status: ArtworkStatus;
  className?: string;
  label?: string;
};

/** Status badge. */
export function StatusBadge({ status, className, label }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2xs rounded-pill px-md py-1 text-label-md",
        STYLES[status],
        className,
      )}
    >
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", DOT[status])} />
      {label ?? LABELS[status]}
    </span>
  );
}
