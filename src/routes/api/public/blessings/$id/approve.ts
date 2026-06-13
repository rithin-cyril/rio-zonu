import { createFileRoute } from "@tanstack/react-router";
import {
  alreadyReviewedPage,
  escapeHtml,
  formatTimestamp,
  htmlPage,
  invalidTokenPage,
  notFoundPage,
  safeEq,
} from "@/lib/blessings-moderation.server";

export const Route = createFileRoute("/api/public/blessings/$id/approve")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row } = await supabaseAdmin
          .from("blessings")
          .select("id, name, note, moderation_token, approved, rejected, approved_at")
          .eq("id", params.id)
          .maybeSingle();
        if (!row) return notFoundPage();
        if (!token || !safeEq(token, row.moderation_token)) return invalidTokenPage();
        if (row.approved || row.rejected) return alreadyReviewedPage();

        const approvedAt = new Date().toISOString();
        const { error } = await supabaseAdmin
          .from("blessings")
          .update({ approved: true, rejected: false, approved_at: approvedAt })
          .eq("id", params.id)
          .eq("approved", false)
          .eq("rejected", false);
        if (error) {
          console.error("[blessings] approve update failed", error);
          return new Response("Internal server error", { status: 500 });
        }

        console.info("[blessings] moderation: APPROVED", {
          blessingId: row.id,
          approvedAt,
        });

        try {
          await supabaseAdmin.from("moderation_logs").insert({
            blessing_id: row.id,
            guest_name: row.name,
            action: "approved",
            administrator: "discord",
            previous_status: "pending",
            new_status: "approved",
          });
        } catch (e) {
          console.error("[blessings] log approve failed", e);
        }

        return htmlPage(
          "Blessing Approved",
          `<p class="eyebrow">✦ Moderation ✦</p>
           <h1>✅ Blessing Approved</h1>
           <p class="lede">This blessing is now visible on the wedding website.</p>
           <div class="divider"></div>
           <div class="row"><div class="label">Guest Name</div><div class="value">${escapeHtml(row.name)}</div></div>
           <div class="row"><div class="label">Blessing Message</div><div class="message">${escapeHtml(row.note)}</div></div>
           <div class="row"><div class="label">Approved At</div><div class="value">${escapeHtml(formatTimestamp(approvedAt))}</div></div>`,
        );
      },
    },
  },
});