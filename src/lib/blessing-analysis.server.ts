// Server-only blessing analysis: quality score + AI-content probability.
// Runs only on submit / approve / edit / manual re-analysis — never per page load.

export type BlessingBreakdown = {
  emotional_quality: number;
  wedding_relevance: number;
  originality: number;
  writing_quality: number;
  positive_sentiment: number;
  length_contribution: number;
  spam_penalty: number;
};

export type BlessingAnalysis = {
  quality_score: number;
  ai_probability: number;
  classification: "likely_human" | "mixed" | "likely_ai";
  breakdown: BlessingBreakdown;
  ai_indicators: string[];
  summary: string;
  char_count: number;
  source: "ai" | "heuristic";
  analyzed_at: string;
};

const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(Number.isFinite(n) ? n : 0)));

// Models sometimes answer with 0-1 fractions instead of 0-100.
const score = (v: any, fallbackValue = 0) => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return clamp(fallbackValue);
  return clamp(n > 0 && n <= 1 ? n * 100 : n);
};

export function classify(p: number): BlessingAnalysis["classification"] {
  if (p <= 30) return "likely_human";
  if (p <= 70) return "mixed";
  return "likely_ai";
}

export function classificationLabel(c: string) {
  return c === "likely_human"
    ? "🟢 Likely Human"
    : c === "likely_ai"
      ? "🔴 Likely AI-Generated"
      : "🟡 Mixed / Uncertain";
}

// ---- Heuristic fallback (also used when the AI gateway is unavailable) ----
const WEDDING_WORDS =
  /\b(marriage|married|wedding|bride|groom|couple|love|lifelong|forever|family|blessing|blessed|god|lord|prayer|pray|journey|together|happiness|joy|union|vows|husband|wife|honeymoon)\b/gi;
const WARM_WORDS =
  /\b(heart|heartfelt|joy|joyful|beautiful|wonderful|cherish|grateful|wish|wishes|congratulations|congrats|happy|warm|dear|precious|proud)\b/gi;

export function heuristicAnalysis(name: string, note: string): BlessingAnalysis {
  const text = note.trim();
  const chars = text.length;
  const words = text.split(/\s+/).filter(Boolean);
  const unique = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z']/g, ""))).size;
  const diversity = words.length ? unique / words.length : 0;

  const weddingHits = (text.match(WEDDING_WORDS) ?? []).length;
  const warmHits = (text.match(WARM_WORDS) ?? []).length;
  const emojis = (text.match(/\p{Extended_Pictographic}/gu) ?? []).length;
  const urls = (text.match(/https?:\/\/|www\./gi) ?? []).length;
  const shouting = (text.match(/[!?]{3,}/g) ?? []).length;
  const gibberish = (text.match(/[bcdfghjklmnpqrstvwxyz]{6,}/gi) ?? []).length;
  const punctuated = /[.!?]\s|[.!?]$/.test(text);
  const capitalised = /^[A-Z"'“]/.test(text);

  const emotional = clamp(30 + warmHits * 12 + Math.min(chars, 220) / 8);
  const relevance = clamp(20 + weddingHits * 16);
  const originality = clamp(diversity * 110 - (chars < 30 ? 25 : 0));
  const writing = clamp(45 + (punctuated ? 20 : 0) + (capitalised ? 15 : 0) + diversity * 20);
  const sentiment = clamp(45 + warmHits * 10 + weddingHits * 4);

  // Length contributes ~12% of total, peaking around 140-320 chars.
  const lengthScore =
    chars < 20 ? 10 : chars < 60 ? 45 : chars < 140 ? 80 : chars <= 400 ? 100 : 70;

  const spamPenalty = clamp(
    urls * 30 + shouting * 12 + gibberish * 15 + Math.max(0, emojis - 4) * 6 +
      (diversity < 0.45 && words.length > 8 ? 25 : 0),
  );

  const base =
    emotional * 0.28 +
    relevance * 0.22 +
    originality * 0.16 +
    writing * 0.13 +
    sentiment * 0.09 +
    lengthScore * 0.12;

  const quality = clamp(base - spamPenalty * 0.6);

  // AI probability: polished + generic + no personal reference.
  const personal = /\b(i|we|my|our|us|remember|when you|since)\b/i.test(text) ? 1 : 0;
  let aiProb =
    22 + (diversity > 0.9 && chars > 180 ? 18 : 0) + (weddingHits > 6 ? 12 : 0) -
    personal * 12 + (punctuated && capitalised && chars > 200 ? 10 : 0);
  if (chars < 60) aiProb -= 10;
  const ai_probability = clamp(aiProb);

  const indicators: string[] = [];
  if (personal) indicators.push("Personal references detected");
  else indicators.push("Few personal references");
  if (diversity > 0.75) indicators.push("High vocabulary originality");
  if (diversity <= 0.55) indicators.push("Repetitive phrasing");
  if (punctuated && capitalised) indicators.push("Polished punctuation and structure");

  return {
    quality_score: quality,
    ai_probability,
    classification: classify(ai_probability),
    breakdown: {
      emotional_quality: emotional,
      wedding_relevance: relevance,
      originality,
      writing_quality: writing,
      positive_sentiment: sentiment,
      length_contribution: lengthScore,
      spam_penalty: spamPenalty,
    },
    ai_indicators: indicators,
    summary: `Scored offline from wording, warmth, wedding relevance and length (${chars} characters).`,
    char_count: chars,
    source: "heuristic",
    analyzed_at: new Date().toISOString(),
  };
}

const SYSTEM_PROMPT = `You analyse wedding blessing messages left by guests.
Return STRICT JSON only, no prose. Score every field 0-100.

quality_score: overall meaningfulness, weighted roughly as
  emotional quality 28%, wedding relevance 22%, originality 16%,
  writing quality 13%, positive sentiment 9%, length appropriateness 12%.
  Penalise spam: repeated words, emoji spam, excessive punctuation, random
  characters, URLs, gibberish, meaningless text. Penalise extremely short
  messages; do NOT reward padding or repetition.

ai_probability: 0-100 likelihood the text was AI-generated, based on generic
  wording, predictable structure, repetitive language, lack of personal
  references, overly polished writing and common AI patterns. This is advisory
  only and must NOT reduce quality_score.

ai_indicators: 2-5 short observational phrases supporting the estimate; never
  claim definitively that the text was AI-written.
summary: one short sentence describing the blessing's quality.`;

export async function analyzeBlessing(name: string, note: string): Promise<BlessingAnalysis> {
  const apiKey = process.env.LOVABLE_API_KEY;
  const fallback = heuristicAnalysis(name, note);
  if (!apiKey) return fallback;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content:
              `Guest name: ${name}\nBlessing (${note.length} characters):\n"""${note}"""\n\n` +
              `Reply with json using exactly these keys: quality_score, ai_probability, ` +
              `emotional_quality, wedding_relevance, originality, writing_quality, ` +
              `positive_sentiment, length_contribution, spam_penalty, ai_indicators (array of strings), summary.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("[blessing-analysis] gateway error", res.status, await res.text());
      return fallback;
    }
    const json: any = await res.json();
    const raw = json?.choices?.[0]?.message?.content;
    if (!raw) return fallback;
    const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

    const ai_probability = score(parsed.ai_probability, fallback.ai_probability);
    return {
      quality_score: score(parsed.quality_score, fallback.quality_score),
      ai_probability,
      classification: classify(ai_probability),
      breakdown: {
        emotional_quality: score(parsed.emotional_quality, fallback.breakdown.emotional_quality),
        wedding_relevance: score(parsed.wedding_relevance, fallback.breakdown.wedding_relevance),
        originality: score(parsed.originality, fallback.breakdown.originality),
        writing_quality: score(parsed.writing_quality, fallback.breakdown.writing_quality),
        positive_sentiment: score(parsed.positive_sentiment, fallback.breakdown.positive_sentiment),
        length_contribution: score(
          parsed.length_contribution,
          fallback.breakdown.length_contribution,
        ),
        spam_penalty: score(parsed.spam_penalty, fallback.breakdown.spam_penalty),
      },
      ai_indicators: Array.isArray(parsed.ai_indicators)
        ? parsed.ai_indicators.slice(0, 6).map((s: any) => String(s).slice(0, 160))
        : fallback.ai_indicators,
      summary: String(parsed.summary ?? fallback.summary).slice(0, 400),
      char_count: note.trim().length,
      source: "ai",
      analyzed_at: new Date().toISOString(),
    };
  } catch (e) {
    console.error("[blessing-analysis] failed", e);
    return fallback;
  }
}

// Persist an analysis for one blessing. Never throws.
export async function analyzeAndStore(
  supabaseAdmin: any,
  blessing: { id: string; name: string; note: string },
) {
  try {
    const analysis = await analyzeBlessing(blessing.name, blessing.note);
    await supabaseAdmin
      .from("blessings")
      .update({
        quality_score: analysis.quality_score,
        ai_probability: analysis.ai_probability,
        analysis,
        analyzed_at: analysis.analyzed_at,
      })
      .eq("id", blessing.id);
    return analysis;
  } catch (e) {
    console.error("[blessing-analysis] store failed", e);
    return null;
  }
}