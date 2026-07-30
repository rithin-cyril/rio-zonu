import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const submitSchema = z.object({
  name: z.string().trim().min(1).max(80),
  note: z.string().trim().min(1).max(500),
});

export const submitBlessing = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submitSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const moderation_token = crypto.randomUUID();
    const { data: row, error } = await supabaseAdmin
      .from("blessings")
      .insert({ name: data.name, note: data.note, moderation_token })
      .select("id, name, note, created_at, moderation_token")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Insert failed");

    try {
      const { analyzeAndStore } = await import("@/lib/blessing-analysis.server");
      await analyzeAndStore(supabaseAdmin, { id: row.id, name: row.name, note: row.note });
    } catch (e) {
      console.error("[blessings] analysis on submit failed", e);
    }

    try {
      await supabaseAdmin.from("moderation_logs").insert({
        blessing_id: row.id,
        guest_name: row.name,
        action: "submitted",
        administrator: "guest",
        previous_status: null,
        new_status: "pending",
      });
    } catch (e) {
      console.error("[blessings] log submitted failed", e);
    }

    const webhook = process.env.DISCORD_WEBHOOK_URL;
    const siteUrl = process.env.PUBLIC_SITE_URL ?? "https://rio-zonu.lovable.app";
    if (webhook) {
      const approveUrl = `${siteUrl}/api/public/blessings/${row.id}/approve?token=${encodeURIComponent(moderation_token)}`;
      const rejectUrl = `${siteUrl}/api/public/blessings/${row.id}/reject?token=${encodeURIComponent(moderation_token)}`;
      const submitted = new Date(row.created_at);
      const submittedStr = submitted.toUTCString();
      const embed = {
        title: "💒 New Wedding Blessing Awaiting Review",
        description:
          `A new blessing has been submitted for **Rithin & Harshita**.\n\n` +
          `[🟢 **Approve Blessing**](${approveUrl})  •  [🔴 **Reject Blessing**](${rejectUrl})`,
        color: 0xb89b5e,
        fields: [
          { name: "👤 Guest Name", value: row.name.slice(0, 256), inline: true },
          { name: "✉️ Message Length", value: `${row.note.length} characters`, inline: true },
          { name: "🕊️ Blessing Message", value: row.note.length > 1024 ? row.note.slice(0, 1021) + "..." : row.note },
          { name: "📅 Submitted", value: submittedStr, inline: false },
        ],
        footer: { text: "Rithin & Harshita • Wedding Blessings" },
        timestamp: submitted.toISOString(),
      };
      const payload = {
        username: "Wedding Blessings",
        embeds: [embed],
        allowed_mentions: { parse: [] },
      };
      try {
        const res = await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          console.error("[blessings] Discord webhook failed", res.status, await res.text());
        }
      } catch (e) {
        console.error("[blessings] Discord webhook error", e);
      }
    } else {
      console.error("[blessings] DISCORD_WEBHOOK_URL not configured");
    }

    return { ok: true };
  });

export const getApprovedBlessings = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data, error }, settingsRes, rankingRes] = await Promise.all([
      supabaseAdmin
        .from("blessings")
        .select("id, name, note, approved_at, quality_score, sort_order")
        .eq("approved", true)
        .eq("rejected", false)
        .eq("hidden", false),
      supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("key", "public_dates")
        .maybeSingle(),
      supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("key", "blessings_ranking")
        .maybeSingle(),
    ]);
    if (error) throw new Error(error.message);
    const showDates =
      (settingsRes.data?.value as { show?: boolean } | null)?.show !== false;
    const manual =
      (rankingRes.data?.value as { mode?: string } | null)?.mode === "manual";

    const rows = [...(data ?? [])];
    rows.sort((a: any, b: any) => {
      if (manual) {
        const ao = a.sort_order ?? Number.MAX_SAFE_INTEGER;
        const bo = b.sort_order ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
      } else {
        const as = a.quality_score ?? -1;
        const bs = b.quality_score ?? -1;
        if (as !== bs) return bs - as;
      }
      return (a.approved_at ?? "").localeCompare(b.approved_at ?? "");
    });

    return {
      blessings: rows.map(({ id, name, note, approved_at }: any) => ({
        id,
        name,
        note,
        approved_at,
      })),
      showDates,
    };
  });