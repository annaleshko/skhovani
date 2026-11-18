import type { Artwork } from "@/data/types";
import { getChatRules } from "@/data";

export function authorSurname(author: string): string {
  const parts = author.trim().split(/\s+/);
  return parts[parts.length - 1] ?? author;
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

  const detailLine = detailTitle
    ? `\nКористувач відкрив чат із деталі твору: «${detailTitle}». Відповідай з урахуванням цієї деталі, якщо питання про неї.\n`
    : "";

  return `${rules}

Ти — гід картини «${artwork.title}» (${artwork.author}). Відповідай українською, 2–4 речення, тепло й на «ти».
Поверни ТІЛЬКИ валідний JSON без markdown:
{"answer":"...","sourceIds":["s1"],"followUps":["...","..."]}
sourceIds — лише id з переліку джерел нижче (може бути []). followUps — 2 короткі наступні питання українською.
${detailLine}
СТАТУС: ${artwork.statusRaw} (${artwork.status})
МУЗЕЙ: ${artwork.museum}
РІК (як у паспорті): ${artwork.year}
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

ДЖЕРЕЛА (допустимі sourceIds):
${sources}`;
}
