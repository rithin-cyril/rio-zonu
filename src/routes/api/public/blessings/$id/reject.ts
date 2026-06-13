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

function renderForm(opts: {
  id: string;
  token: string;
  name: string;
  note: string;
  error?: string;
  value?: string;
}) {
  const action = `/api/public/blessings/${opts.id}/reject?token=${encodeURIComponent(opts.token)}`;
  return htmlPage(
    "Reject Blessing",
    `<p class="eyebrow">✦ Moderation ✦</p>
     <h1>Reject Blessing</h1>
     <p class="lede">Please provide a reason. This is required for the moderation log.</p>
     <div class="divider"></div>
     <div class="row"><div class="label">Guest Name</div><div class="value">${escapeHtml(opts.name)}</div></div>
     <div class="row"><div class="label">Blessing Message</div><div class="message">${escapeHtml(opts.note)}</div></div>
     <form method="POST" action="${action}">
       <label class="field">
         <span class="label">Reason for Rejection</span>
         <textarea name="reason" required minlength="10" maxlength="500" placeholder="Briefly explain why this blessing is being rejected (10–500 characters)…">${escapeHtml(opts.value ?? "")}</textarea>
         <div class="hint"><span>Required • 10–500 characters</span></div>
       </label>
       ${opts.error ? `<p class="err">${escapeHtml(opts.error)}</p>` : ""}
       <div class="actions">
         <button type="submit" class="btn-danger">Confirm Rejection</button>
         <a href="about:blank" onclick="window.close();return false;" class="btn-ghost">Cancel</a>
       </div>
     </form>`,
  );
}

export const Route = createFileRoute("/api/public/blessings/$id/reject")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row } = await supabaseAdmin
          .from("blessings")
          .select("id, name, note, moderation_token, approved, rejected")
          .eq("id", params.id)
          .maybeSingle();
        if (!row) return notFoundPage();
        if (!token || !safeEq(token, row.moderation_token)) return invalidTokenPage();
        if (row.approved || row.rejected) return alreadyReviewedPage();
        return renderForm({ id: row.id, token, name: row.name, note: row.note });
      },
      POST: async ({ request, params }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row } = await supabaseAdmin
          .from("blessings")
          .select("id, name, note, moderation_token, approved, rejected")
          .eq("id", params.id)
          .maybeSingle();
        if (!row) return notFoundPage();
        if (!token || !safeEq(token, row.moderation_token)) return invalidTokenPage();
        if (row.approved || row.rejected) return alreadyReviewedPage();

        const form = await request.formData();
        const rawReason = String(form.get("reason") ?? "");
        const reason = rawReason.trim();

        if (reason.length < 10 || reason.length > 500) {
          return renderForm({
            id: row.id,
            token,
            name: row.name,
            note: row.note,
            value: rawReason,
            error:
              reason.length === 0
                ? "A reason is required."
                : reason.length < 10
                ? "Reason must be at least 10 characters."
                : "Reason must be 500 characters or fewer.",
          });
        }

        const rejectedAt = new Date().toISOString();
        const { error } = await supabaseAdmin
          .from("blessings")
          .update({
            approved: false,
            rejected: true,
            rejection_reason: reason,
            rejected_at: rejectedAt,
          })
          .eq("id", params.id)
          .eq("approved", false)
          .eq("rejected", false);
        if (error) return new Response(error.message, { status: 500 });

        console.info("[blessings] moderation: REJECTED", {
          blessingId: row.id,
          rejectedAt,
          rejection_reason: reason,
        });

        try {
          await supabaseAdmin.from("moderation_logs").insert({
            blessing_id: row.id,
            guest_name: row.name,
            action: "rejected",
            administrator: "discord",
            previous_status: "pending",
            new_status: "rejected",
            reason,
          });
        } catch (e) {
          console.error("[blessings] log reject failed", e);
        }

        return htmlPage(
          "Blessing Rejected",
          `<p class="eyebrow">✦ Moderation ✦</p>
           <h1>❌ Blessing Rejected</h1>
           <p class="lede">This blessing will not be displayed publicly.</p>
           <div class="divider"></div>
           <div class="row"><div class="label">Guest Name</div><div class="value">${escapeHtml(row.name)}</div></div>
           <div class="row"><div class="label">Rejection Reason</div><div class="message">${escapeHtml(reason)}</div></div>
           <div class="row"><div class="label">Rejected At</div><div class="value">${escapeHtml(formatTimestamp(rejectedAt))}</div></div>`,
        );
      },
    },
  },
});