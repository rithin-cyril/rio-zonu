## Goal
Add a Discord-based moderation workflow to the existing "Leave a Blessing" feature. No visual or UX changes to the rest of the site.

## Reconciling with the existing schema
The `blessings` table already exists with columns `id, name, note, recipient_email, email_sent, created_at`. Rather than create a second table (which would orphan existing rows and break the current insert/view code), I'll extend it:

Add columns:
- `approved boolean not null default false`
- `rejected boolean not null default false`
- `approved_at timestamptz`
- `moderation_token text unique` (backfilled with `gen_random_uuid()::text` for existing rows, then set NOT NULL)

The existing `note` column will be used as the message body (spec calls it `message` — same data, no rename needed to avoid breaking current code).

Tighten RLS:
- Keep "Anyone can insert blessings" policy.
- Add `SELECT` policy for `anon` + `authenticated` limited to `approved = true AND rejected = false`.
- Revoke/avoid broad SELECT; admin views go through the service-role server function.
- Add `GRANT SELECT` to `anon` (currently only INSERT works).

## Secret
Add `DISCORD_WEBHOOK_URL` via the secrets tool (server-only).

## Submission flow (server-side)
Replace the current direct `supabase.from("blessings").insert(...)` in `src/components/wedding/Blessings.tsx` with a new `createServerFn` `submitBlessing` (in `src/lib/blessings.functions.ts`):
1. Validate name (1–80) and note (1–500) with zod.
2. Generate `moderation_token` via `crypto.randomUUID()`.
3. Insert row via `supabaseAdmin` with `approved=false, rejected=false, moderation_token=...`.
4. POST to `process.env.DISCORD_WEBHOOK_URL` with the spec's message format and approve/reject links pointing at `/api/public/blessings/{id}/approve?token=...` and `.../reject?token=...`. Use the published origin `https://rio-zonu.lovable.app` (configurable via `PUBLIC_SITE_URL` env, falling back to request origin).
5. If Discord POST fails: `console.error`, still return success.
6. Return `{ ok: true }`.

After successful submission, the form shows: "Thank you for your blessing. It has been received and will appear after approval." (replacing current "Your blessing has been recorded…" text).

## Moderation endpoints (TanStack server routes)
Create under `src/routes/api/public/` so they bypass auth on the published site (spec requires links work directly from Discord):

- `src/routes/api/public/blessings/$id/approve.ts` — GET handler:
  1. Read `id` from params, `token` from query.
  2. Load row via `supabaseAdmin`; 404 if missing.
  3. Timing-safe compare `moderation_token`; 401 if mismatch.
  4. Update `approved=true, rejected=false, approved_at=now()`.
  5. Return an inline HTML success page: "✅ Blessing Approved — This blessing is now visible on the wedding website." (styled minimally, matches site warm tone but self-contained — does not touch other pages).

- `src/routes/api/public/blessings/$id/reject.ts` — GET handler: same shape, sets `rejected=true, approved=false`, renders "❌ Blessing Rejected — This blessing will not be displayed publicly."

Both load `supabaseAdmin` inside the handler (per project's import-graph rules).

## Public display
Currently the Blessings section has no public list — blessings are only visible behind passcode 1810. The spec says approved blessings should "appear publicly in the Blessings section."

Plan:
- Add a public approved-blessings list rendered inside the existing Blessings section, using the same card styling already used inside the passcode modal (so visual design is unchanged in spirit — same `Ornament`, same gold-border cards, same fonts). It will appear below the verse and above the submission form.
- New `createServerFn` `getApprovedBlessings` (no auth) using `supabaseAdmin`, selecting `id, name, note, approved_at` where `approved=true AND rejected=false`, ordered by `approved_at DESC`.
- Fetch on mount via `useEffect` + `useServerFn` (keeps the section client-rendered to avoid changing route-level data flow). Empty state: render nothing (no new heading/text) so the section looks identical when there are no approved blessings yet.
- The existing passcode "VIEW BLESSINGS" modal stays untouched but its `getBlessings` query will now also include `approved`/`rejected` so admins can see status.

## Files
- Migration: extend `blessings`, backfill tokens, add SELECT policy + GRANT.
- `src/lib/blessings.functions.ts` — add `submitBlessing` and `getApprovedBlessings`; keep `getBlessings`.
- `src/components/wedding/Blessings.tsx` — swap insert call for `submitBlessing`, update success copy, add approved-list rendering above the form.
- `src/routes/api/public/blessings/$id/approve.ts` — new.
- `src/routes/api/public/blessings/$id/reject.ts` — new.
- Secrets: add `DISCORD_WEBHOOK_URL`.

## Explicitly NOT changing
Hero, Gate, Ceremonies, Countdown, Families, Journey, Welcome, Closing, MusicPlayer, BackToTop, Petals, Ornament, WeddingInvitation, styles, colors, fonts, animations, maps, scriptures, layout, responsive behaviour. Only `Blessings.tsx` is touched, and only to (a) call the new server fn, (b) update one success string, (c) render the approved list using existing styles.

## Open question
The current passcode-protected "VIEW BLESSINGS" admin view — keep as is (showing all blessings with approve/reject status visible), or remove now that Discord is the moderation surface? Default: keep it untouched.