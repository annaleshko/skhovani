"use client";

import { Button, Chip, SourceRow, StatusBadge } from "@/components/ui";
import type { Artwork } from "@/data/types";
import { cn } from "@/lib/cn";
import { defaultSpring, easings, motionTokens } from "@/lib/motion";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

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
  showFinish?: boolean;
  onWallpaper: () => void;
  onAskGuide: () => void;
  onReplayTour: () => void;
  onFinishPath: () => void;
  className?: string;
};

/** Figma 16 / 16б–16д — «Про картину» sheet with tabs. */
export function AboutSheet({
  artwork,
  open,
  showFinish: showFinishProp = true,
  onWallpaper,
  onAskGuide,
  onReplayTour,
  onFinishPath,
}: Props) {
  const [tab, setTab] = useState<TabId>("history");
  const [expanded, setExpanded] = useState(false);
  const [seenTab, setSeenTab] = useState(false);
  const [finishReady, setFinishReady] = useState(false);

  useEffect(() => {
    if (!open || !showFinishProp) return;
    const t = setTimeout(() => setFinishReady(true), 5000);
    return () => clearTimeout(t);
  }, [open, showFinishProp]);

  const selectTab = (id: TabId) => {
    setTab(id);
    setSeenTab(true);
  };

  const paragraphs =
    tab === "history"
      ? artwork.tabs.history
      : tab === "about"
        ? artwork.tabs.about
        : tab === "author"
          ? artwork.tabs.author
          : [];

  const showFinish = showFinishProp && (seenTab || finishReady);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={cn(
            "absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-lg border-t border-border-subtle bg-surface",
            expanded ? "top-[120px]" : "max-h-[62dvh]",
          )}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={defaultSpring}
        >
          <button
            type="button"
            aria-label={expanded ? "Згорнути" : "Розгорнути"}
            className="mx-auto mt-md h-1 w-10 shrink-0 rounded-pill bg-border-control/50"
            onClick={() => setExpanded((e) => !e)}
          />

          <div className="shrink-0 px-xl pt-md">
            <div className="flex items-start justify-between gap-md">
              <div className="min-w-0">
                <h2 className="text-h2 text-text-primary">{artwork.title}</h2>
                <p className="mt-2xs text-body-md text-text-caption">
                  {artwork.author} · {artwork.year}
                </p>
                <div className="mt-sm flex flex-wrap items-center gap-sm">
                  <StatusBadge status={artwork.status} />
                  {/* TODO(copy): status meta date from passport */}
                  <span className="text-caption text-text-secondary">восени 2022</span>
                </div>
              </div>
              <button
                type="button"
                aria-label="Повторити тур"
                className="flex size-11 items-center justify-center rounded-full bg-surface-raised text-text-accent"
                onClick={onReplayTour}
              >
                ▶
              </button>
            </div>

            <div className="relative mt-lg flex gap-lg overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTab(t.id)}
                  className={cn(
                    "relative shrink-0 pb-sm text-label-md",
                    tab === t.id ? "text-text-primary" : "text-text-secondary",
                  )}
                >
                  {t.label}
                  {tab === t.id ? (
                    <motion.span
                      layoutId="about-tab-underline"
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-accent"
                      transition={{ duration: motionTokens.tabUnderline, ease: easings.easeOut }}
                    />
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto px-xl py-md"
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
                  <div>
                    {artwork.sources.map((s) =>
                      s.url ? (
                        <SourceRow
                          key={s.id}
                          label={s.label}
                          date={s.note}
                          href={s.url}
                        />
                      ) : (
                        <div
                          key={s.id}
                          className="border-b border-divider py-md text-label-md text-text-secondary"
                        >
                          {s.label}
                          {s.note ? (
                            <span className="mt-2xs block text-caption">{s.note}</span>
                          ) : null}
                        </div>
                      ),
                    )}
                    <p className="mt-lg text-caption text-text-secondary">
                      Фото: {artwork.photoCredit}
                    </p>
                    <a
                      href="mailto:todo@example.com?subject=Помилка%20у%20Сховані"
                      className="mt-md inline-block min-h-[44px] text-label-md text-text-accent"
                    >
                      {/* TODO(copy): real report email */}
                      Повідомити про помилку
                    </a>
                  </div>
                ) : (
                  <div className="space-y-md">
                    {paragraphs.map((p, i) => (
                      <p key={i} className="text-body-md text-text-secondary">
                        {p}
                      </p>
                    ))}
                  </div>
                )}

                {showFinish ? (
                  <div className="mt-2xl pb-md">
                    <Button onClick={onFinishPath}>Завершити шлях</Button>
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex shrink-0 gap-sm border-t border-border-subtle px-xl py-md pb-[calc(16px+var(--safe-bottom))]">
            <Chip onClick={onWallpaper}>Шпалери</Chip>
            <Chip onClick={onAskGuide}>Спитати гіда</Chip>
            {showFinish ? (
              <button
                type="button"
                onClick={onFinishPath}
                className="ml-auto text-label-md text-text-accent"
              >
                Завершити шлях
              </button>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
