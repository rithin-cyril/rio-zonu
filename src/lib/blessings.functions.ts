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

    const webhook = process.env.DISCORD_WEBHOOK_URL;
    const siteUrl = process.env.PUBLIC_SITE_URL ?? "https://rio-zonu.lovable.app";
    if (webhook) {
      const approveUrl = `${siteUrl}/api/public/blessings/${row.id}/approve?token=${encodeURIComponent(moderation_token)}`;
      const rejectUrl = `${siteUrl}/api/public/blessings/${row.id}/reject?token=${encodeURIComponent(moderation_token)}`;
      const content =
        `🎉 **New Wedding Blessing Pending Approval**\n\n` +
        `**Name:**\n${row.name}\n\n` +
        `**Message:**\n${row.note}\n\n` +
        `**Submitted:**\n${row.created_at}\n\n` +
        `**Approve:**\n${approveUrl}\n\n` +
        `**Reject:**\n${rejectUrl}`;
      try {
        const res = await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
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