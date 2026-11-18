import { findFallbackAnswer } from "@/data/fallback-answers";
import { getArtwork } from "@/data";
import { buildGuideSystemPrompt } from "@/lib/guide-prompt";
import {
  isLocationTrapQuestion,
  sanitizeGuideAnswer,
} from "@/lib/guide-safety";
import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
  const row = bucket.get(ip) ?? { tokens: 8, updated: now };
  const elapsed = (now - row.updated) / 1000;
  row.tokens = Math.min(8, row.tokens + elapsed * 0.15);
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
  return ids
    .filter((id): id is string => typeof id === "string")
    .filter((id) => allowed.has(id));
}

function fallbackResponse(artworkId: number, question: string) {
  const fb = findFallbackAnswer(artworkId, question);
  return {
    answer: sanitizeGuideAnswer(fb.answer),
    sourceIds: validateSourceIds(artworkId, fb.sourceIds),
    followUps: [],
    fallback: true as const,
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

  // Trap: answer from passport / safety, skip the model when possible
  if (isLocationTrapQuestion(question)) {
    const fb = fallbackResponse(artworkId, question);
    return NextResponse.json(fb);
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim();
  if (!apiKey || !model) {
    return NextResponse.json(fallbackResponse(artworkId, question));
  }

  try {
    const openai = new OpenAI({ apiKey });
    const system = buildGuideSystemPrompt(artwork, detailTitle);
    const vocative = body.userName?.trim();
    const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
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
        role: (m.role === "guide" ? "assistant" : m.role === "assistant" ? "assistant" : "user") as
          | "assistant"
          | "user",
        content: String(m.content ?? "").slice(0, MAX_INPUT),
      })),
    ];

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: chatMessages,
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
      return NextResponse.json(fallbackResponse(artworkId, question));
    }

    const answer = sanitizeGuideAnswer(
      typeof parsed.answer === "string" ? parsed.answer : "",
    );
    if (!answer) {
      return NextResponse.json(fallbackResponse(artworkId, question));
    }

    const followUps = Array.isArray(parsed.followUps)
      ? parsed.followUps
          .filter((f): f is string => typeof f === "string")
          .map((f) => f.trim())
          .filter(Boolean)
          .slice(0, 2)
      : [];

    return NextResponse.json({
      answer,
      sourceIds: validateSourceIds(artworkId, parsed.sourceIds),
      followUps,
      fallback: false,
    });
  } catch {
    return NextResponse.json(fallbackResponse(artworkId, question));
  }
}
