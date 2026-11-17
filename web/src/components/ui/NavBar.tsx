"use client";

import { cn } from "@/lib/cn";
import { defaultSpring } from "@/lib/motion";
import { motion } from "framer-motion";

export type NavTab = "map" | "collection" | "profile";

const TABS: { id: NavTab; label: string; icon: string }[] = [
  { id: "map", label: "Карта", icon: "◎" },
  { id: "collection", label: "Колекція", icon: "▦" },
  { id: "profile", label: "Профіль", icon: "☺" },
];

type Props = {
  active: NavTab;
  onChange: (tab: NavTab) => void;
  className?: string;
};

/** Figma Nav Bar 72:688 */
export function NavBar({ active, onChange, className }: Props) {
  return (
    <nav
      aria-label="Головна навігація"
      className={cn(
        "mx-auto flex w-[calc(100%-32px)] items-center justify-around rounded-lg bg-surface px-sm py-sm shadow-artwork",
        className,
      )}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => onChange(tab.id)}
            className="relative flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-2xs px-sm py-sm"
          >
            {isActive ? (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-1 rounded-md bg-accent-selected"
                transition={defaultSpring}
              />
            ) : null}
            <span
              aria-hidden
              className={cn(
                "relative z-10 text-[18px]",
                isActive ? "text-text-accent" : "text-text-secondary",
              )}
            >
              {tab.icon}
            </span>
            <span
              className={cn(
                "relative z-10 text-caption",
                isActive ? "text-text-primary" : "text-text-secondary",
              )}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
