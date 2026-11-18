"use client";

/**
 * Soft overlay on phone landscape — demo is portrait-only.
 * Hidden on md+ (desktop preview / wide shells).
 */
export function LandscapeLock() {
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[9999] hidden items-center justify-center bg-scrim px-xl landscape:flex md:hidden"
      role="dialog"
      aria-live="polite"
      aria-label="Поверни телефон вертикально"
    >
      <p className="max-w-[280px] text-center text-h3 text-text-primary">
        Поверни телефон вертикально
      </p>
    </div>
  );
}
