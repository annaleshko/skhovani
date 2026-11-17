import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

export function ScreenHeader({ title, subtitle, leading, trailing, className }: Props) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-md px-xl pt-[calc(12px+var(--safe-top))] pb-md",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-md">
        {leading}
        <div className="min-w-0">
          <h1 className="text-h2 text-text-primary">{title}</h1>
          {subtitle ? (
            <p className="mt-2xs text-body-md text-text-secondary">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {trailing}
    </header>
  );
}
