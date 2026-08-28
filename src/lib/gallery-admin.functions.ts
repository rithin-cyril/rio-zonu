import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CATEGORY_KEYS, PRIVATE_BUCKET, PUBLIC_BUCKET } from "@/lib/gallery-shared";

const PERM = "website.gallery";
const categorySchema = z.enum(CATEGORY_KEYS as [string, ...string[]]);
const kindSchema = z.enum(["photo", "video"]);
const extSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]{2,5}$/, "Unsupported file");

async function guard(context: any, permission = PERM) {
  const { requirePermission } = await import("@/lib/rbac.server");
  return requirePermission(context, permission);
}

// ---- List everything (library + moderation queue) ----
export const adminGalleryList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = await guard(context as any, "website.gallery");
    const { signMany } = await import("@/lib/gallery.server");
    const { supabaseAdmin } = me;

    const { data } = await supabaseAdmin
      .from("gallery_media")
      .select("*")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    const rows = (data ?? []) as any[];
    const byBucket: Record<string, string[]> = {};
    for (const r of rows) {
      const b = r.bucket_public ?? PUBLIC_BUCKET;
      byBucket[b] = [...(byBucket[b] ?? []), r.public_path, r.poster_path].filter(Boolean);
    }
    const signed: Record<string, Record<string, string>> = {};
    for (const [bucket, paths] of Object.entries(byBucket)) {
      signed[bucket] = await signMany(supabaseAdmin, bucket, paths, 60 * 60);
    }

    const { data: setting } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "gallery_visible")
      .maybeSingle();

    const items = rows.map((r) => {
      const bucket = r.bucket_public ?? PUBLIC_BUCKET;
      return {
        id: r.id,
        kind: r.kind as "photo" | "video",
        category: r.category as string,
        caption: r.caption ?? "",
        status: r.status as string,
        approvalStatus: r.approval_status as string,
        published: !!r.published,
        source: r.source as string,
        submitterName: r.submitter_name as string | null,
        submittedAt: r.submitted_at as string | null,
        reviewedAt: r.reviewed_at as string | null,
        reviewedByLabel: r.reviewed_by_label as string | null,
        rejectionReason: r.rejection_reason as string | null,
        width: r.width as number | null,
        height: r.height as number | null,
        duration: r.duration_seconds as number | null,
        bytes:
          (r.bytes_original ?? 0) + (r.bytes_public ?? 0) + (r.bytes_poster ?? 0),
        sortOrder: r.sort_order as number | null,
        createdAt: r.created_at as string,
        url: (r.public_path && signed[bucket]?.[r.public_path]) || null,
        poster: (r.poster_path && signed[bucket]?.[r.poster_path]) || null,
      };
    });

    return {
      items,
      galleryVisible: (setting?.value as { show?: boolean } | null)?.show === true,
      storageBytes: items.reduce((a, i) => a + i.bytes, 0),
      permissions: me.permissions,
    };
  });

// ---- Show / hide the whole gallery on the public site ----
export const adminSetGalleryVisible = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ show: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const me = await guard(context as any);
    const { logActivity } = await import("@/lib/rbac.server");
    await me.supabaseAdmin
      .from("site_settings")
      .upsert({ key: "gallery_visible", value: { show: data.show }, updated_at: new Date().toISOString() });
    await logActivity(me.supabaseAdmin, {
      actor_id: me.userId,
      actor_label: me.username,
      action: "gallery.visibility",
      details: data.show ? "Gallery shown on website" : "Gallery hidden from website",
    });
    return { show: data.show };
  });

// ---- Admin upload: signed URLs straight into the public library area ----
export const adminGalleryCreateUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        kind: kindSchema,
        category: categorySchema,
        caption: z.string().trim().max(240).optional(),
        ext: extSchema,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { startUploadTrace } = await import("@/lib/gallery-log.server");
    const trace = startUploadTrace({
      actor: "admin",
      kind: data.kind,
      category: data.category,
    });

    let me: Awaited<ReturnType<typeof guard>>;
    try {
      me = await guard(context as any);
      trace.log("PERMISSION_CHECK", { permission: PERM, granted: true });
    } catch (e) {
      throw trace.fail("PERMISSION_CHECK", e, { granted: false });
    }

    const { storagePath } = await import("@/lib/gallery.server");
    const { supabaseAdmin } = me;

    trace.log("FILE_VALIDATION", { ext: data.ext });

    const id = crypto.randomUUID();
    const original = storagePath("library", id, "original", data.ext);
    const pub = storagePath("library", id, "public", data.kind === "photo" ? "webp" : data.ext);
    const poster = storagePath("library", id, "poster", "webp");

    trace.log("UPLOAD_INITIALIZATION", { mediaId: id, bucket: PUBLIC_BUCKET });

    const { error } = await supabaseAdmin.from("gallery_media").insert({
      id,
      kind: data.kind,
      category: data.category,
      caption: data.caption ?? "",
      source: "admin",
      approval_status: "approved",
      status: "uploading",
      published: false,
      bucket_public: PUBLIC_BUCKET,
      original_path: original,
      public_path: pub,
      poster_path: poster,
      uploaded_by: me.userId,
      uploaded_by_label: me.username,
      reviewed_by: me.userId,
      reviewed_by_label: me.username,
      reviewed_at: new Date().toISOString(),
    });
    if (error) throw trace.fail("DATABASE_RECORD", error, { mediaId: id });
    trace.log("DATABASE_RECORD", { mediaId: id });

    const sign = async (bucket: string, path: string) => {
      trace.log("STORAGE_REQUEST", { bucket });
      const { data: s, error: e } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUploadUrl(path);
      if (e || !s) throw trace.fail("STORAGE_RESPONSE", e ?? new Error("no signed url"), { bucket });
      trace.log("STORAGE_RESPONSE", { bucket, ok: true });
      return { bucket, path, token: s.token as string };
    };

    const out = {
      id,
      ref: trace.ref,
      original: await sign(PRIVATE_BUCKET, original),
      public: await sign(PUBLIC_BUCKET, pub),
      poster: await sign(PUBLIC_BUCKET, poster),
    };
    trace.log("UPLOAD_COMPLETE", { mediaId: id });
    return out;
  });


export const adminGalleryFinalizeUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        width: z.number().int().positive().max(20000).nullable().optional(),
        height: z.number().int().positive().max(20000).nullable().optional(),
        duration: z.number().nonnegative().nullable().optional(),
        publish: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const me = await guard(context as any);
    const { finalizeUpload } = await import("@/lib/gallery-finalize.server");
    const { logActivity } = await import("@/lib/rbac.server");
    const res = await finalizeUpload(me.supabaseAdmin, { ...data, expectSource: "admin" });
    if (data.publish !== false) {
      await me.supabaseAdmin
        .from("gallery_media")
        .update({ published: true })
        .eq("id", data.id)
        .eq("status", "ready");
    }
    await logActivity(me.supabaseAdmin, {
      actor_id: me.userId,
      actor_label: me.username,
      action: "gallery.upload",
      details: `Uploaded media ${data.id}`,
    });
    return res;
  });

// ---- Edit caption / category / visibility ----
export const adminGalleryUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        caption: z.string().trim().max(240).optional(),
        category: categorySchema.optional(),
        published: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const me = await guard(context as any);
    const { logActivity } = await import("@/lib/rbac.server");
    const patch: Record<string, unknown> = {};
    if (data.caption !== undefined) patch.caption = data.caption;
    if (data.category !== undefined) patch.category = data.category;
    if (data.published !== undefined) patch.published = data.published;
    if (!Object.keys(patch).length) return { ok: true };

    const { error } = await me.supabaseAdmin
      .from("gallery_media")
      .update(patch)
      .eq("id", data.id)
      .eq("approval_status", "approved");
    if (error) throw new Error("Could not update this item.");

    await logActivity(me.supabaseAdmin, {
      actor_id: me.userId,
      actor_label: me.username,
      action: "gallery.update",
      details: `Updated media ${data.id}: ${Object.keys(patch).join(", ")}`,
    });
    return { ok: true };
  });

// ---- Reorder ----
export const adminGalleryReorder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const me = await guard(context as any);
    await Promise.all(
      data.ids.map((id, i) =>
        me.supabaseAdmin.from("gallery_media").update({ sort_order: i + 1 }).eq("id", id),
      ),
    );
    return { ok: true };
  });

// ---- Approve / reject a guest submission ----
export const adminGalleryReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approve", "reject"]),
        reason: z.string().trim().max(240).optional(),
        category: categorySchema.optional(),
        caption: z.string().trim().max(240).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const me = await guard(context as any);
    const { promoteObject, removeObjects } = await import("@/lib/gallery.server");
    const { logActivity } = await import("@/lib/rbac.server");
    const { supabaseAdmin } = me;

    const { data: row } = await supabaseAdmin
      .from("gallery_media")
      .select("id, kind, status, approval_status, public_path, poster_path, bucket_public")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Submission not found.");
    if (row.approval_status !== "pending") return { ok: true, already: true };

    const now = new Date().toISOString();

    if (data.decision === "reject") {
      await removeObjects(supabaseAdmin, [
        { bucket: row.bucket_public, path: row.public_path },
        { bucket: row.bucket_public, path: row.poster_path },
      ]);
      await supabaseAdmin
        .from("gallery_media")
        .update({
          approval_status: "rejected",
          published: false,
          public_path: null,
          poster_path: null,
          rejection_reason: data.reason ?? null,
          reviewed_at: now,
          reviewed_by: me.userId,
          reviewed_by_label: me.username,
        })
        .eq("id", row.id);
      await logActivity(supabaseAdmin, {
        actor_id: me.userId,
        actor_label: me.username,
        action: "gallery.reject",
        details: `Rejected guest media ${row.id}${data.reason ? `: ${data.reason}` : ""}`,
      });
      return { ok: true };
    }

    if (row.status !== "ready" || !row.public_path) {
      throw new Error("This submission is not ready for approval yet.");
    }

    const ext = row.public_path.split(".").pop() ?? "bin";
    const newPublic = `library/${row.id}/public-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}.${ext}`;
    const okPublic = await promoteObject(supabaseAdmin, row.public_path, newPublic);
    if (!okPublic) throw new Error("Could not publish this media. Please try again.");

    let newPoster: string | null = null;
    if (row.poster_path) {
      const p = `library/${row.id}/poster-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}.webp`;
      if (await promoteObject(supabaseAdmin, row.poster_path, p)) newPoster = p;
    }

    await removeObjects(supabaseAdmin, [
      { bucket: PRIVATE_BUCKET, path: row.public_path },
      { bucket: PRIVATE_BUCKET, path: row.poster_path },
    ]);

    await supabaseAdmin
      .from("gallery_media")
      .update({
        approval_status: "approved",
        published: true,
        bucket_public: PUBLIC_BUCKET,
        public_path: newPublic,
        poster_path: newPoster,
        category: data.category ?? undefined,
        caption: data.caption ?? undefined,
        reviewed_at: now,
        reviewed_by: me.userId,
        reviewed_by_label: me.username,
        rejection_reason: null,
      })
      .eq("id", row.id);

    await logActivity(supabaseAdmin, {
      actor_id: me.userId,
      actor_label: me.username,
      action: "gallery.approve",
      details: `Approved guest media ${row.id}`,
    });
    return { ok: true };
  });

// ---- Permanent delete (record + every stored object) ----
export const adminGalleryDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const me = await guard(context as any);
    const { removeObjects } = await import("@/lib/gallery.server");
    const { logActivity } = await import("@/lib/rbac.server");

    const { data: row } = await me.supabaseAdmin
      .from("gallery_media")
      .select("id, original_path, public_path, poster_path, bucket_public")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return { ok: true };

    await removeObjects(me.supabaseAdmin, [
      { bucket: PRIVATE_BUCKET, path: row.original_path },
      { bucket: row.bucket_public, path: row.public_path },
      { bucket: row.bucket_public, path: row.poster_path },
    ]);
    await me.supabaseAdmin.from("gallery_media").delete().eq("id", row.id);

    await logActivity(me.supabaseAdmin, {
      actor_id: me.userId,
      actor_label: me.username,
      action: "gallery.delete",
      details: `Deleted media ${row.id}`,
    });
    return { ok: true };
  });
