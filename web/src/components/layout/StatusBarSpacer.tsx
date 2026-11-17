import { cn } from "@/lib/cn";

/** Safe-area top spacer — do not render fake iOS status bar chrome */
export function StatusBarSpacer({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("w-full shrink-0", className)}
      style={{ height: "var(--safe-top)" }}
    />
  );
}
