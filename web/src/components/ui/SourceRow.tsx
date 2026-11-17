import { cn } from "@/lib/cn";

type Props = {
  label: string;
  date?: string | null;
  href: string;
  className?: string;
};

/** Figma Source Row 72:700 */
export function SourceRow({ label, date, href, className }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex min-h-[44px] w-full items-center justify-between gap-md border-b border-divider py-md text-left",
        className,
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-label-md text-text-primary">{label}</span>
        {date ? (
          <span className="block text-caption text-text-secondary">{date}</span>
        ) : null}
      </span>
      <span aria-hidden className="shrink-0 text-text-accent">
        ↗
      </span>
    </a>
  );
}
