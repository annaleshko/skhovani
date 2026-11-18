"use client";

import { Button, Chip, SourceRow, StatusBadge } from "@/components/ui";
import { PASSPORT_LAYOUT } from "@/components/tour/FramedArtwork";
import type { Artwork } from "@/data/types";
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
  onWallpaper: () => void;
  onAskGuide: () => void;
  className?: string;
};

/**
 * Figma 16 / 16б–16д — passport sheet under the framed artwork.
 * Collapsed top y464; expanded y112; pinned actions y724.
 * Path completion happens on reaching 16 (HallExperience) — no «Завершити шлях».
 */
export function AboutSheet({
  artwork,
  open,
  dimmed = false,
  onWallpaper,
  onAskGuide,
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
              bottom: `calc(${L.actions.h / 844} * 100dvh)`,
            }}
            initial={{ y: 48, opacity: 0, top: `${(L.sheetCollapsed.y / 844) * 100}dvh` }}
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
                  <h2 className="text-h2 text-text-primary">{artwork.title}</h2>
                  <p className="mt-2xs text-body-md text-text-secondary">
                    {artwork.author} ·{" "}
                    {artwork.year.match(/\d{4}/)?.[0] ??
                      artwork.year.split(/[;(]/)[0]?.trim() ??
                      artwork.year}
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
              className="min-h-0 flex-1 overflow-y-auto px-xl py-lg"
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
            </div>
          </motion.div>

          {/* Pinned actions — Figma y724 h88 */}
          <motion.div
            className={cn(
              "absolute inset-x-0 z-[26] flex items-center gap-md border-t border-border-subtle bg-surface px-xl",
              dimmed && "pointer-events-none",
            )}
            style={{
              top: `calc(${L.actions.y / 844} * 100dvh)`,
              height: `calc(${L.actions.h / 844} * 100dvh)`,
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
              onClick={onWallpaper}
            >
              Шпалери
            </Button>
            <Button
              variant="primary"
              fullWidth={false}
              className="h-14 min-h-[56px] flex-1 border border-border-button"
              onClick={onAskGuide}
            >
              Спитати гіда
            </Button>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
