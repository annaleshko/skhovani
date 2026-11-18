import {
  findCuratedDefaultAnswer,
  findFallbackAnswer,
  passportSnippetsForQuestion,
} from "@/data/fallback-answers";
import { getArtwork } from "@/data";
import { buildGuideSystemPrompt } from "@/lib/guide-prompt";
import {
  isLocationTrapQuestion,
  looksLikeNoDataShrug,
  looksLikeSpeculation,
  sanitizeGuideAnswer,
} from "@/lib/guide-safety";
import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Log once per server process when the key is absent. */
let loggedMissingOpenAiKey = false;

type InMessage = { role: "user" | "guide" | "assistant"; content: string };

type Body = {
  artworkId: number;
  messages: InMessage[];
  detail?: { zoneOrStopTitle?: string } | null;
  userName?: string;
};

const MAX_INPUT = 800;
const bucket = new Map<string, { tokens: number; updated: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const row = bucket.get(ip) ?? { tokens: 24, updated: now };
  const elapsed = (now - row.updated) / 1000;
  row.tokens = Math.min(24, row.tokens + elapsed * 0.4);
  row.updated = now;
  if (row.tokens < 1) {
    bucket.set(ip, row);
    return false;
  }
  row.tokens -= 1;
  bucket.set(ip, row);
  return true;
}

function validateSourceIds(artworkId: number, ids: unknown): string[] {
  const art = getArtwork(artworkId);
  if (!art || !Array.isArray(ids)) return [];
  const allowed = new Set(art.sources.map((s) => s.id));
  for (const e of art.extendedKnowledge ?? []) {
    allowed.add(e.sourceId);
  }
  return ids
    .filter((id): id is string => typeof id === "string")
    .filter((id) => allowed.has(id));
}

function fallbackResponse(artworkId: number, question: string) {
  const art = getArtwork(artworkId);
  const fb = findFallbackAnswer(artworkId, question);
  return {
    answer: sanitizeGuideAnswer(fb.answer, art?.status ?? "stolen"),
    sourceIds: validateSourceIds(artworkId, fb.sourceIds),
    followUps: [] as string[],
    fallback: true as const,
    curated: false as const,
  };
}

function curatedResponse(artworkId: number, question: string) {
  const art = getArtwork(artworkId);
  const fb = findCuratedDefaultAnswer(artworkId, question);
  if (!fb) return null;
  return {
    answer: sanitizeGuideAnswer(fb.answer, art?.status ?? "stolen"),
    sourceIds: validateSourceIds(artworkId, fb.sourceIds),
    followUps: [] as string[],
    fallback: false as const,
    curated: true as const,
  };
}

async function callModel(
  openai: OpenAI,
  model: string,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
): Promise<{
  answer: string;
  sourceIds: string[];
  followUps: string[];
} | null> {
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages,
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: {
    answer?: string;
    sourceIds?: string[];
    followUps?: string[];
  } = {};
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return null;
  }
  const answer = typeof parsed.answer === "string" ? parsed.answer.trim() : "";
  if (!answer) return null;
  const followUps = Array.isArray(parsed.followUps)
    ? parsed.followUps
        .filter((f): f is string => typeof f === "string")
        .map((f) => f.trim())
        .filter(Boolean)
        .slice(0, 2)
    : [];
  return {
    answer,
    sourceIds: Array.isArray(parsed.sourceIds)
      ? parsed.sourceIds.filter((id): id is string => typeof id === "string")
      : [],
    followUps,
  };
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: "rate_limit", message: "Забагато запитів. Зачекай трохи." },
      { status: 429 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const artworkId = Number(body.artworkId);
  const artwork = getArtwork(artworkId);
  if (!artwork) {
    return NextResponse.json({ error: "artwork_not_found" }, { status: 404 });
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-10) : [];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const question = (lastUser?.content ?? "").trim().slice(0, MAX_INPUT);
  if (!question) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }

  const detailTitle = body.detail?.zoneOrStopTitle?.trim() || null;

  // Default questions → curated bank immediately (no model).
  const curated = curatedResponse(artworkId, question);
  if (curated) {
    return NextResponse.json(curated);
  }

  // Trap: passport / safety, skip the model.
  if (isLocationTrapQuestion(question)) {
    return NextResponse.json(fallbackResponse(artworkId, question));
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim();
  if (!apiKey || !model) {
    if (!apiKey && !loggedMissingOpenAiKey) {
      loggedMissingOpenAiKey = true;
      console.warn("[guide] OPENAI_API_KEY missing — using fallback");
    }
    return NextResponse.json(fallbackResponse(artworkId, question));
  }

  try {
    const openai = new OpenAI({ apiKey });
    const system = buildGuideSystemPrompt(artwork, detailTitle);
    const vocative = body.userName?.trim();
    const baseMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: system },
      ...(vocative
        ? [
            {
              role: "system" as const,
              content: `Звертайся до користувача на імʼя в кличному відмінку: ${vocative}.`,
            },
          ]
        : []),
      ...messages.map((m) => ({
        role: (m.role === "guide" || m.role === "assistant"
          ? "assistant"
          : "user") as "assistant" | "user",
        content: String(m.content ?? "").slice(0, MAX_INPUT),
      })),
    ];

    let result = await callModel(openai, model, baseMessages);
    if (!result) {
      return NextResponse.json(fallbackResponse(artworkId, question));
    }

    const snippets = passportSnippetsForQuestion(artworkId, question);

    // Shrug despite passport coverage → retry with quoted paragraphs.
    if (looksLikeNoDataShrug(result.answer) && snippets.length > 0) {
      const retry = await callModel(openai, model, [
        ...baseMessages,
        {
          role: "system",
          content: `Користувач спитав про факт, який Є в паспорті. Ось уривки — відповідай ТІЛЬКИ з них, 2–4 речення, з sourceIds:\n\n${snippets.join("\n\n")}`,
        },
      ]);
      if (retry && !looksLikeNoDataShrug(retry.answer) && !looksLikeSpeculation(retry.answer)) {
        result = retry;
      } else {
        return NextResponse.json(fallbackResponse(artworkId, question));
      }
    }

    // Speculative symbolism / opinions → one stricter retry, then bank.
    if (looksLikeSpeculation(result.answer)) {
      const retry = await callModel(openai, model, [
        ...baseMessages,
        {
          role: "system",
          content:
            "СТРОГО: без символізму, без «може символізувати», «ймовірно», «мабуть». Лише факти з паспорта. Якщо факту немає — одне речення «Про це в моїх джерелах даних немає.» і одне питання з паспорта.",
        },
      ]);
      if (retry && !looksLikeSpeculation(retry.answer)) {
        result = retry;
      } else {
        return NextResponse.json(fallbackResponse(artworkId, question));
      }
    }

    const answer = sanitizeGuideAnswer(result.answer, artwork.status);
    if (!answer) {
      return NextResponse.json(fallbackResponse(artworkId, question));
    }

    return NextResponse.json({
      answer,
      sourceIds: validateSourceIds(artworkId, result.sourceIds),
      followUps: result.followUps,
      fallback: false,
      curated: false,
    });
  } catch {
    return NextResponse.json(fallbackResponse(artworkId, question));
  }
}
