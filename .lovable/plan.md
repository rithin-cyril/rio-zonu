## Goal

Make the site feel smoother and more comfortable on phones while leaving content, copy, fonts, colors, layout, animations, and the desktop experience untouched. All changes are additive CSS/Tailwind tweaks plus a few small behavior fixes.

## Scope of changes (mobile-first, desktop preserved)

### 1. Global shell & viewport
- `src/components/wedding/WeddingInvitation.tsx`: swap `min-h-screen` for `min-h-dvh` so iOS chrome bars don't cause layout jumps. Keep `overflow-x-hidden`.
- `src/styles.css`: add a small base layer:
  - `html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }`
  - `body { overflow-x: hidden; overscroll-behavior-y: none; }`
  - `* { -webkit-tap-highlight-color: transparent; }`
  - `:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; border-radius: 2px; }`
  - `@media (prefers-reduced-motion: reduce) { .petal, .glow-pulse, [class*="animate-"] { animation: none !important; } }`
  - Drop `background-attachment: fixed` on `body` for mobile only (`@media (max-width: 640px)`) — it's a known iOS Safari jank source. Desktop keeps the fixed paper texture.

### 2. Safe-area insets for floating controls
- `MusicPlayer.tsx` and `BackToTop.tsx`: add `style={{ top/right/bottom: 'max(<existing>, env(safe-area-inset-*))' }}` so notch / dynamic island / home indicator don't overlap the buttons. Sizes already 44×44 on mobile — keep.

### 3. Touch-target minimums (44×44)
Bump padding only on mobile; desktop styling unchanged via `md:` overrides where needed.
- `Ceremonies.tsx` "OPEN IN MAPS" anchor: increase to `min-h-11 px-5 py-3` with `inline-flex items-center` on mobile; keep current compact look at `md:`. Add `inline-block` → `inline-flex` to vertically center.
- `Blessings.tsx` "VIEW BLESSINGS", "SEND BLESSING", "UNLOCK" buttons: ensure `min-h-11`. They're already close; just guarantee.
- Admin "➕ APPROVE" / "➖ HIDE" buttons: bump to `min-h-11 px-4 py-2` and stack `flex-wrap` so they don't overflow on narrow modal widths.
- Modal close `✕` button: enlarge to `h-10 w-10 grid place-items-center` (was ~24px square) and keep visual style.

### 4. Forms (Blessings submission + passcode unlock)
- Inputs: add `autoComplete="name"` / `autoComplete="off"`, keep current text size ≥16px so iOS doesn't zoom on focus (already met).
- Add `enterKeyHint="send"` to textarea; `inputMode="numeric"` already set on passcode ✓.
- Wrap the submission form in `scroll-mt-24` and call `inputEl.scrollIntoView({ block: 'center' })` on focus only when the on-screen keyboard would cover it (use a tiny effect with `visualViewport` listener, mobile-only) — prevents the textarea hiding under the keyboard. Conservative: only attach listener on touch devices.
- Add visible focus rings (covered by global `:focus-visible` rule).
- Prevent layout jump after submit success: keep the form's min-height equal to its previous height so the success message doesn't collapse the card.

### 5. Blessings modal (View Blessings)
- Replace `max-h-[85vh]` with `max-h-[85dvh]` on the panel and its inner scroll container so the iOS keyboard doesn't push it off-screen.
- Outer wrapper: add `overscroll-contain` on the scroll body so scrolling the list doesn't drag the page underneath.
- Click on the backdrop closes the modal (currently only the ✕ closes).
- Lock body scroll while modal is open (`document.body.style.overflow = 'hidden'` in an effect tied to `viewOpen`).
- Add `role="dialog" aria-modal="true" aria-labelledby` to the panel and wire the heading id.

### 6. Blessings Wall cards
- Add `break-words overflow-wrap-anywhere` (`break-words` is already there) and `hyphens-auto` for tidy wrapping of long names/messages on narrow screens.
- Ensure grid columns can shrink: add `min-w-0` to the `<li>` items and `grid-cols-1` is fine; nothing else to do.
- "LOAD MORE" button: `min-h-11`.

### 7. Ceremonies timeline alignment on mobile
- Existing timeline puts a vertical line at `left-1/2` but the card is `mx-auto max-w-md`, which looks fine. Add `px-1` inside the card on mobile so text never touches the gold border on the smallest devices.

### 8. Hero & Countdown polish
- Hero `<img>`: add `fetchPriority="high"`, `decoding="async"`, and `sizes="100vw"`; already has explicit width/height ✓ — reduces CLS.
- Countdown circles: already responsive; just verify `min-w-0` on each cell to prevent overflow on 320px width.

### 9. Animation / perf tuning
- `Petals.tsx`: reduce default `count` on mobile via `useMediaQuery`-like check or simply pass `count={window.matchMedia('(max-width:640px)').matches ? 10 : 24}` from `WeddingInvitation.tsx`. Wrap petal spans with `will-change: transform; transform: translateZ(0)` to keep them on the compositor and off the main thread.
- Respect `prefers-reduced-motion` (handled by global rule in §1).
- Pause music & countdown work when tab hidden (`document.visibilitychange`) — countdown re-render is cheap, but pausing the 1s tick when hidden is free perf.

### 10. Accessibility quick wins
- Add `id="main"` to the `<main>` and ensure exactly one `<main>` (already the case ✓).
- `lang="en"` on `<html>` (already set in `__root.tsx` ✓).
- Form inputs get associated `<label className="sr-only">` since current placeholders are the only label.
- Admin modal heading gets an `id` and the dialog references it via `aria-labelledby`.

## Out of scope (explicit)
- No copy, name, date, scripture, address, or content changes.
- No font, color, gradient, or imagery swaps.
- No section reordering, restyling, or layout overhaul.
- No changes to the moderation API, server functions, or DB.
- Desktop (`md:`+) breakpoints and animations remain visually identical.

## Verification

- Set preview to mobile (375×812 and 360×800) and walk through: Gate → Hero → Welcome → Journey → Countdown → Families → Ceremonies → Blessings form → Blessings Wall → Closing.
- Check: no horizontal scroll at any width, all tap targets ≥44px, modal opens/closes cleanly with backdrop tap and body scroll locked, focus rings visible, form textarea remains visible when focused with on-screen keyboard, floating buttons clear of notch/home indicator.
- Spot-check desktop at 1280 and 1440 to confirm visuals unchanged.

## Files touched

- `src/styles.css` — base mobile rules, focus ring, reduced-motion
- `src/components/wedding/WeddingInvitation.tsx` — `min-h-dvh`, petal count prop
- `src/components/wedding/MusicPlayer.tsx` — safe-area insets
- `src/components/wedding/BackToTop.tsx` — safe-area insets
- `src/components/wedding/Ceremonies.tsx` — maps button touch target
- `src/components/wedding/Blessings.tsx` — modal dvh/backdrop/scroll-lock, button sizes, form labels, focus behavior
- `src/components/wedding/BlessingsWall.tsx` — wrapping & LOAD MORE size
- `src/components/wedding/Petals.tsx` — `will-change`, reduced-motion friendly
- `src/components/wedding/Hero.tsx` — `fetchPriority`/`sizes` on hero image
- `src/components/wedding/Countdown.tsx` — pause tick when hidden, `min-w-0`
