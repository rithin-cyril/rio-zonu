// Client + server safe gallery constants and types.

export const GALLERY_CATEGORIES = [
  { key: "pre-wedding", label: "Pre-Wedding" },
  { key: "wedding", label: "Wedding" },
  { key: "post-wedding", label: "Post-Wedding" },
] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number]["key"];
export type GalleryKind = "photo" | "video";

export const CATEGORY_KEYS = GALLERY_CATEGORIES.map((c) => c.key) as GalleryCategory[];

export const WATERMARK_TEXT = "RITHIN & HARSHITA • 2026";

export const PRIVATE_BUCKET = "gallery-private";
export const PUBLIC_BUCKET = "gallery-public";

export type PublicMedia = {
  id: string;
  kind: GalleryKind;
  category: GalleryCategory;
  caption: string;
  url: string;
  poster: string | null;
  width: number | null;
  height: number | null;
};

export function categoryLabel(key: string) {
  return GALLERY_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export function formatBytes(n: number) {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
