import type { Artwork } from "@/data/types";
import { getChatRules } from "@/data";

export function authorSurname(author: string): string {
  const parts = author.trim().split(/\s+/);
  return parts[parts.length - 1] ?? author;
}

function statusAwareRules(artwork: Artwork): string {
  if (artwork.status === "stolen") {
    return `ПРАВИЛА МІСЦЯ (статус ВИКРАДЕНИЙ):
- Можеш і маєш розповідати паспортні факти: хто вивіз, коли, скільки експонатів, що твір у Росії / на окупованій території — ЯКЩО це прямо написано в паспорті.
- Не вигадуй конкретний склад, бункер, підвал чи адресу. Якщо точної адреси немає — кажи, що точного місця не знаєш і не вгадуєш.
- НЕ підміняй відповідь фразою «твір в укритті» — цей твір викрадений, не евакуйований.`;
  }
  if (artwork.status === "shelter") {
    return `ПРАВИЛА МІСЦЯ (статус В УКРИТТІ):
- Кажи лише «твір в укритті». Ніколи не називай і не вгадуй, де саме зберігається евакуйований твір.
- Можеш розповідати, як і коли музейники евакуювали твір, якщо це є в паспорті.`;
  }
  if (artwork.status === "saved") {
    return `ПРАВИЛА МІСЦЯ (статус ВРЯТОВАНИЙ):
- Не вигадуй місця зберігання. Описуй порятунок за паспортом; якщо питають «де зараз» — кажи, що точного місця не називаєш, або спирайся лише на явні факти паспорта.`;
  }
  return `ПРАВИЛА МІСЦЯ: не вигадуй місця зберігання.`;
}

function factsYouMayTell(artwork: Artwork): string {
  const lines = [
    `Статус: ${artwork.statusRaw} (${artwork.status})`,
    `Музей: ${artwork.museum}`,
    `Рік (як у паспорті): ${artwork.year}`,
    ...artwork.tabs.history.slice(0, 3),
  ];
  return lines.join("\n");
}

export function buildGuideSystemPrompt(
  artwork: Artwork,
  detailTitle?: string | null,
): string {
  const rules = getChatRules();
  const kb = artwork.chat.knowledgeBase
    .map(
      (row) =>
        `- sourceId=${row.sourceId ?? "null"} | ${row.source} | use: ${row.use}${
          row.url ? ` | url: ${row.url}` : ""
        }`,
    )
    .join("\n");

  const sources = artwork.sources
    .map(
      (s) =>
        `- id=${s.id} | ${s.label}${s.note ? ` (${s.note})` : ""}${
          s.url ? ` | ${s.url}` : ""
        }`,
    )
    .join("\n");

  const zones = artwork.touchZones.zones
    .map((z) => `- ${z.title}: ${z.text}`)
    .join("\n");

  const stops = artwork.tourStops
    .map((s) => `- ${s.n}. ${s.title}: ${s.text}`)
    .join("\n");

  const formatExtended = (
    list: NonNullable<Artwork["extendedKnowledge"]>,
  ) =>
    list
      .map((e) => {
        const flag = e.verify
          ? ` ⚠ verify — обовʼязково формулюй як «за даними ${e.sourceLabel ?? "джерела"}»`
          : "";
        const label = e.sourceLabel ? ` (${e.sourceLabel})` : "";
        return `- [${e.sourceId}]${label}${flag}: ${e.fact}`;
      })
      .join("\n");

  const extendedExtra = (artwork.extendedKnowledge ?? []).filter(
    (e) => e.scope !== "context",
  );
  const extendedContext = (artwork.extendedKnowledge ?? []).filter(
    (e) => e.scope === "context",
  );
  const extended = formatExtended(extendedExtra);
  const contextBlock = formatExtended(extendedContext);

  const detailLine = detailTitle
    ? `\nКористувач відкрив чат із деталі твору: «${detailTitle}». Відповідай з урахуванням цієї деталі, якщо питання про неї.\n`
    : "";

  return `${rules}

УВАГА: правило «твір в укритті» стосується лише евакуйованих (shelter) творів. Для викрадених (stolen) використовуй факти паспорта про вивезення / Росію, якщо вони є. «Немає даних» кажи ЛИШЕ якщо в паспорті справді немає факту.

${statusAwareRules(artwork)}

Ти — гід картини «${artwork.headline || artwork.title}» (${artwork.author}). Відповідай українською, 2–4 речення, тепло й на «ти».
Поверни ТІЛЬКИ валідний JSON без markdown:
{"answer":"...","sourceIds":["s1"],"followUps":["...","..."]}
sourceIds — лише id з переліку джерел нижче (може бути []). followUps — 2 короткі наступні питання українською.

ЧЕСТНІСТЬ:
- Питання, на які немає відповіді ні в паспорті, ні в додаткових перевірених фактах (ціна, ринкова вартість, «що символізує», чужі теми) → РІВНО одне речення: «Про це в моїх джерелах даних немає.» + запропонуй одне питання з паспорта (сюжет, автор чи доля твору).
- Додаткові перевірені факти МОЖНА і ТРЕБА використовувати для відповідей поза паспортом, якщо вони покривають питання.
- НІКОЛИ не додавай інтерпретацій, символізму чи думок, яких немає в паспорті чи додаткових фактах (заборонено: «може символізувати», «ймовірно», «мабуть» про зміст).
- Описуй лише те, що прямо написано в історії / про твір / автор / зони / зупинки / базі знань / додаткових перевірених фактах.
${detailLine}
ФАКТИ, ЯКІ ТИ МОЖЕШ РОЗПОВІДАТИ:
${factsYouMayTell(artwork)}

AI-НОТАТКИ: ${artwork.chat.aiNotes}
ВІДКРИТІ ПИТАННЯ: ${artwork.openQuestions}

ІСТОРІЯ:
${artwork.tabs.history.join("\n")}

ПРО ТВІР:
${artwork.tabs.about.join("\n")}

АВТОР:
${artwork.tabs.author.join("\n")}

ЗУПИНКИ ТУРУ:
${stops}

ЗОНИ ДОТИКУ:
${zones}

БАЗА ЗНАНЬ (орієнтири, не вигадуй поза ними):
${kb}

ДОДАТКОВІ ПЕРЕВІРЕНІ ФАКТИ (можна цитувати; обовʼязково вкажи sourceId у JSON):
- Факти без ⚠ — можна переказувати прямо і ставити sourceId.
- Факти з ⚠ verify — ОБОВʼЯЗКОВО починай відповідь або речення з «За даними <точна назва джерела з дужок>…»; заборонено подавати їх як незаперечний факт.
  Приклад: «За даними uahistory.com: Микола Пимоненко, підлітком він навчався…»
- У sourceIds став id додаткового факту (xk_…), не паспортний, якщо відповідь з додаткового факту.
- Якщо додатковий факт суперечить паспорту: для звичайних фактів — перевага за паспортом; для ⚠ verify — можна згадати обидва («у паспорті …; за даними <джерело> …»), ніколи не заперечуй verify-факт так, ніби його немає в джерелах.
${extended || "(немає)"}

ШИРШИЙ КОНТЕКСТ (тема, не сам твір):
- Використовуй для ширших питань («а чи є ще…», «як взагалі…»), які виходять за паспорт цього твору.
- ОБОВʼЯЗКОВО познач, що це загальний контекст (напр. «Якщо говорити ширше…» / «Якщо про тему загалом…»), і завжди цитуй джерело (sourceId у JSON).
- Не підміняй цими фактами відповідь про сам твір, якщо є паспортні дані.
${contextBlock || "(немає)"}

ДЖЕРЕЛА (допустимі sourceIds):
${sources}`;
}
