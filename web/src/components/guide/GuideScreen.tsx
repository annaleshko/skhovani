"use client";

import { IconButton } from "@/components/ui";
import type { Artwork } from "@/data/types";
import { getSource } from "@/data";
import { displayHeadline } from "@/lib/artwork-display";
import { authorSurname } from "@/lib/guide-prompt";
import { easings, motionTokens, useReducedMotionSafe } from "@/lib/motion";
import { useAppState } from "@/state/AppState";
import type { ChatMessage } from "@/state/storage";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

type Props = {
  artwork: Artwork;
  open: boolean;
  /** Prefill composer (not auto-sent). */
  prefill?: string | null;
  /** Attached detail from 08. */
  detailTitle?: string | null;
  onBack: () => void;
};

type GuideApiOk = {
  answer: string;
  sourceIds: string[];
  followUps?: string[];
  fallback?: boolean;
};

/**
 * 09 · Гід (+ conversation 20б).
 * OpenAI via `/api/guide`; history in localStorage per artwork.
 */
export function GuideScreen({
  artwork,
  open,
  prefill = null,
  detailTitle = null,
  onBack,
}: Props) {
  const reduced = useReducedMotionSafe();
  const { user, chatHistory, setChatHistory } = useAppState();
  const key = String(artwork.id);
  const messages = useMemo(
    () => chatHistory[key] ?? [],
    [chatHistory, key],
  );
  const [draft, setDraft] = useState(() => prefill ?? "");
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState(false);
  const [lastFailed, setLastFailed] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Consume attached detail on first send after open from 08. */
  const [attachedDetail, setAttachedDetail] = useState(detailTitle);
  /** iOS/Android keyboard: keep composer above the keyboard. */
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      // Prefill can be long — keep the start of the question visible.
      input.scrollLeft = 0;
      try {
        input.setSelectionRange(0, 0);
      } catch {
        /* input type may not support selection */
      }
    }, 80);
    return () => {
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
    };
  }, [open, artwork.id]);

  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(inset);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    const last = el.lastElementChild as HTMLElement | null;
    if (last) {
      last.scrollIntoView({ block: "end", behavior: "instant" as ScrollBehavior });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, waiting, open, error, keyboardInset]);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || waiting) return;

      setError(false);
      setLastFailed(null);
      const detail = attachedDetail;
      setAttachedDetail(null);

      const userMsg: ChatMessage = {
        role: "user",
        content: q,
        detailTitle: detail ?? undefined,
      };
      const next = [...messages, userMsg];
      setChatHistory(artwork.id, next);
      setDraft("");
      setWaiting(true);

      try {
        const res = await fetch("/api/guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            artworkId: artwork.id,
            messages: next.slice(-6).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            detail: detail ? { zoneOrStopTitle: detail } : null,
            userName: user.nameVocative,
          }),
        });

        if (!res.ok) {
          throw new Error(`guide_${res.status}`);
        }
        const data = (await res.json()) as GuideApiOk;
        const guideMsg: ChatMessage = {
          role: "guide",
          content: data.answer,
          sourceIds: data.sourceIds ?? [],
          followUps: data.followUps,
          fallback: Boolean(data.fallback),
        };
        setChatHistory(artwork.id, [...next, guideMsg]);
      } catch {
        setError(true);
        setLastFailed(q);
        setChatHistory(artwork.id, next);
      } finally {
        setWaiting(false);
      }
    },
    [
      artwork.id,
      attachedDetail,
      messages,
      setChatHistory,
      user.nameVocative,
      waiting,
    ],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(draft);
  };

  const surname = authorSurname(artwork.author);
  const empty = messages.length === 0;
  const suggestions = artwork.chat.defaultQuestions.slice(0, 3);
  /** Persistent chips: followUps → starters → detail chip; deduped, max 8. */
  const persistentChips = useMemo(() => {
    const lastGuide = [...messages].reverse().find((m) => m.role === "guide");
    const followUps = lastGuide?.followUps?.slice(0, 2) ?? [];
    const out: string[] = [];
    const seen = new Set<string>();
    const push = (q: string | null | undefined) => {
      const t = (q ?? "").trim();
      if (!t || seen.has(t)) return;
      seen.add(t);
      out.push(t);
    };
    for (const f of followUps) push(f);
    for (const q of artwork.chat.defaultQuestions) push(q);
    if (attachedDetail) {
      push(`Розкажи більше про: ${attachedDetail}`);
    }
    return out.slice(0, 8);
  }, [artwork.chat.defaultQuestions, attachedDetail, messages]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="absolute inset-0 z-50 flex h-dvh max-h-dvh flex-col overflow-hidden bg-screen text-text-primary"
          initial={reduced ? false : { x: "100%" }}
          animate={{ x: 0 }}
          exit={reduced ? { opacity: 0 } : { x: "100%" }}
          transition={
            reduced
              ? { duration: motionTokens.reducedCrossfade }
              : { duration: motionTokens.pushPop, ease: easings.easeOut }
          }
        >
          {/* Header — below iOS status bar; stays fixed while keyboard opens */}
          <div
            className="flex shrink-0 items-center gap-md border-b border-border-subtle px-xl pb-md"
            style={{
              paddingTop:
                "max(40px, calc(env(safe-area-inset-top, 0px) + 8px))",
            }}
          >
            <IconButton
              label="Назад до картини"
              className="size-10 min-h-10 min-w-10 border border-border-subtle bg-surface"
              onClick={onBack}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ui/icon-back.svg" alt="" width={20} height={20} />
            </IconButton>
            <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-surface">
              {artwork.image ? (
                <Image
                  src={artwork.image}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="40px"
                  unoptimized
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-label-lg text-text-primary">Гід</p>
              <p className="truncate text-caption text-text-secondary">
                {displayHeadline(artwork)} · {surname}
              </p>
            </div>
          </div>

          {/* Messages — empty state bottom-aligned (design)*/}
          <div
            ref={listRef}
            className={
              empty
                ? "flex min-h-0 flex-1 flex-col justify-end overflow-y-auto px-xl pb-md pt-xl"
                : "flex min-h-0 flex-1 flex-col gap-md overflow-y-auto px-xl pb-md pt-xl"
            }
          >
            {empty ? (
              <div className="flex flex-col gap-md">
                <div className="flex size-12 items-center justify-center rounded-full bg-surface-raised shadow-[0_0_6px_var(--color-bg-accent)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/ui/icon-spark.svg" alt="" width={20} height={20} />
                </div>
                <p className="text-h3 text-text-primary">Я гід цієї картини</p>
                <p className="text-body-md text-text-secondary">
                  Питай про сюжет, автора чи долю твору. Відповідаю лише з
                  перевірених джерел.
                </p>
                <div className="flex flex-col gap-sm pt-sm">
                  <p className="text-overline uppercase tracking-[0.08em] text-text-secondary">
                    Можна почати з цього
                  </p>
                  {suggestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={waiting}
                      onClick={() => void send(q)}
                      className="flex min-h-[44px] w-full items-center gap-md rounded-md bg-surface px-lg py-md text-left text-label-md text-text-primary"
                    >
                      <span className="min-w-0 flex-1">{q}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/ui/icon-chevron-right.svg"
                        alt=""
                        width={20}
                        height={20}
                        className="shrink-0 opacity-60"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-md">
                {messages.map((m, i) => (
                  <motion.div
                    key={`${m.role}-${i}-${m.content.slice(0, 12)}`}
                    className={
                      m.role === "user"
                        ? "ml-8 self-end"
                        : "mr-8 self-start"
                    }
                    initial={
                      reduced ? false : { opacity: 0, y: m.role === "user" ? 8 : 4 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: motionTokens.stopCrossfade,
                      ease: easings.easeOut,
                    }}
                  >
                    {m.detailTitle ? (
                      <p className="mb-2xs text-caption text-text-accent">
                        Деталь: {m.detailTitle}
                      </p>
                    ) : null}
                    <div
                      className={
                        m.role === "user"
                          ? "rounded-lg border border-border-accent bg-transparent px-lg py-md text-body-md text-text-primary"
                          : "rounded-lg bg-surface px-lg py-md text-body-md text-text-primary"
                      }
                    >
                      {m.content}
                      {m.role === "guide" && m.sourceIds?.length
                        ? m.sourceIds.map((sid) => {
                            const src = getSource(artwork.id, sid);
                            if (!src) return null;
                            const label = [src.label, src.note]
                              .filter(Boolean)
                              .join(", ");
                            return src.url ? (
                              <a
                                key={sid}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-sm flex min-h-[44px] items-center gap-sm text-label-md text-text-accent"
                              >
                                <span aria-hidden>↗</span>
                                {label}
                              </a>
                            ) : (
                              <span
                                key={sid}
                                className="mt-sm block text-label-md text-text-secondary"
                              >
                                {label}
                              </span>
                            );
                          })
                        : null}
                      {/* fallback/curated flags stay in API payload only */}
                    </div>
                  </motion.div>
                ))}

                {waiting ? (
                  <div className="mr-8 self-start rounded-lg bg-surface px-lg py-md">
                    <span className="inline-flex gap-1" aria-label="Гід друкує">
                      {[0, 1, 2].map((d) => (
                        <motion.span
                          key={d}
                          className="size-1.5 rounded-full bg-text-secondary"
                          animate={
                            reduced
                              ? { opacity: 0.6 }
                              : { opacity: [0.3, 1, 0.3] }
                          }
                          transition={{
                            duration: 0.9,
                            repeat: Infinity,
                            delay: d * 0.15,
                          }}
                        />
                      ))}
                    </span>
                  </div>
                ) : null}

                <AnimatePresence>
                  {error ? (
                    <motion.div
                      className="rounded-lg border border-border-subtle bg-surface px-lg py-md"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: motionTokens.reducedCrossfade,
                      }}
                    >
                      <p className="text-body-md text-text-primary">
                        Гід зараз не відповідає
                      </p>
                      <button
                        type="button"
                        className="mt-sm min-h-[44px] text-label-md text-text-accent"
                        disabled={waiting}
                        onClick={() => {
                          if (lastFailed) void send(lastFailed);
                        }}
                      >
                        Спробувати ще раз
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Persistent suggestions — above composer whenever chat has messages */}
          {!empty && persistentChips.length > 0 ? (
            <div
              className="relative shrink-0"
              style={{
                maskImage:
                  "linear-gradient(to right, #000 0%, #000 calc(100% - 28px), transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to right, #000 0%, #000 calc(100% - 28px), transparent 100%)",
              }}
            >
              <ul
                className="flex list-none gap-sm overflow-x-auto px-xl py-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                aria-label="Пропозиції питань"
              >
                {persistentChips.map((q) => (
                  <li key={q} className="shrink-0">
                    <button
                      type="button"
                      disabled={waiting}
                      onClick={() => void send(q)}
                      className="min-h-10 shrink-0 rounded-pill border border-border-accent bg-surface px-md py-sm text-label-md text-text-accent disabled:opacity-50"
                    >
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Composer — only this lifts for the keyboard; shell stays full-height */}
          <form
            onSubmit={onSubmit}
            className="flex shrink-0 items-center gap-sm px-xl pt-md"
            style={{
              paddingBottom: `max(24px, calc(env(safe-area-inset-bottom, 0px) + 12px + ${keyboardInset}px))`,
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Спитай гіда…"
              disabled={waiting}
              className="h-14 min-h-[56px] min-w-0 flex-1 rounded-md border border-border-subtle bg-surface px-lg text-[16px] leading-normal text-text-primary outline-none placeholder:text-text-secondary focus:border-border-accent"
              maxLength={800}
              aria-label="Спитай гіда"
              enterKeyHint="send"
              autoCapitalize="sentences"
            />
            <button
              type="submit"
              disabled={waiting || !draft.trim()}
              aria-label="Надіслати"
              className="flex size-14 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-accent text-text-on-accent enabled:active:opacity-90 disabled:opacity-40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ui/icon-send.svg" alt="" width={20} height={20} />
            </button>
          </form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
