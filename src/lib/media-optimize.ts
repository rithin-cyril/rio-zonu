// Browser-only media optimisation helpers.
// Photos are decoded and RE-ENCODED through the canvas pipeline, which
// strips all EXIF/GPS metadata and produces a brand-new WebP file rather
// than re-serving the bytes a user uploaded. Videos keep their container
// (no transcoder is available in the edge runtime) but we generate a
// poster frame and read real dimensions/duration from the decoder.
import { WATERMARK_TEXT } from "@/lib/gallery-shared";

export type Optimized = {
  main: Blob;
  poster: Blob | null;
  width: number | null;
  height: number | null;
  duration: number | null;
};

const MAX_EDGE = 2200;
const THUMB_EDGE = 720;

async function toBlob(canvas: HTMLCanvasElement, quality = 0.82): Promise<Blob> {
  // JPEG needs a higher quality value than WebP for comparable fidelity.
  const types: Array<[string, number]> = [
    ["image/webp", quality],
    ["image/jpeg", Math.min(0.95, quality + 0.08)],
  ];
  for (let i = 0; i < types.length; i++) {
    const [type, q] = types[i]!;
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));
    // A browser without WebP encoding silently returns PNG; fall through to JPEG.
    const last = i === types.length - 1;
    if (blob && blob.size > 0 && (last || blob.type === type)) return blob;
  }
  throw new Error("Could not encode image");
}

function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const size = Math.max(11, Math.round(Math.min(w, h) * 0.022));
  ctx.save();
  ctx.font = `500 ${size}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = size * 0.5;
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText(WATERMARK_TEXT, w - size, h - size * 0.9);
  ctx.restore();
}

function fit(w: number, h: number, max: number) {
  const scale = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

function render(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  max: number,
  watermark: boolean,
) {
  const { w, h } = fit(sw, sh, max);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(source, 0, 0, w, h);
  if (watermark) drawWatermark(ctx, w, h);
  return { canvas, w, h };
}

export async function optimizePhoto(file: File): Promise<Optimized> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("This file is not a readable image.");
  });
  try {
    const big = render(bitmap, bitmap.width, bitmap.height, MAX_EDGE, true);
    const thumb = render(bitmap, bitmap.width, bitmap.height, THUMB_EDGE, true);
    return {
      main: await toBlob(big.canvas, 0.84),
      poster: await toBlob(thumb.canvas, 0.72),
      width: big.w,
      height: big.h,
      duration: null,
    };
  } finally {
    bitmap.close?.();
  }
}

export async function optimizeVideo(file: File): Promise<Optimized> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      const fail = () => reject(new Error("This file is not a playable video."));
      video.onloadedmetadata = () => resolve();
      video.onerror = fail;
      setTimeout(fail, 20000);
    });

    let poster: Blob | null = null;
    try {
      const target = Math.min(1, (video.duration || 1) / 3);
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        video.currentTime = target;
        setTimeout(resolve, 6000);
      });
      // Only capture when the seek really landed — otherwise the decoder may
      // still hold a blank/partial frame and we'd store a black poster.
      const landed =
        !video.seeking && Math.abs(video.currentTime - target) < 0.5 && video.videoWidth > 0;
      if (landed) {
        const shot = render(video, video.videoWidth, video.videoHeight, THUMB_EDGE * 1.6, true);
        poster = await toBlob(shot.canvas, 0.75);
      }
    } catch {
      poster = null;
    }

    return {
      main: file,
      poster,
      width: video.videoWidth || null,
      height: video.videoHeight || null,
      duration: Number.isFinite(video.duration) ? Math.round(video.duration) : null,
    };
  } finally {
    URL.revokeObjectURL(url);
    video.src = "";
  }
}

export async function optimizeMedia(file: File, kind: "photo" | "video") {
  return kind === "photo" ? optimizePhoto(file) : optimizeVideo(file);
}

export function guessKind(file: File): "photo" | "video" | null {
  if (file.type.startsWith("image/")) return "photo";
  if (file.type.startsWith("video/")) return "video";
  return null;
}
