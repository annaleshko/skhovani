import { cn } from "@/lib/cn";

type Props = {
  name: string;
  oblast: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
};

/** City suggestion row (04) */
export function CityRow({ name, oblast, selected = false, onClick, className }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full min-h-[44px] items-center justify-between gap-md px-xl py-md text-left",
        selected && "bg-accent-subtle",
        className,
      )}
    >
      <span>
        <span className="block text-label-lg text-text-primary">{name}</span>
        <span className="block text-caption text-text-secondary">{oblast}</span>
      </span>
      {selected ? (
        <span aria-hidden className="text-text-accent">
          ✓
        </span>
      ) : null}
    </button>
  );
}
