import { cn } from "@/lib/cn";

type Props = {
  value: number | string;
  className?: string;
};

export function NumberBadge({ value, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-full bg-accent-subtle text-[16px] font-medium tracking-tight text-text-accent",
        className,
      )}
    >
      {value}
    </span>
  );
}
