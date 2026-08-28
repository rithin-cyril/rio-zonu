import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  CATEGORY_KEYS,
  PRIVATE_BUCKET,
  PUBLIC_BUCKET,
  type PublicMedia,
} from "@/lib/gallery-shared";

const categorySchema = z.enum(CATEGORY_KEYS as [string, ...string[]]);
const kindSchema = z.enum(["photo", "video"]);
const extSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]{2,5}$/, "Unsupported file");

export const getGalleryVisibility = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("key", "gallery_visible")
    .maybeSingle();
  return { show: (data?.value as { show?: boolean } | null)?.show === true };
});

/**
 * Public gallery feed. Server-side enforced: while the gallery is hidden this
 * returns nothing, so the /gallery URL cannot be reached by guessing it.
 * Only optimised, approved, published, ready media is ever exposed — and only
 * through short-lived signed URLs. Originals stay private forever.
 */
export const getPublicGallery = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { signMany } = await import("@/lib/gallery.server");

  const { data: setting } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("key", "gallery_visible")
    .maybeSingle();
  const show = (setting?.value as { show?: boolean } | null)?.show === true;
  if (!show) return { show: false, media: [] as PublicMedia[] };

  const { data } = await supabaseAdmin
    .from("gallery_media")
    .select("id, kind, category, caption, public_path, poster_path, width, height, sort_order, created_at")
    .eq("published", true)
    .eq("status", "ready")
    .eq("approval_status", "approved")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const rows = (data ?? []).filter((r: any) => r.public_path);
  const urls = await signMany(
    supabaseAdmin,
    PUBLIC_BUCKET,
    rows.flatMap((r: any) => [r.public_path, r.poster_path]).filter(Boolean),
    60 * 60 * 6,
  );

  const media: PublicMedia[] = rows
    .map((r: any) => ({
      id: r.id,
      kind: r.kind,
      category: r.category,
      caption: r.caption ?? "",
      url: urls[r.public_path] ?? "",
      poster: r.poster_path ? (urls[r.poster_path] ?? null) : null,
      width: r.width,
      height: r.height,
    }))
    .filter((m) => m.url);

  return { show: true, media };
});

/**
 * Step 1 of a guest submission. Creates the quarantined record and hands back
 * short-lived signed upload URLs pointing at SERVER-GENERATED random paths in
 * the private pending area. The guest's filename never touches storage.
 */
export const guestCreateUpload = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(80),
        kind: kindSchema,
        category: categorySchema.optional(),
        caption: z.string().trim().max(240).optional(),
        ext: extSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requestMeta, storagePath } = await import("@/lib/gallery.server");
    const { startUploadTrace } = await import("@/lib/gallery-log.server");
    const { ip, ua } = requestMeta();
    const trace = startUploadTrace({
      actor: "guest",
      kind: data.kind,
      category: data.category ?? "wedding",
    });

    // Abuse protection: cap submissions per IP per hour.
    if (ip) {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabaseAdmin
        .from("gallery_media")
        .select("id", { count: "exact", head: true })
        .eq("submitter_ip", ip)
        .gte("submitted_at", since);
      if ((count ?? 0) >= 15) {
        trace.fail("PERMISSION_CHECK", new Error("rate limited"));
        throw new Error("Too many uploads from this connection. Please try again later.");
      }
    }
    trace.log("FILE_VALIDATION", { ext: data.ext });

    const id = crypto.randomUUID();
    const original = storagePath("pending", id, "original", data.ext);
    const pub = storagePath("pending", id, "public", data.kind === "photo" ? "webp" : data.ext);
    const poster = storagePath("pending", id, "poster", "webp");

    trace.log("UPLOAD_INITIALIZATION", { mediaId: id, bucket: PRIVATE_BUCKET });

    const { error } = await supabaseAdmin.from("gallery_media").insert({
      id,
      kind: data.kind,
      category: data.category ?? "wedding",
      caption: data.caption ?? "",
      source: "guest",
      approval_status: "pending",
      status: "uploading",
      published: false,
      bucket_public: PRIVATE_BUCKET,
      original_path: original,
      public_path: pub,
      poster_path: poster,
      submitter_name: data.name,
      submitter_ip: ip,
      submitter_ua: ua,
    });
    if (error) throw trace.fail("DATABASE_RECORD", error, { mediaId: id });
    trace.log("DATABASE_RECORD", { mediaId: id });

    const sign = async (path: string) => {
      trace.log("STORAGE_REQUEST", { bucket: PRIVATE_BUCKET });
      const { data: s, error: e } = await supabaseAdmin.storage
        .from(PRIVATE_BUCKET)
        .createSignedUploadUrl(path);
      if (e || !s)
        throw trace.fail("STORAGE_RESPONSE", e ?? new Error("no signed url"), {
          bucket: PRIVATE_BUCKET,
        });
      trace.log("STORAGE_RESPONSE", { bucket: PRIVATE_BUCKET, ok: true });
      return { path, token: s.token as string };
    };

    const out = {
      id,
      ref: trace.ref,
      bucket: PRIVATE_BUCKET,
      original: await sign(original),
      public: await sign(pub),
      poster: await sign(poster),
    };
    trace.log("UPLOAD_COMPLETE", { mediaId: id });
    return out;
  });


/**
 * Step 2 of a guest submission. Validates the ACTUAL bytes of everything that
 * landed in storage, discards anything that is not a genuine image/video, then
 * queues the submission for admin review and pings Discord (notification only).
 */
export const guestFinalizeUpload = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        width: z.number().int().positive().max(20000).nullable().optional(),
        height: z.number().int().positive().max(20000).nullable().optional(),
        duration: z.number().nonnegative().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { finalizeUpload } = await import("@/lib/gallery-finalize.server");
    return finalizeUpload(supabaseAdmin, { ...data, expectSource: "guest" });
  });
