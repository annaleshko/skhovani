import {
  findCuratedDefaultAnswer,
  findFallbackAnswer,
  passportSnippetsForQuestion,
} from "@/data/fallback-answers";
import { getArtwork } from "@/data";
import { buildGuideSystemPrompt } from "@/lib/guide-prompt";
import {
  answerHasUngroundedNumbers,
  artworkKnowledgeCorpus,
  isLocationTrapQuestion,
  looksLikeNoDataShrug,
  looksLikeSpeculation,
  sanitizeGuideAnswer,
} from "@/lib/guide-safety";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Log once per server process when the key is absent. */
let loggedMissingOpenAiKey = false;

type ChatRole = "user" | "guide" | "assistant";
type InMessage = { role: ChatRole; content: string };

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const MAX_INPUT = 800;
const MAX_MESSAGES = 6;
const MAX_DETAIL = 120;
const ALLOWED_HOSTS = new Set(["web-eta-tawny-94.vercel.app"]);

/**
 * In-memory rate limits. Prepaid OpenAI credits (no auto-recharge) are the real cost cap.
 * Per-IP ~12/min; global ~120/min per instance.
 */
const IP_CAPACITY = 12;
const IP_REFILL_PER_SEC = 12 / 60;
const GLOBAL_CAPACITY = 120;
const GLOBAL_REFILL_PER_SEC = 120 / 60;

const ipBucket = new Map<string, { tokens: number; updated: number }>();
const globalBucket = { tokens: GLOBAL_CAPACITY, updated: Date.now() };

function takeToken(
  row: { tokens: number; updated: number },
  capacity: number,
  refillPerSec: number,
  now: number,
): boolean {
  const elapsed = (now - row.updated) / 1000;
  row.tokens = Math.min(capacity, row.tokens + elapsed * refillPerSec);
  row.updated = now;
  if (row.tokens < 1) return false;
  row.tokens -= 1;
  return true;
}

function rateLimit(ip: string): boolean {
  const now = Date.now();
  if (!takeToken(globalBucket, GLOBAL_CAPACITY, GLOBAL_REFILL_PER_SEC, now)) {
    return false;
  }
  const row = ipBucket.get(ip) ?? { tokens: IP_CAPACITY, updated: now };
  const ok = takeToken(row, IP_CAPACITY, IP_REFILL_PER_SEC, now);
  ipBucket.set(ip, row);
  return ok;
}

function hostFromUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

function isLocalHost(host: string): boolean {
  return (
    host === "localhost" ||
    host.startsWith("localhost:") ||
    host === "127.0.0.1" ||
    host.startsWith("127.0.0.1:") ||
    host === "[::1]" ||
    host.startsWith("[::1]:")
  );
}

/** Same-origin (or allowed production host); localhost allowed in development. */
function originAllowed(req: Request): boolean {
  const requestHost = (
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    ""
  )
    .split(",")[0]
    ?.trim()
    .toLowerCase();
  if (!requestHost) return false;

  const originHost = hostFromUrl(req.headers.get("origin"));
  const refererHost = hostFromUrl(req.headers.get("referer"));
  const clientHost = originHost ?? refererHost;

  // Same-origin navigations may omit Origin; require Referer or allow missing in that case.
  if (!clientHost) {
    // No Origin/Referer — reject cross-tool probes; allow only if neither was sent
    // from a same-tab fetch that browsers sometimes strip. Prefer reject.
    return false;
  }

  if (clientHost === requestHost) return true;
  if (ALLOWED_HOSTS.has(clientHost) && ALLOWED_HOSTS.has(requestHost)) {
    return true;
  }
  if (
    process.env.NODE_ENV !== "production" &&
    isLocalHost(clientHost) &&
    isLocalHost(requestHost)
  ) {
    return true;
  }
  return false;
}

type ParsedBody =
  | {
      ok: true;
      artworkId: number;
      messages: InMessage[];
      detailTitle: string | null;
      userName: string | null;
    }
  | { ok: false };

function parseBody(raw: unknown): ParsedBody {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false };
  }
  const body = raw as Record<string, unknown>;

  if (!Number.isInteger(body.artworkId)) return { ok: false };
  const artworkId = body.artworkId as number;
  if (!getArtwork(artworkId)) return { ok: false };

  if (!Array.isArray(body.messages) || body.messages.length > MAX_MESSAGES) {
    return { ok: false };
  }
  const messages: InMessage[] = [];
  for (const item of body.messages) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false };
    }
    const row = item as Record<string, unknown>;
    const role = row.role;
    if (role !== "user" && role !== "guide" && role !== "assistant") {
      return { ok: false };
    }
    if (typeof row.content !== "string" || row.content.length > MAX_INPUT) {
      return { ok: false };
    }
    messages.push({ role, content: row.content });
  }

  let detailTitle: string | null = null;
  if (body.detail != null) {
    if (typeof body.detail !== "object" || Array.isArray(body.detail)) {
      return { ok: false };
    }
    const detail = body.detail as Record<string, unknown>;
    if (detail.zoneOrStopTitle != null) {
      if (
        typeof detail.zoneOrStopTitle !== "string" ||
        detail.zoneOrStopTitle.length > MAX_DETAIL
      ) {
        return { ok: false };
      }
      detailTitle = detail.zoneOrStopTitle.trim() || null;
    }
  }

  let userName: string | null = null;
  if (body.userName != null) {
    if (typeof body.userName !== "string" || body.userName.length > 80) {
      return { ok: false };
    }
    userName = body.userName.trim() || null;
  }

  return { ok: true, artworkId, messages, detailTitle, userName };
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
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  temperature = 0.5,
): Promise<{
  answer: string;
  sourceIds: string[];
  followUps: string[];
} | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: 450,
        response_format: { type: "json_object" },
        messages,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn("[guide] openai_http_error", res.status);
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    const raw = data.choices?.[0]?.message?.content ?? "{}";
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
  } catch (err) {
    const kind =
      err instanceof Error && err.name === "AbortError"
        ? "openai_timeout"
        : "openai_fetch_error";
    console.warn("[guide]", kind);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  if (!originAllowed(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: "rate_limit", message: "Забагато запитів. Зачекай трохи." },
      { status: 429 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const parsed = parseBody(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { artworkId, messages, detailTitle, userName } = parsed;
  const artwork = getArtwork(artworkId)!;

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const question = (lastUser?.content ?? "").trim().slice(0, MAX_INPUT);
  if (!question) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }

  // Curated defaults only the first time that exact question appears in this chat.
  const priorUserQs = messages
    .filter((m) => m.role === "user")
    .slice(0, -1)
    .map((m) => m.content.trim());
  const askedBefore = priorUserQs.some((q) => q === question);
  if (!askedBefore) {
    const curated = curatedResponse(artworkId, question);
    if (curated) {
      return NextResponse.json(curated);
    }
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
      console.warn("[guide] missing_api_key");
    }
    return NextResponse.json(fallbackResponse(artworkId, question));
  }

  try {
    const system = buildGuideSystemPrompt(artwork, detailTitle);
    const baseMessages: ChatMessage[] = [
      { role: "system", content: system },
      ...(userName
        ? [
            {
              role: "system" as const,
              content: `Звертайся до користувача на імʼя в кличному відмінку: ${userName}.`,
            },
          ]
        : []),
      ...messages.map((m) => ({
        role: (m.role === "guide" || m.role === "assistant"
          ? "assistant"
          : "user") as "assistant" | "user",
        content: m.content.slice(0, MAX_INPUT),
      })),
    ];

    let result = await callModel(apiKey, model, baseMessages);
    if (!result) {
      return NextResponse.json(fallbackResponse(artworkId, question));
    }

    const snippets = passportSnippetsForQuestion(artworkId, question);

    // Shrug despite passport coverage → retry with quoted paragraphs.
    if (looksLikeNoDataShrug(result.answer) && snippets.length > 0) {
      const retry = await callModel(apiKey, model, [
        ...baseMessages,
        {
          role: "system",
          content: `Користувач спитав про факт, який Є в паспорті. Ось уривки — відповідай ТІЛЬКИ з них, 2–4 речення, з sourceIds:\n\n${snippets.join("\n\n")}`,
        },
      ]);
      if (
        retry &&
        !looksLikeNoDataShrug(retry.answer) &&
        !looksLikeSpeculation(retry.answer)
      ) {
        result = retry;
      } else {
        return NextResponse.json(fallbackResponse(artworkId, question));
      }
    }

    // Speculative symbolism / opinions → one stricter retry, then bank.
    if (looksLikeSpeculation(result.answer)) {
      const retry = await callModel(apiKey, model, [
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

    // Invented counts / years / sizes → one strict retry, then warm shrug.
    const knowledge = artworkKnowledgeCorpus(artwork);
    if (answerHasUngroundedNumbers(result.answer, knowledge)) {
      const retry = await callModel(
        apiKey,
        model,
        [
          ...baseMessages,
          {
            role: "system",
            content:
              "СТРОГО: у відповіді можна використовувати ЛИШЕ числа, роки, розміри й кількості, які буквально є в паспорті / додаткових фактах / джерелах. Не рахуй фігури на картині. Якщо точної цифри немає — скажи тепло, що в джерелах цього немає, без жодної вигаданої кількості.",
          },
        ],
        0.2,
      );
      if (
        retry &&
        !answerHasUngroundedNumbers(retry.answer, knowledge) &&
        !looksLikeSpeculation(retry.answer)
      ) {
        result = retry;
      } else {
        return NextResponse.json({
          answer:
            "У моїх джерелах немає точної кількості чи цифри з цього питання — тож не буду вгадувати. Можу розповісти про те, що в паспорті є напевно.",
          sourceIds: [] as string[],
          followUps: artwork.chat.defaultQuestions.slice(0, 2),
          fallback: true as const,
          curated: false as const,
        });
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
    console.warn("[guide] unhandled_error");
    return NextResponse.json(fallbackResponse(artworkId, question));
  }
}
