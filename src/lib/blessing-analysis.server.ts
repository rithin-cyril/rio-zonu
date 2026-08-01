// Server-only blessing analysis: quality score + AI-content probability.
// Runs only on submit / approve / edit / manual re-analysis — never per page load.

export type BlessingBreakdown = {
  emotional_quality: number;
  personalization: number;
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
  /** Internal human-authenticity bonus already folded into quality_score. */
  authenticity_bonus?: number;
  weights?: Record<string, number>;
};

// ---- Overall score weighting (must sum to 1) ----
// Emotional impact 25, personalization 20, relevance 15, writing 15,
// originality 15, character count 5, AI probability 5.
export const SCORE_WEIGHTS = {
  emotional_quality: 0.25,
  personalization: 0.2,
  wedding_relevance: 0.15,
  writing_quality: 0.15,
  originality: 0.15,
  length_contribution: 0.05,
  ai_probability: 0.05,
} as const;

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

/**
 * Single source of truth for the Overall Blessing Score.
 * AI probability contributes at most 5% and never dominates; the human
 * authenticity bonus adds up to +10 and the result is clamped to 0-100.
 */
export function composeOverall(
  b: BlessingBreakdown,
  aiProbability: number,
  authenticityBonus: number,
) {
  const base =
    b.emotional_quality * SCORE_WEIGHTS.emotional_quality +
    b.personalization * SCORE_WEIGHTS.personalization +
    b.wedding_relevance * SCORE_WEIGHTS.wedding_relevance +
    b.writing_quality * SCORE_WEIGHTS.writing_quality +
    b.originality * SCORE_WEIGHTS.originality +
    b.length_contribution * SCORE_WEIGHTS.length_contribution +
    (100 - clamp(aiProbability)) * SCORE_WEIGHTS.ai_probability;
  return clamp(base - b.spam_penalty * 0.5 + clamp(authenticityBonus, 0, 10));
}

// ---- Shared language signals ----
const CLICHES = [
  /beautiful journey/i,
  /lifetime of happiness/i,
  /grow stronger every day/i,
  /forever together/i,
  /every season of life/i,
  /countless blessings/i,
  /cherished memories/i,
  /endless joy/i,
  /happily ever after/i,
  /love and laughter/i,
  /journey of a lifetime/i,
  /may your love/i,
];

const PERSONAL_PATTERNS: Array<[RegExp, number, string]> = [
  [/\b(my|our)\s+(little\s+)?(brother|sister|son|daughter|cousin|nephew|niece|friend|bestie|buddy)\b/i, 16, "Relationship-specific wording"],
  [/\bwelcome (to|into) (our|the) family\b/i, 16, "Family welcome"],
  [/\bwatch(ing|ed)? (you|him|her|them) grow\b/i, 14, "Personal memory of growing up"],
  [/\b(remember|i still recall|back when|the day (you|we)|all those (years|nights|days))\b/i, 14, "Shared memory"],
  [/\b(family|families|parents|mom|mum|dad|mother|father|siblings)\b/i, 8, "Family reference"],
  [/\b(friendship|childhood|school|college|roommate|neighbou?r)\b/i, 8, "Long-standing friendship"],
  [/\b(i|we|my|our|us)\b/i, 8, "First-person voice"],
  [/\b(you)\b/i, 4, "Directly addresses the couple"],
  [/\b(proverbs|corinthians|ephesians|psalm|genesis|ruth|song of s|jesus|christ|god's word|scripture)\b/i, 10, "Meaningful scripture"],
  [/\b(haha|lol|😄|😂|joke|teasing|finally|about time)\b/i, 6, "Natural humour"],
];

function lengthContribution(chars: number) {
  if (chars < 30) return 15;
  if (chars < 80) return 45;
  if (chars < 150) return 70;
  if (chars <= 350) return 100;
  if (chars <= 550) return 95;
  return 85;
}

function authenticityBonusFor(text: string) {
  let bonus = 0;
  for (const [re, w] of PERSONAL_PATTERNS) if (re.test(text)) bonus += w / 4;
  return clamp(bonus, 0, 10);
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

  // Sentence rhythm: reward varied lengths, punish "May… May… May…" litanies.
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const sentLens = sentences.map((s) => s.split(/\s+/).length);
  const avgLen = sentLens.length ? sentLens.reduce((a, b) => a + b, 0) / sentLens.length : 0;
  const variance = sentLens.length
    ? Math.sqrt(sentLens.reduce((a, b) => a + (b - avgLen) ** 2, 0) / sentLens.length)
    : 0;
  const openers = sentences.map((s) => s.toLowerCase().split(/\s+/)[0] ?? "");
  const repeatedOpeners = openers.length - new Set(openers).size;
  const completeEnding = /[.!?…]$/.test(text);

  const clicheHits = CLICHES.filter((re) => re.test(text)).length;
  let personalHits = 0;
  const personalNotes: string[] = [];
  let personalRaw = 0;
  for (const [re, weight, label] of PERSONAL_PATTERNS) {
    if (re.test(text)) {
      personalRaw += weight;
      personalHits++;
      if (personalNotes.length < 4) personalNotes.push(label);
    }
  }

  const emotional = clamp(
    28 + warmHits * 11 + Math.min(chars, 260) / 12 + personalHits * 3 - clicheHits * 3,
  );
  const personalization = clamp(12 + personalRaw);
  const relevance = clamp(18 + weddingHits * 15);
  const originality = clamp(
    diversity * 105 - clicheHits * 14 - (chars < 30 ? 20 : 0) - repeatedOpeners * 6,
  );
  const writing = clamp(
    38 +
      (punctuated ? 14 : 0) +
      (capitalised ? 10 : 0) +
      (completeEnding ? 8 : 0) +
      Math.min(18, variance * 4) +
      diversity * 15 -
      repeatedOpeners * 8,
  );
  const sentiment = clamp(45 + warmHits * 10 + weddingHits * 4);
  const lengthScore = lengthContribution(chars);

  const spamPenalty = clamp(
    urls * 30 + shouting * 12 + gibberish * 15 + Math.max(0, emojis - 4) * 6 +
      (diversity < 0.45 && words.length > 8 ? 25 : 0),
  );

  // AI probability: polished + generic + no personal reference.
  const personal = /\b(i|we|my|our|us|remember|when you|since)\b/i.test(text) ? 1 : 0;
  let aiProb =
    22 + (diversity > 0.9 && chars > 180 ? 18 : 0) + (weddingHits > 6 ? 12 : 0) +
    clicheHits * 5 - personal * 12 - personalHits * 3 +
    (punctuated && capitalised && chars > 200 ? 10 : 0);
  if (chars < 60) aiProb -= 10;
  const ai_probability = clamp(aiProb);

  const breakdown: BlessingBreakdown = {
    emotional_quality: emotional,
    personalization,
    wedding_relevance: relevance,
    originality,
    writing_quality: writing,
    positive_sentiment: sentiment,
    length_contribution: lengthScore,
    spam_penalty: spamPenalty,
  };
  const bonus = authenticityBonusFor(text);
  const quality = composeOverall(breakdown, ai_probability, bonus);

  const indicators: string[] = [];
  if (personal) indicators.push("Personal references detected");
  else indicators.push("Few personal references");
  if (diversity > 0.75) indicators.push("High vocabulary originality");
  if (diversity <= 0.55) indicators.push("Repetitive phrasing");
  if (clicheHits) indicators.push(`${clicheHits} common wedding cliché${clicheHits > 1 ? "s" : ""}`);
  if (repeatedOpeners > 1) indicators.push("Repeated sentence openers");
  for (const n of personalNotes.slice(0, 2)) indicators.push(n);
  if (punctuated && capitalised) indicators.push("Polished punctuation and structure");

  return {
    quality_score: quality,
    ai_probability,
    classification: classify(ai_probability),
    breakdown,
    ai_indicators: indicators.slice(0, 6),
    summary: `Scored offline from warmth, personal detail, wedding relevance and writing rhythm (${chars} characters).`,
    char_count: chars,
    source: "heuristic",
    analyzed_at: new Date().toISOString(),
    authenticity_bonus: bonus,
    weights: { ...SCORE_WEIGHTS },
  };
}

const SYSTEM_PROMPT = `You analyse wedding blessing messages left by guests.
Return STRICT JSON only, no prose. Score every field 0-100.

Judge like a thoughtful human at the wedding: "if every blessing were read
aloud, which would guests remember most?" Reward heartfelt, personal,
memorable and authentic writing — never mere length or polish.

emotional_quality: sincere wishes, emotional depth, encouragement, genuine
  affection, memorable wording. Do NOT give near-perfect scores to messages
  that merely list generic wishes.
personalization: references to family, friendship, personal memories, inside
  jokes, meaningful scripture, relationship-specific wording ("my little
  brother", "welcome to our family", "watching you grow"), personal
  observations. Score this generously when present and low when absent.
wedding_relevance: specifically about marriage, lifelong partnership,
  commitment, family, faith, the future together. Text that would fit a
  birthday or graduation equally well scores low.
writing_quality: grammar, punctuation, readability, sentence flow, natural
  rhythm, complete ending, logical progression. Penalise repetitive
  structures such as "May… May… May… May…". Reward varied sentence lengths
  and natural conversational flow.
originality: unique wording, creative expressions, unexpected phrasing,
  specific observations, authentic voice. Reduce for clichés such as
  "beautiful journey", "lifetime of happiness", "grow stronger every day",
  "forever together", "every season of life", "countless blessings",
  "cherished memories", "endless joy". Cliché penalties belong here only.
length_contribution: <30 chars very low, 30-80 low, 80-150 average,
  150-350 ideal, 350-550 excellent, >550 no extra bonus.
spam_penalty: 0-100 for repeated words, emoji spam, excessive punctuation,
  random characters, URLs, gibberish or meaningless text.
positive_sentiment: warmth and positivity of tone.

authenticity_bonus: 0-10 extra points for genuinely human touches — family
  references, personal memories, genuine observations, meaningful scripture,
  natural humour, conversational wording, relationship-specific language.

ai_probability: 0-100 likelihood the text was AI-generated. Advisory only; a
  genuine human blessing can read like AI, so never punish heavily for it.

ai_indicators: 2-5 short observational phrases supporting the estimate; never
  claim definitively that the text was AI-written.
summary: one short sentence describing the blessing's quality.

Do NOT return quality_score — the application computes the overall score from
the categories above.`;

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
              `Reply with json using exactly these keys: ai_probability, ` +
              `emotional_quality, wedding_relevance, originality, writing_quality, ` +
              `personalization, positive_sentiment, length_contribution, spam_penalty, ` +
              `authenticity_bonus, ai_indicators (array of strings), summary.`,
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
    const breakdown: BlessingBreakdown = {
        emotional_quality: score(parsed.emotional_quality, fallback.breakdown.emotional_quality),
        personalization: score(parsed.personalization, fallback.breakdown.personalization),
        wedding_relevance: score(parsed.wedding_relevance, fallback.breakdown.wedding_relevance),
        originality: score(parsed.originality, fallback.breakdown.originality),
        writing_quality: score(parsed.writing_quality, fallback.breakdown.writing_quality),
        positive_sentiment: score(parsed.positive_sentiment, fallback.breakdown.positive_sentiment),
        length_contribution: lengthContribution(note.trim().length),
        spam_penalty: score(parsed.spam_penalty, fallback.breakdown.spam_penalty),
    };
    const bonusRaw = Number(parsed.authenticity_bonus);
    const bonus = Math.max(
      Number.isFinite(bonusRaw) ? Math.max(0, Math.min(10, bonusRaw)) : 0,
      fallback.authenticity_bonus ?? 0,
    );
    return {
      quality_score: composeOverall(breakdown, ai_probability, bonus),
      ai_probability,
      classification: classify(ai_probability),
      breakdown,
      ai_indicators: Array.isArray(parsed.ai_indicators)
        ? parsed.ai_indicators.slice(0, 6).map((s: any) => String(s).slice(0, 160))
        : fallback.ai_indicators,
      summary: String(parsed.summary ?? fallback.summary).slice(0, 400),
      char_count: note.trim().length,
      source: "ai",
      analyzed_at: new Date().toISOString(),
      authenticity_bonus: bonus,
      weights: { ...SCORE_WEIGHTS },
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