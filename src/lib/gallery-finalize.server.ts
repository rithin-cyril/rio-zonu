// Server-only: validates freshly uploaded objects by their REAL bytes and
// flips the record from "uploading" to "ready" (or "failed").
import { PRIVATE_BUCKET } from "@/lib/gallery-shared";

export async function finalizeUpload(
  supabaseAdmin: any,
  input: {
    id: string;
    width?: number | null;
    height?: number | null;
    duration?: number | null;
    expectSource: "guest" | "admin";
  },
) {
  const { inspectStoredObject, removeObjects, notifyGuestSubmission } = await import(
    "@/lib/gallery.server"
  );

  const { data: row } = await supabaseAdmin
    .from("gallery_media")
    .select(
      "id, kind, category, source, status, submitter_name, submitted_at, original_path, public_path, poster_path, bucket_public",
    )
    .eq("id", input.id)
    .maybeSingle();

  if (!row) throw new Error("Upload not found.");
  if (row.source !== input.expectSource) throw new Error("Upload not found.");
  if (row.status !== "uploading") return { ok: true, status: row.status };

  await supabaseAdmin.from("gallery_media").update({ status: "processing" }).eq("id", row.id);

  const publicBucket = row.bucket_public as string;
  const expected = row.kind === "photo" ? "image" : "video";

  const fail = async (reason: string) => {
    await removeObjects(supabaseAdmin, [
      { bucket: PRIVATE_BUCKET, path: row.original_path },
      { bucket: publicBucket, path: row.public_path },
      { bucket: publicBucket, path: row.poster_path },
    ]);
    await supabaseAdmin
      .from("gallery_media")
      .update({
        status: "failed",
        error: reason,
        original_path: null,
        public_path: null,
        poster_path: null,
      })
      .eq("id", row.id);
    throw new Error(reason);
  };

  let bytesOriginal = 0;
  let bytesPublic = 0;
  let bytesPoster = 0;

  try {
    const orig = await inspectStoredObject(supabaseAdmin, PRIVATE_BUCKET, row.original_path);
    if (!orig.sniffed || orig.sniffed.family !== expected) {
      return await fail("This file is not a valid photo or video and was rejected.");
    }
    bytesOriginal = orig.size;

    const pub = await inspectStoredObject(supabaseAdmin, publicBucket, row.public_path);
    if (!pub.sniffed || pub.sniffed.family !== expected) {
      return await fail("The processed file failed validation and was rejected.");
    }
    bytesPublic = pub.size;
  } catch (e: any) {
    if (e?.message && /rejected/.test(e.message)) throw e;
    return await fail("The upload could not be verified. Please try again.");
  }

  let posterPath: string | null = row.poster_path;
  try {
    const poster = await inspectStoredObject(supabaseAdmin, publicBucket, row.poster_path);
    if (!poster.sniffed || poster.sniffed.family !== "image") {
      await removeObjects(supabaseAdmin, [{ bucket: publicBucket, path: row.poster_path }]);
      posterPath = null;
    } else {
      bytesPoster = poster.size;
    }
  } catch {
    posterPath = null;
  }

  await supabaseAdmin
    .from("gallery_media")
    .update({
      status: "ready",
      error: null,
      poster_path: posterPath,
      width: input.width ?? null,
      height: input.height ?? null,
      duration_seconds: input.duration ?? null,
      bytes_original: bytesOriginal,
      bytes_public: bytesPublic,
      bytes_poster: bytesPoster,
    })
    .eq("id", row.id);

  if (row.source === "guest") {
    await notifyGuestSubmission({
      id: row.id,
      kind: row.kind,
      category: row.category,
      submitter_name: row.submitter_name,
      submitted_at: row.submitted_at ?? new Date().toISOString(),
      status: "ready",
    });
  }

  return { ok: true, status: "ready" as const };
}
