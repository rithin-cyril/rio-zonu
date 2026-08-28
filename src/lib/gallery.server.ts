// Server-only gallery helpers: content validation, storage plumbing,
// Discord notification. Never imported by client code.
import { getRequestHeader } from "@tanstack/react-start/server";
import { PRIVATE_BUCKET, PUBLIC_BUCKET } from "@/lib/gallery-shared";

export type Sniffed = { type: string; family: "image" | "video" } | null;

const has = (b: Uint8Array, sig: number[], at = 0) =>
  sig.every((v, i) => b[at + i] === v);

const ascii = (b: Uint8Array, s: string, at = 0) =>
  [...s].every((c, i) => b[at + i] === c.charCodeAt(0));

/**
 * Real file-signature sniffing. Client MIME types, extensions and filenames
 * are never trusted — only the actual bytes decide what a file is.
 */
export function isDangerous(b: Uint8Array): boolean {
  if (has(b, [0x4d, 0x5a])) return true; // MZ (exe/dll)
  if (has(b, [0x7f, 0x45, 0x4c, 0x46])) return true; // ELF
  if (has(b, [0x23, 0x21])) return true; // #!
  if (has(b, [0x50, 0x4b, 0x03, 0x04])) return true; // zip/office/apk
  const head = new TextDecoder("latin1").decode(b.slice(0, 512)).toLowerCase();
  return head.includes("<?php") || head.includes("<script") || head.includes("<!doctype html");
}

export function sniff(b: Uint8Array): Sniffed {
  if (isDangerous(b)) return null;

  if (has(b, [0xff, 0xd8, 0xff])) return { type: "image/jpeg", family: "image" };
  if (has(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return { type: "image/png", family: "image" };
  if (ascii(b, "GIF87a") || ascii(b, "GIF89a")) return { type: "image/gif", family: "image" };
  if (ascii(b, "RIFF") && ascii(b, "WEBP", 8)) return { type: "image/webp", family: "image" };
  if (ascii(b, "ftyp", 4)) {
    const brand = new TextDecoder("latin1").decode(b.slice(8, 12));
    if (/avif|avis|heic|heix|mif1/i.test(brand)) return { type: "image/avif", family: "image" };
    if (/qt/i.test(brand)) return { type: "video/quicktime", family: "video" };
    return { type: "video/mp4", family: "video" };
  }
  if (has(b, [0x1a, 0x45, 0xdf, 0xa3])) return { type: "video/webm", family: "video" };
  return null;
}

/** Random, server-generated storage path. Guest filenames are never used. */
export function storagePath(
  scope: "pending" | "library",
  id: string,
  slot: "original" | "public" | "poster",
  ext: string,
) {
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const safeExt = /^[a-z0-9]{2,5}$/.test(ext) ? ext : "bin";
  return `${scope}/${id}/${slot}-${rand}.${safeExt}`;
}

async function signedUrl(supabaseAdmin: any, bucket: string, path: string, seconds = 3600) {
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, seconds);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Could not sign media URL");
  return data.signedUrl as string;
}

export async function signMany(
  supabaseAdmin: any,
  bucket: string,
  paths: string[],
  seconds = 3600,
): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};
  const { data } = await supabaseAdmin.storage.from(bucket).createSignedUrls(unique, seconds);
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row?.path && row?.signedUrl) out[row.path] = row.signedUrl;
  }
  return out;
}

/**
 * Downloads the first bytes of a stored object and validates the real content
 * type. Returns the total object size too (from the range response).
 */
export async function inspectStoredObject(
  supabaseAdmin: any,
  bucket: string,
  path: string,
): Promise<{ sniffed: Sniffed; dangerous: boolean; head: string; size: number }> {
  const url = await signedUrl(supabaseAdmin, bucket, path, 60);
  const res = await fetch(url, { headers: { Range: "bytes=0-1023" } });
  if (!res.ok && res.status !== 206) throw new Error("Uploaded file could not be read back");
  const buf = new Uint8Array(await res.arrayBuffer());
  const range = res.headers.get("content-range");
  const total = range ? Number(range.split("/")[1]) : Number(res.headers.get("content-length") ?? 0);
  const head = [...buf.slice(0, 16)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join(" ");
  return {
    sniffed: sniff(buf),
    dangerous: isDangerous(buf),
    head,
    size: Number.isFinite(total) ? total : 0,
  };
}

export async function removeObjects(
  supabaseAdmin: any,
  entries: Array<{ bucket: string; path: string | null | undefined }>,
) {
  const byBucket = new Map<string, string[]>();
  for (const e of entries) {
    if (!e.path) continue;
    byBucket.set(e.bucket, [...(byBucket.get(e.bucket) ?? []), e.path]);
  }
  for (const [bucket, paths] of byBucket) {
    try {
      await supabaseAdmin.storage.from(bucket).remove(paths);
    } catch (e) {
      console.error("[gallery] remove failed", bucket, e);
    }
  }
}

/** Moves an object from the private quarantine area into the public library. */
export async function promoteObject(
  supabaseAdmin: any,
  fromPath: string,
  toPath: string,
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.storage
      .from(PRIVATE_BUCKET)
      .copy(fromPath, toPath, { destinationBucket: PUBLIC_BUCKET });
    if (!error) return true;
    console.error("[gallery] copy failed, falling back", error);
  } catch (e) {
    console.error("[gallery] copy threw, falling back", e);
  }
  try {
    const { data, error } = await supabaseAdmin.storage.from(PRIVATE_BUCKET).download(fromPath);
    if (error || !data) throw error ?? new Error("download failed");
    const { error: upErr } = await supabaseAdmin.storage
      .from(PUBLIC_BUCKET)
      .upload(toPath, data, { upsert: true, contentType: data.type || "application/octet-stream" });
    if (upErr) throw upErr;
    return true;
  } catch (e) {
    console.error("[gallery] promote failed", e);
    return false;
  }
}

export function requestMeta() {
  let ip: string | null = null;
  let ua: string | null = null;
  try {
    ip =
      (getRequestHeader("cf-connecting-ip") ||
        getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
        getRequestHeader("x-real-ip") ||
        null) ?? null;
    ua = getRequestHeader("user-agent") ?? null;
  } catch {
    /* outside request context */
  }
  return { ip, ua: ua ? ua.slice(0, 400) : null };
}

/** Notification only — no moderation controls, no private URLs, no PII. */
export async function notifyGuestSubmission(row: {
  id: string;
  kind: string;
  category: string;
  submitter_name: string | null;
  submitted_at: string;
  status: string;
}) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return false;
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Wedding Gallery",
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: "📸 New Guest Media Awaiting Review",
            description:
              "A guest submission has entered the moderation queue. Review it in the Admin Panel → Gallery → Photo & Video Approvals.",
            color: 0xc9b37e,
            fields: [
              { name: "👤 Submitted By", value: (row.submitter_name ?? "Guest").slice(0, 200), inline: true },
              { name: "🎞️ Media Type", value: row.kind === "video" ? "Video" : "Photo", inline: true },
              { name: "🗂️ Category", value: row.category, inline: true },
              { name: "🆔 Submission ID", value: row.id, inline: false },
              { name: "⏱️ Processing Status", value: row.status, inline: true },
              { name: "📅 Submitted", value: new Date(row.submitted_at).toUTCString(), inline: true },
              { name: "🔖 Approval Status", value: "Pending", inline: true },
            ],
            footer: { text: "Rithin & Harshita • Gallery" },
            timestamp: row.submitted_at,
          },
        ],
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("[gallery] discord notify failed", e);
    return false;
  }
}
