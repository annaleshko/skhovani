"use client";

import { cn } from "@/lib/cn";
import type { InputHTMLAttributes, ReactNode } from "react";
import { useId, useState } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  icon?: ReactNode;
  label?: string;
};

/** Figma Text Field 60:13 — Default / Focused, optional icon */
export function TextField({ icon, label, className, id, onFocus, onBlur, ...rest }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [focused, setFocused] = useState(false);

  return (
    <label className="flex w-full flex-col gap-sm">
      {label ? (
        <span className="text-label-md text-text-secondary">{label}</span>
      ) : null}
      <span
        className={cn(
          "flex h-control min-h-[44px] w-full items-center gap-sm rounded-md border bg-surface px-lg transition-colors",
          focused ? "border-border-accent" : "border-border-subtle",
          className,
        )}
      >
        {icon ? <span className="shrink-0 text-text-secondary">{icon}</span> : null}
        <input
          id={inputId}
          className="h-full w-full bg-transparent text-body-input text-text-primary placeholder:text-text-secondary outline-none"
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
      </span>
    </label>
  );
}
