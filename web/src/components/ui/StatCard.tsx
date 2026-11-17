import { cn } from "@/lib/cn";

type Props = {
  value: number | string;
  label: string;
  className?: string;
};

export function StatCard({ value, label, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center rounded-md bg-surface px-sm py-md text-center",
        className,
      )}
    >
      <span className="text-h2 text-text-accent">{value}</span>
      <span className="text-caption text-text-secondary">{label}</span>
    </div>
  );
}
