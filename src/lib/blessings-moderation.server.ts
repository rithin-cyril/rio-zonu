import { timingSafeEqual } from "node:crypto";

export function safeEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

const baseStyles = `
:root{--gold:#b89b5e;--ink:#2b2218;--paper:#faf5ea;--cream:#fffdf7}
*{box-sizing:border-box}
body{font-family:Georgia,'Times New Roman',serif;background:var(--paper);color:var(--ink);display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;line-height:1.6}
.card{max-width:560px;width:100%;border:1px solid var(--gold);background:var(--cream);padding:40px 32px;border-radius:6px;box-shadow:0 18px 50px -20px rgba(184,155,94,.45)}
.eyebrow{font-size:11px;letter-spacing:.4em;text-transform:uppercase;color:var(--gold);text-align:center;margin:0 0 12px;font-family:Georgia,serif}
h1{font-size:26px;margin:0 0 8px;text-align:center;font-weight:500;letter-spacing:.02em}
.lede{margin:0 0 24px;text-align:center;font-style:italic;color:#5b4d3a}
.divider{height:1px;background:linear-gradient(to right,transparent,var(--gold),transparent);margin:20px 0}
.row{margin:14px 0}
.label{font-size:10px;letter-spacing:.35em;text-transform:uppercase;color:var(--gold);margin-bottom:4px;font-weight:600}
.value{font-size:15px;color:var(--ink)}
.message{background:#fbf8f1;border-left:3px solid var(--gold);padding:14px 16px;font-style:italic;white-space:pre-wrap;word-wrap:break-word;margin-top:4px;border-radius:0 4px 4px 0}
label.field{display:block;margin-top:18px}
label.field .label{display:block}
textarea{width:100%;min-height:130px;padding:12px 14px;border:1px solid rgba(184,155,94,.6);background:#fff;font:inherit;font-style:italic;color:var(--ink);border-radius:4px;resize:vertical;outline:none}
textarea:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(184,155,94,.15)}
.hint{font-size:12px;color:#7a6f63;margin-top:6px;display:flex;justify-content:space-between}
.err{color:#b03030;font-size:13px;margin-top:8px;font-style:italic}
.actions{display:flex;gap:10px;margin-top:22px;flex-wrap:wrap}
button,.btn{flex:1;min-height:44px;padding:10px 18px;font:600 11px/1 Georgia,serif;letter-spacing:.3em;text-transform:uppercase;border-radius:4px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;transition:all .2s}
.btn-primary{background:var(--ink);color:var(--cream);border:1px solid var(--ink)}
.btn-primary:hover{background:#1a1410}
.btn-danger{background:#8a2424;color:#fff;border:1px solid #8a2424}
.btn-danger:hover{background:#6b1c1c}
.btn-ghost{background:transparent;color:var(--ink);border:1px solid rgba(184,155,94,.6)}
.btn-ghost:hover{background:rgba(184,155,94,.1)}
`;

export function htmlPage(title: string, inner: string) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${baseStyles}</style></head><body><div class="card">${inner}</div></body></html>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatTimestamp(iso: string) {
  try {
    return new Date(iso).toUTCString();
  } catch {
    return iso;
  }
}

export function alreadyReviewedPage() {
  return htmlPage(
    "Already Reviewed",
    `<p class="eyebrow">✦ Moderation ✦</p>
     <h1>This blessing has already been reviewed.</h1>
     <p class="lede">No further action is needed.</p>`,
  );
}

export function notFoundPage() {
  return new Response("Blessing not found", { status: 404 });
}

export function invalidTokenPage() {
  return new Response("Invalid moderation token", { status: 401 });
}