// Shared, pure ordering helpers so the admin panel and the public wall
// always agree on the exact display order. No AI calls, no DB access —
// it only reads values already stored on each blessing row.

export type OrderableBlessing = {
  id: string;
  approved?: boolean;
  rejected?: boolean;
  hidden?: boolean;
  quality_score?: number | null;
  sort_order?: number | null;
  approved_at?: string | null;
  created_at?: string | null;
};

export function isPubliclyVisible(b: OrderableBlessing) {
  return !!b.approved && !b.rejected && !b.hidden;
}

/**
 * The canonical public order. `manual` mirrors the `blessings_ranking`
 * site setting: manual → admin's saved sort_order, otherwise highest
 * Blessing Quality Score first.
 */
export function sortPublicOrder<T extends OrderableBlessing>(rows: T[], manual: boolean): T[] {
  const out = [...rows];
  out.sort((a, b) => {
    if (manual) {
      const ao = a.sort_order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.sort_order ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
    } else {
      const as = a.quality_score ?? -1;
      const bs = b.quality_score ?? -1;
      if (as !== bs) return bs - as;
    }
    return (a.approved_at ?? a.created_at ?? "").localeCompare(
      b.approved_at ?? b.created_at ?? "",
    );
  });
  return out;
}

/**
 * Admin-side view of the same data: publicly visible blessings first, in
 * the exact live public order (Display Position #1..#N), followed by
 * everything not publicly visible (no Display Position).
 * `ai_rank` is a recommendation only, derived from the stored score.
 */
export function withPositions<T extends OrderableBlessing>(
  rows: T[],
  manual: boolean,
): Array<T & { display_position: number | null; ai_rank: number | null }> {
  const visible = sortPublicOrder(rows.filter(isPubliclyVisible), manual);
  const rest = sortPublicOrder(rows.filter((r) => !isPubliclyVisible(r)), false);

  const scored = [...rows]
    .filter((r) => r.quality_score !== null && r.quality_score !== undefined)
    .sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0));
  const aiRank = new Map<string, number>();
  scored.forEach((r, i) => aiRank.set(r.id, i + 1));

  return [
    ...visible.map((r, i) => ({
      ...r,
      display_position: i + 1,
      ai_rank: aiRank.get(r.id) ?? null,
    })),
    ...rest.map((r) => ({
      ...r,
      display_position: null,
      ai_rank: aiRank.get(r.id) ?? null,
    })),
  ];
}
