import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col justify-end gap-lg px-xl pb-[calc(48px+var(--safe-bottom))] pt-[calc(48px+var(--safe-top))]">
      <p className="text-overline uppercase text-text-accent">Сховані</p>
      <h1 className="text-h1 text-text-primary">Твори, яких зараз не видно</h1>
      <p className="text-body-lg text-text-secondary">
        Але їх можна побачити. Щодня — один шлях до міста, звідки твори вкрали, вивезли або
        сховали.
      </p>
      <Link
        href="/dev/tokens"
        className="inline-flex h-control items-center justify-center rounded-pill bg-accent text-label-lg text-text-on-accent"
      >
        Дизайн-токени
      </Link>
    </main>
  );
}
