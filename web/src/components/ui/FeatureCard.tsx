import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type Props = {
  number?: string | number;
  title: string;
  description: string;
  icon?: ReactNode;
  className?: string;
};

/** Onboarding feature cards (02) */
export function FeatureCard({ number, title, description, icon, className }: Props) {
  return (
    <article
      className={cn(
        "flex gap-md rounded-md border border-border-subtle bg-surface p-lg",
        className,
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-label-lg text-text-accent">
        {icon ?? number}
      </span>
      <div className="min-w-0">
        <h3 className="text-h3 text-text-primary">{title}</h3>
        <p className="mt-2xs text-body-md text-text-secondary">{description}</p>
      </div>
    </article>
  );
}
