"use client";

import { cn } from "@/lib/cn";
import { defaultSpring, motionTokens } from "@/lib/motion";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";

export type SnapPoint = "collapsed" | "expanded";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  showHandle?: boolean;
  snapPoints?: SnapPoint[];
  snap?: SnapPoint;
  onSnapChange?: (snap: SnapPoint) => void;
  className?: string;
  labelledBy?: string;
};

/** Bottom sheet — scrim, spring, swipe-down, Esc, focus trap. */
export function BottomSheet({
  open,
  onClose,
  children,
  showHandle = false,
  snapPoints,
  snap = "collapsed",
  onSnapChange,
  className,
  labelledBy,
}: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const hasSnaps = Boolean(snapPoints?.length);

  const heightClass =
    hasSnaps && snap === "expanded" ? "max-h-[92dvh]" : "max-h-[70dvh]";

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKeyDown);
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      prev?.focus?.();
    };
  }, [open, onKeyDown]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 mx-auto flex max-w-phone items-end justify-center">
          <motion.button
            type="button"
            aria-label="Закрити"
            className="absolute inset-0 bg-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.scrim }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy ?? titleId}
            tabIndex={-1}
            className={cn(
              "relative z-10 flex w-full flex-col overflow-hidden rounded-t-lg border-t border-border-subtle bg-surface outline-none",
              heightClass,
              className,
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={defaultSpring}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 400) {
                if (hasSnaps && snap === "expanded") {
                  onSnapChange?.("collapsed");
                } else {
                  onClose();
                }
              } else if (hasSnaps && info.offset.y < -60) {
                onSnapChange?.("expanded");
              }
            }}
          >
            {(showHandle || hasSnaps) && (
              <div
                className="flex h-5 w-full cursor-grab items-center justify-center active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <span className="h-1 w-10 rounded-pill bg-[var(--color-progress-inactive)]" />
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto px-xl pb-[calc(24px+var(--safe-bottom))] pt-xl">
              {children}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
