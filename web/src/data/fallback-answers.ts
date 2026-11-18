/**
 * Offline / API-error fallbacks — ONLY from passport text.
 * reviewed: false → Anna should check before treating as final copy.
 */
import { getArtwork } from "@/data";
import {
  GUIDE_SAFE_SHELTER,
  isLocationTrapQuestion,
} from "@/lib/guide-safety";

export type FallbackAnswer = {
  question: string;
  answer: string;
  sourceIds: string[];
  reviewed: false;
};

/** Per-artwork default-question fallbacks (Stage 7). */
export const FALLBACK_ANSWERS: Record<number, FallbackAnswer[]> = {
  1: [
    {
      question: "Чому існує дві «Великодні заутрені»?",
      answer:
        "Микола Пимоненко написав «Великодню заутреню» щонайменше двічі. Першу версію — у 1891 (зараз у Рибінську), другу музей датує 1910 роком; саме вона була в Херсоні.",
      sourceIds: ["s2", "s3", "s8"],
      reviewed: false,
    },
    {
      question: "Як картину викрали з Херсона?",
      answer:
        "З 31 жовтня по 4 листопада 2022 року, перед звільненням Херсона, російські окупанти пограбували музей і вивезли понад 10 тисяч експонатів, серед них і цю картину.",
      sourceIds: ["s1", "s5"],
      reviewed: false,
    },
    {
      question: "Чи є шанс, що її повернуть?",
      answer:
        "Картина внесена до реєстру викраденої культурної спадщини. Над поверненням робіт херсонського музею працює Інтерпол.",
      sourceIds: ["s4"],
      reviewed: false,
    },
    {
      question: "Хто такий Микола Пимоненко?",
      answer: "", // filled from author tab below
      sourceIds: ["s6"],
      reviewed: false,
    },
    {
      question: "Що відбувається на картині?",
      answer:
        "На картині люди зі свічками й кошиками чекають біля церкви на світанку Великодня — тепла служба всередині й вогники свічок зовні.",
      sourceIds: ["s2", "s3"],
      reviewed: false,
    },
  ],
};

// Fix Pymonenko bio from author tab
{
  const a = getArtwork(1);
  if (a && FALLBACK_ANSWERS[1]) {
    const bio = a.tabs.author[0] ?? FALLBACK_ANSWERS[1][3]!.answer;
    FALLBACK_ANSWERS[1][3] = {
      question: "Хто такий Микола Пимоненко?",
      answer: bio,
      sourceIds: ["s6"],
      reviewed: false,
    };
  }
}

export function findFallbackAnswer(
  artworkId: number,
  question: string,
): FallbackAnswer {
  if (isLocationTrapQuestion(question)) {
    const a = getArtwork(artworkId);
    const stolen =
      a?.status === "stolen"
        ? "Окупанти вивезли її з музею. Точне місце зараз невідоме — я не вгадую, де вона зберігається."
        : a?.status === "shelter"
          ? GUIDE_SAFE_SHELTER
          : "Про точне місце в моїх джерелах даних немає.";
    return {
      question,
      answer: stolen,
      sourceIds: a?.status === "stolen" ? ["s1"] : [],
      reviewed: false,
    };
  }

  const list = FALLBACK_ANSWERS[artworkId] ?? [];
  const q = question.trim().toLowerCase();
  const exact = list.find((f) => f.question.toLowerCase() === q);
  if (exact) return exact;

  const partial = list.find(
    (f) =>
      q.includes(f.question.toLowerCase().slice(0, 18)) ||
      f.question.toLowerCase().includes(q.slice(0, 18)),
  );
  if (partial) return partial;

  // Detail / freeform: try about tab
  const art = getArtwork(artworkId);
  if (art) {
    const about = art.tabs.about[0];
    if (about && /сюжет|картин|полотн|що (там|відбува|зображ)/i.test(q)) {
      return {
        question,
        answer: about,
        sourceIds: art.sources[0] ? [art.sources[0].id] : [],
        reviewed: false,
      };
    }
    const zone = art.touchZones.zones.find((z) =>
      q.includes(z.title.toLowerCase()),
    );
    if (zone) {
      return {
        question,
        answer: zone.text,
        sourceIds: [],
        reviewed: false,
      };
    }
  }

  return {
    question,
    answer:
      "Про це в моїх джерелах даних немає. Спробуй спитати про сюжет, автора чи долю твору — можу відповісти з паспорта.",
    sourceIds: [],
    reviewed: false,
  };
}

/** Printable review list for Anna (Stage 7). */
export function listAllFallbacks(): FallbackAnswer[] {
  return Object.values(FALLBACK_ANSWERS).flat();
}
