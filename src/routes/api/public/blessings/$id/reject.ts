import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

function page(title: string, body: string) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:Georgia,serif;background:#faf5ea;color:#2b2218;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}div{max-width:480px;border:1px solid #b89b5e;background:#fff;padding:40px 28px;border-radius:6px;box-shadow:0 10px 30px -10px rgba(184,155,94,.3)}h1{font-size:22px;margin:0 0 12px}p{font-style:italic;margin:0;line-height:1.6}</style></head><body><div><h1>${title}</h1><p>${body}</p></div></body></html>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

function safeEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
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
          .select("id, moderation_token")
          .eq("id", params.id)
          .maybeSingle();
        if (!row) return new Response("Not found", { status: 404 });
        if (!token || !safeEq(token, row.moderation_token)) {
          return new Response("Invalid token", { status: 401 });
        }
        const { error } = await supabaseAdmin
          .from("blessings")
          .update({ rejected: true, approved: false })
          .eq("id", params.id);
        if (error) return new Response(error.message, { status: 500 });
        return page("❌ Blessing Rejected", "This blessing will not be displayed publicly.");
      },
    },
  },
});
