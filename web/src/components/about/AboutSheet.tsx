"use client";

import { Button, Chip, SourceRow, StatusBadge } from "@/components/ui";
import { PASSPORT_LAYOUT } from "@/components/tour/FramedArtwork";
import type { Artwork } from "@/data/types";
import { displayHeadline, displayYear } from "@/lib/artwork-display";
import { cn } from "@/lib/cn";
import { defaultSpring, easings, motionTokens } from "@/lib/motion";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";

type TabId = "history" | "about" | "author" | "sources";

const TABS: { id: TabId; label: string }[] = [
  { id: "history", label: "Історія" },
  { id: "about", label: "Про твір" },
  { id: "author", label: "Автор" },
  { id: "sources", label: "Джерела" },
];

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

/**
 * Figma 16 — passport sheet under the framed artwork.
 * Pinned bar: «Спитати гіда» + «Далі — <місто>» (product decision 2026-11-18).
 * Wallpaper lives on the header download icon → screen 11.
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
  const dragStartY = useRef<number | null>(null);

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

  const onHandlePointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onHandlePointerUp = (e: React.PointerEvent) => {
    if (dragStartY.current == null) return;
    const dy = e.clientY - dragStartY.current;
    dragStartY.current = null;
    if (Math.abs(dy) < 8) {
      setExpanded((v) => !v);
      return;
    }
    if (dy < -24) setExpanded(true);
    if (dy > 24) setExpanded(false);
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
              // Sit above the pinned action bar (+ safe area)
              bottom: "calc(72px + var(--safe-bottom))",
            }}
            initial={{
              y: 48,
              opacity: 0,
              top: `${(L.sheetCollapsed.y / 844) * 100}dvh`,
            }}
            animate={{
              y: 0,
              opacity: 1,
              top: `${(sheetTop / 844) * 100}dvh`,
            }}
            exit={{ y: 48, opacity: 0 }}
            transition={defaultSpring}
          >
            <button
              type="button"
              aria-label={expanded ? "Згорнути" : "Розгорнути"}
              className="flex min-h-[44px] w-full shrink-0 flex-col items-center justify-center pt-sm"
              onPointerDown={onHandlePointerDown}
              onPointerUp={onHandlePointerUp}
            >
              <span className="h-1 w-10 rounded-pill bg-border-control/50" />
            </button>

            <div className="shrink-0 px-xl">
              <div className="flex flex-col gap-md">
                <div>
                  <h2 className="text-h2 text-text-primary">{title}</h2>
                  <p className="mt-2xs text-body-md text-text-secondary">
                    {artwork.author} · {displayYear(artwork.year)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-sm">
                  <StatusBadge status={artwork.status} />
                  {/* TODO(copy): status meta date from passport */}
                  <span className="text-caption text-text-secondary">
                    восени 2022
                  </span>
                </div>
              </div>

              <div className="mt-2xl flex gap-sm overflow-x-auto pb-xs">
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

            <div
              className="relative min-h-0 flex-1 overflow-y-auto px-xl py-lg"
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

              {/* Collapsed: fade last lines into the bar — never cut mid-line */}
              {!expanded ? (
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface via-surface/90 to-transparent"
                  aria-hidden
                />
              ) : null}
            </div>
          </motion.div>

          {/* Pinned actions — flush on safe-area bottom */}
          <motion.div
            className={cn(
              "absolute inset-x-0 bottom-0 z-[26] flex items-center gap-md border-t border-border-subtle bg-surface px-xl pt-md",
              dimmed && "pointer-events-none",
            )}
            style={{
              paddingBottom: "calc(12px + var(--safe-bottom))",
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
            >
              {continueLabel}
            </Button>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
