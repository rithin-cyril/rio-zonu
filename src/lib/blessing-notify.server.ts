// Server-only: builds and sends the Discord moderation request for a blessing.
// Always called AFTER the blessing analysis has completed and been stored.
import type { BlessingAnalysis } from "@/lib/blessing-analysis.server";

export type NotifyBlessing = {
  id: string;
  name: string;
  note: string;
  created_at: string;
  moderation_token: string;
};

/**
 * AI Overall Rank of this blessing among all approved + pending (non-rejected)
 * blessings, by stored quality score. 1 = highest scoring.
 */
export async function computeAiRank(
  supabaseAdmin: any,
  id: string,
  score: number,
): Promise<{ rank: number; total: number }> {
  try {
    const { data } = await supabaseAdmin
      .from("blessings")
      .select("id, quality_score")
      .eq("rejected", false);
    const rows: Array<{ id: string; quality_score: number | null }> = data ?? [];
    const others = rows.filter((r) => r.id !== id && r.quality_score !== null);
    const better = others.filter((r) => (r.quality_score ?? -1) > score).length;
    return { rank: better + 1, total: others.length + 1 };
  } catch {
    return { rank: 1, total: 1 };
  }
}

/** Concise 1-2 sentence moderator-only summary. Never shown publicly. */
export function moderationSummary(a: BlessingAnalysis): string {
  const b = a.breakdown;
  const personal = b.personalization >= 60;
  const scripture = a.ai_indicators.some((i) => /scripture/i.test(i));
  const cliche = a.ai_indicators.find((i) => /clich/i.test(i));
  const repetitive = a.ai_indicators.some((i) => /repetitive|repeated/i.test(i));

  const traits: string[] = [];
  if (personal) traits.push("strong personalization");
  if (scripture) traits.push("meaningful scripture");
  if (b.emotional_quality >= 70) traits.push("strong emotional impact");
  if (b.wedding_relevance >= 70) traits.push("good wedding relevance");
  if (b.writing_quality >= 70) traits.push("natural writing");
  if (b.originality < 45) traits.push("limited originality");
  if (cliche) traits.push("several common wedding phrases");
  if (repetitive) traits.push("repetitive wording");
  if (!personal) traits.push("minimal personalization");

  const list = traits.slice(0, 3).join(", ");
  if (a.quality_score >= 75) {
    return `🟢 Highly personal, memorable blessing (${a.quality_score}/100) with ${list}.`;
  }
  if (a.quality_score >= 55) {
    return `🟢 Warm and authentic blessing (${a.quality_score}/100) with ${list}.`;
  }
  if (a.quality_score >= 38) {
    return `🟡 Decent blessing (${a.quality_score}/100), but with ${list}.`;
  }
  return `🔴 Generic blessing (${a.quality_score}/100) with ${list}.`;
}

const bar = (n: number) => `${n}/100`;

/**
 * Posts the fully analysed blessing to the Discord moderation webhook and
 * flags the row as notified. Returns true when the webhook accepted it.
 */
export async function sendModerationRequest(
  supabaseAdmin: any,
  row: NotifyBlessing,
  analysis: BlessingAnalysis,
): Promise<boolean> {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    console.error("[blessings] DISCORD_WEBHOOK_URL not configured");
    return false;
  }
  const siteUrl = process.env.PUBLIC_SITE_URL ?? "https://rio-zonu.lovable.app";
  const approveUrl = `${siteUrl}/api/public/blessings/${row.id}/approve?token=${encodeURIComponent(row.moderation_token)}`;
  const rejectUrl = `${siteUrl}/api/public/blessings/${row.id}/reject?token=${encodeURIComponent(row.moderation_token)}`;

  const { rank, total } = await computeAiRank(supabaseAdmin, row.id, analysis.quality_score);
  const b = analysis.breakdown;
  const submitted = new Date(row.created_at);

  const embed = {
    title: "💒 New Wedding Blessing Awaiting Review",
    description:
      `A fully analysed blessing has been submitted for **Rithin & Harshita**.\n\n` +
      `**🧠 AI Summary**\n${moderationSummary(analysis)}\n\n` +
      `[🟢 **Approve Blessing**](${approveUrl})  •  [🔴 **Reject Blessing**](${rejectUrl})`,
    color: analysis.quality_score >= 55 ? 0x57f287 : analysis.quality_score >= 38 ? 0xfee75c : 0xed4245,
    fields: [
      { name: "👤 Guest Name", value: row.name.slice(0, 256), inline: true },
      { name: "⭐ Overall Score", value: bar(analysis.quality_score), inline: true },
      { name: "🏆 AI Overall Rank", value: `#${rank} of ${total}`, inline: true },
      { name: "❤️ Emotional Impact", value: bar(b.emotional_quality), inline: true },
      { name: "👨‍👩‍👧 Personalization", value: bar(b.personalization), inline: true },
      { name: "💍 Wedding Relevance", value: bar(b.wedding_relevance), inline: true },
      { name: "📝 Writing Quality", value: bar(b.writing_quality), inline: true },
      { name: "✨ Originality", value: bar(b.originality), inline: true },
      { name: "🤖 AI Content Probability", value: `${analysis.ai_probability}%`, inline: true },
      { name: "📏 Character Count", value: `${analysis.char_count} characters`, inline: true },
      { name: "📅 Submitted", value: submitted.toUTCString(), inline: true },
      { name: "🔖 Approval Status", value: "Pending", inline: true },
      {
        name: "🕊️ Blessing Message",
        value: row.note.length > 1024 ? row.note.slice(0, 1021) + "..." : row.note,
      },
    ],
    footer: { text: "Rithin & Harshita • Wedding Blessings" },
    timestamp: submitted.toISOString(),
  };

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Wedding Blessings",
        embeds: [embed],
        allowed_mentions: { parse: [] },
      }),
    });
    if (!res.ok) {
      console.error("[blessings] Discord webhook failed", res.status, await res.text());
      return false;
    }
    await supabaseAdmin.from("blessings").update({ email_sent: true }).eq("id", row.id);
    return true;
  } catch (e) {
    console.error("[blessings] Discord webhook error", e);
    return false;
  }
}