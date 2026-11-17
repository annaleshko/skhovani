"use client";

import { cn } from "@/lib/cn";
import { defaultSpring } from "@/lib/motion";
import { motion } from "framer-motion";

type Props = {
  className?: string;
  label?: string;
};

/** Success check with spring (21б) */
export function CheckBadge({ className, label = "Готово" }: Props) {
  return (
    <div className={cn("flex flex-col items-center gap-md", className)}>
      <motion.span
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={defaultSpring}
        className="flex size-16 items-center justify-center rounded-full bg-status-saved-bg text-2xl text-status-saved"
        aria-hidden
      >
        ✓
      </motion.span>
      <span className="text-h3 text-text-primary">{label}</span>
    </div>
  );
}
