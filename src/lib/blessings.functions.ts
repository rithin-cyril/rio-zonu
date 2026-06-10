import { createServerFn } from "@tanstack/react-start";

const PASSCODE = "1810";

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