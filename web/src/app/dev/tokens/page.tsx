"use client";

import { MapIllustration } from "@/components/map/MapIllustration";
import { MapPin } from "@/components/map/MapPin";
import { StatusBarSpacer } from "@/components/layout/StatusBarSpacer";
import {
  ArtworkCard,
  BottomSheet,
  Button,
  ChatBubble,
  CheckBadge,
  Chip,
  CityRow,
  FeatureCard,
  IconButton,
  MuseumCard,
  NavBar,
  NumberBadge,
  OptionCard,
  ProgressStepper,
  ScreenHeader,
  SocialButton,
  SourceRow,
  StatCard,
  StatusBadge,
  TextField,
  TimePill,
} from "@/components/ui";
import { useState } from "react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-md border-b border-divider pb-2xl">
      <h2 className="text-overline uppercase text-text-accent">{title}</h2>
      {children}
    </section>
  );
}

const COLORS = [
  ["bg-screen", "bg/screen"],
  ["bg-surface", "bg/surface"],
  ["bg-surface-raised", "bg/surface-raised"],
  ["bg-accent", "bg/accent"],
  ["bg-accent-selected", "bg/accent-selected"],
  ["bg-accent-subtle", "bg/accent-subtle"],
] as const;

export default function TokensPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tab, setTab] = useState<"map" | "collection" | "profile">("map");
  const [chip, setChip] = useState("all");
  const [option, setOption] = useState("daily");
  const [time, setTime] = useState("09:00");

  return (
    <main className="space-y-2xl px-xl pb-[calc(120px+var(--safe-bottom))] pt-md">
      <StatusBarSpacer />
      <ScreenHeader title="Токени і компоненти" subtitle="Stage 1–2 · /dev/tokens" />

      <Section title="Кольори">
        <div className="grid grid-cols-3 gap-sm">
          {COLORS.map(([cls, name]) => (
            <div key={name} className="space-y-2xs">
              <div className={`h-12 rounded-sm border border-border-subtle ${cls}`} />
              <p className="text-caption text-text-secondary">{name}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-sm pt-md">
          <span className="text-text-primary">text/primary</span>
          <span className="text-text-secondary">text/secondary</span>
          <span className="text-text-caption">text/caption</span>
          <span className="text-text-accent">text/accent</span>
        </div>
      </Section>

      <Section title="Типографіка">
        <p className="text-h1">Heading H1</p>
        <p className="text-h2">Heading H2</p>
        <p className="text-h3">Heading H3</p>
        <p className="text-body-lg">Body Large — опис шляху</p>
        <p className="text-body-md">Body Medium — вторинний текст</p>
        <p className="text-body-sm">Body Small</p>
        <p className="text-label-lg">Label Large</p>
        <p className="text-label-md">Label Medium</p>
        <p className="text-caption">Caption · автор · рік</p>
        <p className="text-overline uppercase text-text-accent">Overline</p>
      </Section>

      <Section title="Button · 59:21">
        <div className="space-y-sm">
          <Button>Далі</Button>
          <Button variant="secondary">Шпалери</Button>
          <Button variant="ghost">Уже маю акаунт · Увійти</Button>
          <Button disabled>Далі</Button>
        </div>
      </Section>

      <Section title="Social Button · 83:1297">
        <div className="space-y-sm">
          <SocialButton provider="google" />
          <SocialButton provider="email" />
        </div>
      </Section>

      <Section title="Text Field · 60:13">
        <TextField placeholder="Як до тебе звертатись?" defaultValue="Анна" />
        <TextField
          className="mt-sm"
          placeholder="Місто"
          icon={<span aria-hidden>⌕</span>}
        />
      </Section>

      <Section title="Option Card · 60:46">
        <div className="space-y-sm">
          <OptionCard
            title="Щодня"
            description="Одне нагадування щодня"
            selected={option === "daily"}
            onClick={() => setOption("daily")}
          />
          <OptionCard
            title="Без нагадувань"
            description="Шлях відкривається одразу"
            selected={option === "none"}
            onClick={() => setOption("none")}
          />
        </div>
      </Section>

      <Section title="Chip · 71:657">
        <div className="flex flex-wrap gap-sm">
          {["all", "stolen", "shelter"].map((id) => (
            <Chip key={id} active={chip === id} onClick={() => setChip(id)}>
              {id === "all" ? "Усі" : id === "stolen" ? "Викрадені" : "В укритті"}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Status Badge · 71:651">
        <div className="flex flex-wrap gap-sm">
          <StatusBadge status="stolen" />
          <StatusBadge status="shelter" />
          <StatusBadge status="saved" />
          <StatusBadge status="lost" />
        </div>
      </Section>

      <Section title="Artwork Card · 72:724">
        <div className="grid grid-cols-2 gap-md">
          <ArtworkCard
            title="Великодня заутреня"
            meta="Херсон"
            imageSrc="/art/velykodnia-zautrenia.webp"
            state="lit"
            showStatus
            status="stolen"
          />
          <ArtworkCard title="Сховано" meta="Херсон" state="covered" showStatus status="stolen" />
        </div>
      </Section>

      <Section title="Museum Card · 145:3844">
        <div className="space-y-sm">
          <MuseumCard
            title="Херсонський художній музей"
            city="Херсон"
            status="1/6 відкрито"
            facadeSrc="/museums/kherson.webp"
            state="passed"
          />
          <MuseumCard
            title="Мелітопольський музей"
            city="Мелітополь"
            status="Наступний шлях"
            facadeSrc="/museums/melitopol.webp"
            state="next"
          />
          <MuseumCard
            title="Харківський художній музей"
            city="Харків"
            status="Ще попереду"
            facadeSrc="/museums/kharkiv.webp"
            state="ahead"
          />
        </div>
      </Section>

      <Section title="Bottom Sheet · 72:614">
        <Button onClick={() => setSheetOpen(true)}>Відкрити шторку</Button>
        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} showHandle>
          <p className="text-overline uppercase text-text-accent">Сьогодні</p>
          <h3 className="mt-md text-h2">Сьогодні наш шлях веде до Херсона</h3>
          <p className="mt-sm text-body-md text-text-secondary">
            ≈ 420 км від тебе · Херсонський художній музей
          </p>
          <div className="mt-lg">
            <Button onClick={() => setSheetOpen(false)}>Летимо</Button>
          </div>
        </BottomSheet>
      </Section>

      <Section title="Nav Bar · 72:688">
        <NavBar active={tab} onChange={setTab} />
      </Section>

      <Section title="Chat · Source · 72:698 / 72:700">
        <div className="space-y-sm">
          <ChatBubble role="guide">Привіт! Я гід цієї картини.</ChatBubble>
          <ChatBubble role="user">Де зараз ця картина?</ChatBubble>
        </div>
        <SourceRow
          className="mt-md"
          label="ГУР, реєстр War&Sanctions, картка №1764"
          date="18.12.2024"
          href="https://war-sanctions.gur.gov.ua/en/stolen/objects/1764"
        />
      </Section>

      <Section title="Map Pin · Map · 71:684 / 61:46">
        <div className="h-64 overflow-hidden rounded-md border border-border-subtle bg-screen">
          <MapIllustration>
            <MapPin x={140} y={140} label="Вінниця" variant="start" pulsing />
            <MapPin x={280} y={220} label="Херсон" variant="target" pulsing />
          </MapIllustration>
        </div>
      </Section>

      <Section title="Інше">
        <ProgressStepper total={4} current={2} />
        <div className="mt-md flex gap-sm">
          <StatCard value={1} label="у світлі" />
          <StatCard value={1} label="музеї" />
          <StatCard value={1} label="міста" />
        </div>
        <div className="mt-md flex flex-wrap gap-sm">
          {["09:00", "13:00", "20:00", "Інший"].map((t) => (
            <TimePill key={t} selected={time === t} onClick={() => setTime(t)}>
              {t}
            </TimePill>
          ))}
        </div>
        <div className="mt-md flex items-center gap-md">
          <NumberBadge value={1} />
          <IconButton label="Закрити">×</IconButton>
        </div>
        <FeatureCard
          className="mt-md"
          number={1}
          title="Твій шлях"
          description="Щодня — одне місто і один твір"
        />
        <div className="mt-md rounded-md bg-surface">
          <CityRow name="Вінниця" oblast="Вінницька" selected />
          <CityRow name="Херсон" oblast="Херсонська" />
        </div>
        <CheckBadge className="mt-2xl" label="Шпалери збережено" />
      </Section>
    </main>
  );
}
