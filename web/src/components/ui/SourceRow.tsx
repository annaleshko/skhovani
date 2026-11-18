import { cn } from "@/lib/cn";

type Props = {
  label: string;
  date?: string | null;
  href?: string | null;
  className?: string;
  showDivider?: boolean;
};

/** Figma Source Row 72:700 — external-link icon from Icon/External. */
export function SourceRow({
  label,
  date,
  href,
  className,
  showDivider = true,
}: Props) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-label-md text-text-primary">{label}</span>
        {date ? (
          <span className="block text-caption text-text-secondary">{date}</span>
        ) : null}
      </span>
      {href ? (
        <span aria-hidden className="relative size-5 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/external.svg"
            alt=""
            className="size-5"
            width={20}
            height={20}
          />
        </span>
      ) : null}
      {showDivider ? (
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px bg-divider"
        />
      ) : null}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "relative flex min-h-[44px] w-full items-center gap-md py-md text-left",
          className,
        )}
      >
        {body}
      </a>
    );
  }

  return (
    <div
      className={cn(
        "relative flex min-h-[44px] w-full items-center gap-md py-md text-left",
        className,
      )}
    >
      {body}
    </div>
  );
}
