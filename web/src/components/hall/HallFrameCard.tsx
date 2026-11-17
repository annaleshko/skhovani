"use client";

import { StatusBadge } from "@/components/ui";
import type { Artwork } from "@/data/types";
import { cn } from "@/lib/cn";
import { motion } from "framer-motion";
import Image from "next/image";

type Props = {
  artwork: Artwork;
  open: boolean;
  lit: boolean;
  shaking?: boolean;
  frameSrc: string;
  onTap: () => void;
  className?: string;
};

/** Single hall frame: lit artwork or covered (blurred) dark frame. */
export function HallFrameCard({
  artwork,
  open,
  lit,
  shaking,
  frameSrc,
  onTap,
  className,
}: Props) {
  const src =
    artwork.image ??
    (artwork.slug === "skifske-zoloto-melitopolia"
      ? "/art/skifske-zoloto-melitopolia.webp"
      : null);

  return (
    <motion.button
      type="button"
      onClick={onTap}
      aria-label={
        open
          ? `${artwork.title}. Торкнись картини, щоб почати тур`
          : `${artwork.title}. Сховано`
      }
      className={cn(
        "relative flex w-[232px] shrink-0 snap-center flex-col items-center",
        className,
      )}
      animate={shaking ? { x: [0, -4, 4, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative h-[180px] w-[232px]">
        <Image
          src={frameSrc}
          alt=""
          fill
          className="object-cover drop-shadow-[1px_8px_12px_rgba(0,0,0,0.25)]"
          sizes="232px"
        />
        <div className="absolute inset-[12%] overflow-hidden">
          {src ? (
            <Image
              src={src}
              alt=""
              fill
              className={cn(
                "object-cover transition-opacity duration-300",
                lit ? "opacity-100" : "opacity-40 blur-[2px]",
              )}
              sizes="180px"
            />
          ) : (
            <div className="size-full bg-surface-raised" />
          )}
          {!open ? (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[6px]" />
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "mt-md flex w-[226px] flex-col items-center gap-2xs text-center transition-opacity duration-300",
          lit ? "opacity-100" : "opacity-40",
        )}
      >
        <p className="text-h3 text-text-primary">{artwork.title}</p>
        <p className="text-body-md text-text-caption">
          {artwork.author} · {artwork.year}
        </p>
        <StatusBadge status={artwork.status} className="mt-2xs" />
      </div>
    </motion.button>
  );
}
