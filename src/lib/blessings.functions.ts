import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sortPublicOrder } from "@/lib/blessing-order";

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

    // 1) Analyse first — the moderator must never see an unanalysed blessing.
    const { analyzeAndStore } = await import("@/lib/blessing-analysis.server");
    const analysis = await analyzeAndStore(supabaseAdmin, {
      id: row.id,
      name: row.name,
      note: row.note,
    });

    if (!analysis) {
      console.error("[blessings] analysis failed on submit", row.id);
      try {
        await supabaseAdmin
          .from("blessings")
          .update({ analysis: { failed: true, failed_at: new Date().toISOString() } })
          .eq("id", row.id);
        await supabaseAdmin.from("moderation_logs").insert({
          blessing_id: row.id,
          guest_name: row.name,
          action: "analysis_failed",
          administrator: "system",
          previous_status: "pending",
          new_status: "pending",
          reason: "Analysis failed — Discord approval request not sent. Retry from the admin panel.",
        });
      } catch (e) {
        console.error("[blessings] marking analysis failure failed", e);
      }
      return { ok: true, analyzed: false, notified: false };
    }

    // 2) Only now notify the moderator, with the full analysis attached.
    const { sendModerationRequest } = await import("@/lib/blessing-notify.server");
    const notified = await sendModerationRequest(
      supabaseAdmin,
      { ...row, moderation_token },
      analysis,
    );

    return { ok: true, analyzed: true, notified };
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

    const rows = sortPublicOrder((data ?? []) as any[], manual);

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