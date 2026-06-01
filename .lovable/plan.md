# Premium Mobile-First Redesign Plan

A focused pass to transform the invitation into a calm, emotional, mobile-first experience. Text becomes the hero; decoration recedes.

## 1. Design tokens (src/styles.css)
- Replace current palette with: ivory `#FBF8F3`, cream `#F4ECDF`, soft beige `#E8DCC6`, champagne gold `#C9A86A` / deep gold `#8A6A2E`, sage `#A8B5A0`, warm ink `#3A2E22`.
- Remove turquoise/aqua tints from `bg-sage-veil` and emerald accents.
- Update `--background`, `--foreground`, `--primary`, `--gold`, `--sage` in oklch.
- Adjust `text-gold-gradient` to champagne tones; soften `shadow-gold`.
- Add new utility classes: `.bg-ivory-soft`, `.divider-hairline` (thin gold rule), `.card-premium` (rounded-2xl, ivory, subtle gold border, soft shadow).
- Typography stack: keep Cormorant Garamond (display serif) + add Inter or keep Marcellus for body, with larger base size (17px mobile / 18px desktop), line-height 1.7, reduced tracking on caps (0.12em max, used sparingly).

## 2. Background & ambience
- Reduce `namesBg` image opacity to ~25% with a strong ivory overlay (95% at top, 85% mid).
- Reduce `Petals` count from 24 → 6, lower opacity to ~30%, slower animation.
- Remove petals from sections other than hero (already global — make conditional or fade out below hero).

## 3. Hero (src/components/wedding/Hero.tsx)
Restructure to the exact requested flow, single column, generous vertical rhythm:
1. Couple names — large script serif, names stacked with a small `♡` separator (no boxed ornament).
2. "Save The Date" — small champagne caps, light tracking.
3. "18 October 2026" — elegant serif, prominent.
4. Hairline divider.
5. Scripture verse — italic serif, smaller, muted ink.
6. "By God's Grace, We Begin Our Forever" — serif heading.
7. Invitation paragraph (short, 3 lines).
8. Venue: "CSI Kanthi Church / Anandapura, S. Coorg".
- Remove the diamond-corner date frame, scroll-to-explore caps, and extra ornaments.

## 4. New Couple section
- Add `src/components/wedding/Couple.tsx` with "Together Forever" heading and a rounded portrait placeholder (circle/rounded-3xl, 280px mobile).
- Insert between Hero and Countdown.
- Use existing names-bg as placeholder or a soft tinted block; user can swap image later.

## 5. Countdown (src/components/wedding/Countdown.tsx)
- Add tagline: "Every second brings us closer to forever."
- Large numbers (text-5xl mobile), labels in small caps, evenly spaced 4-up grid that stays comfortable on 360px screens.
- Remove extra scripture if present here.

## 6. Families (src/components/wedding/Families.tsx)
- Single column on mobile (currently likely two columns). Stack groom family then bride family, centered.
- Reduce caps usage; use serif headings "The Groom's Family" / "The Bride's Family".
- Keep Mr. V. R. Raju.

## 7. Ceremonies (src/components/wedding/Ceremonies.tsx)
- Force vertical stack (remove md:mr-auto/ml-auto alternation).
- Convert cards to `.card-premium` style: rounded-2xl, ivory bg, champagne hairline border, soft shadow.
- Larger touch target for "Google Map Location" button → full-width, h-12, rounded-full, champagne fill.
- Remove timeline center line on mobile (keep optional on md+).
- Keep one scripture per event max (already the case).

## 8. Blessings (src/components/wedding/Blessings.tsx)
- Heading: "Leave Your Blessings" + subtitle "Your prayers and wishes mean the world to us."
- Mobile-optimized inputs: h-12, text-base (16px to prevent iOS zoom), rounded-xl, full-width submit button.
- Email delivery to riowedszonu@email.com is already wired from earlier turn — leave intact.

## 9. Closing (src/components/wedding/Closing.tsx)
- Trim to one benediction (Numbers 6:24–25) + sign-off.
- Soften gold, increase whitespace.

## 10. Floating controls
- `MusicPlayer.tsx`: keep top-right, shrink to 40px circular, ivory bg with champagne icon, subtle shadow.
- `BackToTop.tsx`: bottom-right, same size/treatment, only appears after scroll.

## 11. Animations
- Reduce motion durations to 0.5–0.7s, remove y-offsets >12px, drop staggered delays >0.3s.
- Honor `prefers-reduced-motion` via a CSS guard.

## 12. Performance
- Lazy-load below-the-fold sections via dynamic import where reasonable.
- Add `loading="lazy"` and `decoding="async"` to non-hero images.
- Ensure hero image has width/height to prevent CLS (already set).

## Files touched
- `src/styles.css` — palette, utilities, motion guard
- `src/components/wedding/Hero.tsx` — restructure
- `src/components/wedding/Couple.tsx` — new
- `src/components/wedding/Countdown.tsx` — tagline, sizing
- `src/components/wedding/Families.tsx` — single column
- `src/components/wedding/Ceremonies.tsx` — stacked premium cards
- `src/components/wedding/Blessings.tsx` — mobile inputs, copy
- `src/components/wedding/Closing.tsx` — trim
- `src/components/wedding/Petals.tsx` — reduced count/opacity
- `src/components/wedding/MusicPlayer.tsx` / `BackToTop.tsx` — refined styling
- `src/components/wedding/WeddingInvitation.tsx` — insert Couple section

## Out of scope (unless you confirm)
- Replacing the hero floral photo with a new asset.
- Adding a real couple portrait (placeholder will be used).
- Changing the wedding song file.