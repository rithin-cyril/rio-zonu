import { createServerFn } from "@tanstack/react-start";

const PASSCODE = "1810";
const DEFAULT_FROM_EMAIL = "Wedding Blessings <onboarding@resend.dev>";

type BlessingInput = {
  name: string;
  note: string;
};

function cleanBlessingInput(data: BlessingInput): BlessingInput {
  const name = typeof data?.name === "string" ? data.name.trim() : "";
  const note = typeof data?.note === "string" ? data.note.trim() : "";

  if (!name || !note) {
    throw new Error("Name and blessing are required");
  }
  if (name.length > 80) {
    throw new Error("Name is too long");
  }
  if (note.length > 500) {
    throw new Error("Blessing is too long");
  }

  return { name, note };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendBlessingEmail({ name, note }: BlessingInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.BLESSINGS_RECIPIENT_EMAIL;
  const from = process.env.BLESSINGS_FROM_EMAIL || DEFAULT_FROM_EMAIL;

  if (!apiKey || !to) {
    console.warn("[Blessings] Email skipped: RESEND_API_KEY or BLESSINGS_RECIPIENT_EMAIL is missing.");
    return false;
  }

  const escapedName = escapeHtml(name);
  const escapedNote = escapeHtml(note).replace(/\n/g, "<br />");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `New wedding blessing from ${name}`,
      text: `New wedding blessing\n\nFrom: ${name}\n\n${note}`,
      html: `
        <div style="font-family: Georgia, serif; line-height: 1.6; color: #2e2a26;">
          <h2 style="color: #8a6a2f;">New wedding blessing</h2>
          <p><strong>From:</strong> ${escapedName}</p>
          <div style="margin-top: 16px; padding: 16px; border-left: 3px solid #c9b37e; background: #fbf8f1;">
            ${escapedNote}
          </div>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`[Blessings] Email failed: ${response.status} ${detail}`);
    return false;
  }

  return true;
}

export const submitBlessing = createServerFn({ method: "POST" })
  .inputValidator(cleanBlessingInput)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const recipientEmail = process.env.BLESSINGS_RECIPIENT_EMAIL ?? "";

    const { data: row, error } = await supabaseAdmin
      .from("blessings")
      .insert({
        name: data.name,
        note: data.note,
        recipient_email: recipientEmail,
        email_sent: false,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    const emailSent = await sendBlessingEmail(data);

    if (emailSent && row?.id) {
      const { error: updateError } = await supabaseAdmin
        .from("blessings")
        .update({ email_sent: true })
        .eq("id", row.id);

      if (updateError) {
        console.error(`[Blessings] Could not mark email as sent: ${updateError.message}`);
      }
    }

    return { ok: true, emailSent };
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
      .select("id, name, note, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { blessings: rows ?? [] };
  });
