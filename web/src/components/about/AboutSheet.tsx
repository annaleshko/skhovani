"use client";

import { Button, Chip, SourceRow, StatusBadge } from "@/components/ui";
import { PASSPORT_LAYOUT } from "@/components/tour/FramedArtwork";
import type { Artwork } from "@/data/types";
import {
  displayAuthorMeta,
  displayHeadline,
  displayStatusMeta,
} from "@/lib/artwork-display";
import { cn } from "@/lib/cn";
import { defaultSpring, easings, motionTokens } from "@/lib/motion";
import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";

type TabId = "history" | "about" | "author" | "sources";

const TABS: { id: TabId; label: string }[] = [
  { id: "history", label: "Історія" },
  { id: "about", label: "Про твір" },
  { id: "author", label: "Автор" },
  { id: "sources", label: "Джерела" },
];

const SWIPE_THRESHOLD = 24;
const TAP_SLOP = 8;
const DRAG_CLAMP = 96;

type Props = {
  artwork: Artwork;
  open: boolean;
  /** When true, sheet sits under the 08 detail dim (no interaction change). */
  dimmed?: boolean;
  /** Primary CTA label, e.g. «Далі — Мелітополь». */
  continueLabel: string;
  onAskGuide: () => void;
  onContinue: () => void;
  className?: string;
};

type DragSession = {
  startY: number;
  pointerId: number;
  /** header always sheets; body may stay scroll until decided */
  mode: "sheet" | "scroll" | "undecided";
};

/**
 * Passport sheet under the framed artwork.
 * Pinned bar: «Спитати гіда» + «Далі». Expand via swipe/tap on the header.
 */
export function AboutSheet({
  artwork,
  open,
  dimmed = false,
  continueLabel,
  onAskGuide,
  onContinue,
}: Props) {
  const [tab, setTab] = useState<TabId>("history");
  const [expanded, setExpanded] = useState(false);
  const dragRef = useRef<DragSession | null>(null);
  /** Skip the synthetic click after a pointer-handled tap/swipe. */
  const skipClickRef = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const sheetY = useMotionValue(0);

  // Entrance slide via motion value (style.y owns the property; not animate.y).
  useLayoutEffect(() => {
    if (!open) return;
    sheetY.set(48);
    void animate(sheetY, 0, defaultSpring);
  }, [open, sheetY]);

  const selectTab = (id: TabId) => {
    setTab(id);
    setExpanded(true);
  };

  const paragraphs =
    tab === "history"
      ? artwork.tabs.history
      : tab === "about"
        ? artwork.tabs.about
        : tab === "author"
          ? artwork.tabs.author
          : [];

  const L = PASSPORT_LAYOUT;
  const sheetTop = expanded ? L.sheetExpanded.y : L.sheetCollapsed.y;
  const title = displayHeadline(artwork);
  const statusMeta = displayStatusMeta(artwork);

  const snapSheetY = () => {
    void animate(sheetY, 0, defaultSpring);
  };

  const finishSheetGesture = (dy: number, allowTapToggle: boolean) => {
    skipClickRef.current = true;
    window.setTimeout(() => {
      skipClickRef.current = false;
    }, 0);

    if (Math.abs(dy) < TAP_SLOP) {
      if (allowTapToggle) setExpanded((v) => !v);
    } else if (dy < -SWIPE_THRESHOLD) {
      setExpanded(true);
    } else if (dy > SWIPE_THRESHOLD) {
      setExpanded(false);
    }
    snapSheetY();
  };

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragRef.current = {
      startY: e.clientY,
      pointerId: e.pointerId,
      mode: "sheet",
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onHeaderPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId || drag.mode !== "sheet") return;
    const dy = e.clientY - drag.startY;
    sheetY.set(Math.max(-DRAG_CLAMP, Math.min(DRAG_CLAMP, dy)));
  };

  const onHeaderPointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dy = e.clientY - drag.startY;
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    finishSheetGesture(dy, true);
  };

  const onHandleClick = () => {
    if (skipClickRef.current) return;
    setExpanded((v) => !v);
  };

  const onBodyPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const scrollTop = bodyRef.current?.scrollTop ?? 0;
    dragRef.current = {
      startY: e.clientY,
      pointerId: e.pointerId,
      mode: expanded && scrollTop > 0 ? "scroll" : "undecided",
    };
  };

  const onBodyPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dy = e.clientY - drag.startY;
    const el = bodyRef.current;

    if (drag.mode === "undecided") {
      if (Math.abs(dy) < TAP_SLOP) return;
      if (expanded) {
        const atTop = (el?.scrollTop ?? 0) <= 0;
        if (dy > 0 && atTop) {
          drag.mode = "sheet";
          el?.setPointerCapture(e.pointerId);
        } else {
          drag.mode = "scroll";
          return;
        }
      } else {
        drag.mode = "sheet";
        el?.setPointerCapture(e.pointerId);
      }
    }

    if (drag.mode === "sheet") {
      e.preventDefault();
      sheetY.set(Math.max(-DRAG_CLAMP, Math.min(DRAG_CLAMP, dy)));
    }
  };

  const onBodyPointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dy = e.clientY - drag.startY;
    const mode = drag.mode;
    dragRef.current = null;
    try {
      bodyRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (mode === "sheet") {
      // Body swipe: expand/collapse only — no tap-toggle (tap selects text when expanded).
      finishSheetGesture(dy, false);
    } else {
      snapSheetY();
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className={cn(
              "absolute inset-x-0 z-[25] flex flex-col overflow-hidden rounded-t-lg border-t border-border-subtle bg-surface",
              dimmed && "pointer-events-none",
            )}
            style={{
              bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
              y: sheetY,
            }}
            initial={{
              opacity: 0,
              top: `min(calc(0.58 * var(--app-h)), max(calc(0.42 * var(--app-h)), calc(${(L.sheetCollapsed.y / 844).toFixed(4)} * var(--app-h))))`,
            }}
            animate={{
              opacity: 1,
              top: expanded
                ? `max(calc(0.12 * var(--app-h)), calc(${(L.sheetExpanded.y / 844).toFixed(4)} * var(--app-h)))`
                : `min(calc(0.58 * var(--app-h)), max(calc(0.42 * var(--app-h)), calc(${(sheetTop / 844).toFixed(4)} * var(--app-h))))`,
            }}
            exit={{ opacity: 0 }}
            transition={defaultSpring}
          >
            {/* Header: grabber + title + meta + tabs — swipe/tap to expand */}
            <div
              className="shrink-0 touch-none select-none"
              onPointerDown={onHeaderPointerDown}
              onPointerMove={onHeaderPointerMove}
              onPointerUp={onHeaderPointerUp}
              onPointerCancel={onHeaderPointerUp}
            >
              <button
                type="button"
                aria-expanded={expanded}
                aria-label={expanded ? "Згорнути" : "Розгорнути"}
                className="flex min-h-[44px] w-full flex-col items-center justify-center pt-sm"
                onClick={onHandleClick}
              >
                <span
                  className="h-1 w-10 rounded-pill bg-text-secondary opacity-70"
                  aria-hidden
                />
              </button>

              <div className="px-xl">
                <div className="flex flex-col gap-md">
                  <div>
                    <h2 className="text-h2 text-text-primary">{title}</h2>
                    <p className="mt-2xs text-body-md text-text-secondary">
                      {displayAuthorMeta(artwork)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-sm">
                    <StatusBadge status={artwork.status} />
                    {statusMeta ? (
                      <span className="text-caption text-text-secondary">
                        {statusMeta}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div
                  className="mt-lg flex flex-nowrap gap-sm overflow-x-auto pb-xs [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {TABS.map((t) => (
                    <Chip
                      key={t.id}
                      active={tab === t.id}
                      onClick={() => selectTab(t.id)}
                    >
                      {t.label}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>

            <div
              ref={bodyRef}
              className={cn(
                "relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-xl py-lg touch-pan-y",
                !expanded && "select-none",
              )}
              style={{
                minHeight: expanded ? undefined : "2.75rem",
              }}
              onPointerDown={onBodyPointerDown}
              onPointerMove={onBodyPointerMove}
              onPointerUp={onBodyPointerUp}
              onPointerCancel={onBodyPointerUp}
              onScroll={(e) => {
                if (e.currentTarget.scrollTop > 24) setExpanded(true);
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: motionTokens.tabContent }}
                >
                  {tab === "sources" ? (
                    <div className="space-y-2xl">
                      <div>
                        <p className="text-overline uppercase text-text-secondary">
                          Тексти
                        </p>
                        {(expanded
                          ? artwork.sources
                          : artwork.sources.slice(0, 1)
                        ).map((s, i, arr) => (
                          <SourceRow
                            key={s.id}
                            label={s.label}
                            date={s.note}
                            href={s.url}
                            showDivider={
                              expanded
                                ? i < arr.length - 1
                                : Boolean(artwork.photoCredit)
                            }
                          />
                        ))}
                      </div>
                      {expanded || artwork.photoCredit ? (
                        <div>
                          <p className="text-overline uppercase text-text-secondary">
                            Фото
                          </p>
                          <SourceRow
                            label={
                              artwork.photoCredit.replace(/^Фото:\s*/i, "") ||
                              artwork.photoCredit
                            }
                            date={
                              /CC BY/i.test(artwork.photoCredit)
                                ? "Ліцензія CC BY 4.0"
                                : null
                            }
                            href={null}
                            showDivider={false}
                          />
                        </div>
                      ) : null}
                      {expanded ? (
                        <p className="text-caption text-text-secondary">
                          Знайшли неточність? Напиши нам — перевіримо джерела.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-md">
                      {(expanded ? paragraphs : paragraphs.slice(0, 1)).map(
                        (p, i) => (
                          <p
                            key={i}
                            className="text-body-lg text-text-primary"
                          >
                            {p}
                          </p>
                        ),
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {!expanded ? (
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface via-surface/90 to-transparent"
                  aria-hidden
                />
              ) : null}
            </div>
          </motion.div>

          <motion.div
            className={cn(
              "absolute inset-x-0 bottom-0 z-[26] flex items-center gap-md border-t border-border-subtle bg-surface px-xl pt-md",
              dimmed && "pointer-events-none",
            )}
            style={{
              paddingBottom:
                "max(24px, calc(env(safe-area-inset-bottom, 0px) + 12px))",
            }}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{
              duration: motionTokens.sheetSlide,
              ease: easings.easeOut,
            }}
          >
            <Button
              variant="secondary"
              fullWidth={false}
              className="h-14 min-h-[56px] flex-1 border border-border-subtle"
              onClick={onAskGuide}
            >
              Спитати гіда
            </Button>
            <Button
              variant="primary"
              fullWidth={false}
              className="h-14 min-h-[56px] flex-1 border border-border-button"
              onClick={onContinue}
              aria-label={continueLabel}
            >
              Далі
            </Button>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
