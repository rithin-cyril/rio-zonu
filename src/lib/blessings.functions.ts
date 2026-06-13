import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PASSCODE = "1810";

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
    const { data, error } = await supabaseAdmin
      .from("blessings")
      .select("id, name, note, approved_at")
      .eq("approved", true)
      .eq("rejected", false)
      .eq("hidden", false)
      .order("approved_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { blessings: data ?? [] };
  });

export const getBlessings = createServerFn({ method: "POST" })
  .inputValidator((data: { passcode: string }) => {
    if (typeof data?.passcode !== "string" || data.passcode.length > 20) {
      throw new Error("Invalid passcode");
    }
    return { passcode: data.passcode };
  })
  .handler(async ({ data }) => {
    if (data.passcode !== PASSCODE) {
      throw new Error("Incorrect passcode");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("blessings")
      .select("id, name, note, created_at, approved, rejected")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { blessings: rows ?? [] };
  });

const moderateSchema = z.object({
  passcode: z.string().max(20),
  id: z.string().uuid(),
  action: z.enum(["approve", "hide"]),
});

export const moderateBlessing = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => moderateSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.passcode !== PASSCODE) {
      throw new Error("Incorrect passcode");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const update =
      data.action === "approve"
        ? { approved: true, rejected: false, approved_at: new Date().toISOString() }
        : { approved: false, rejected: true };
    const { error } = await supabaseAdmin
      .from("blessings")
      .update(update)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });