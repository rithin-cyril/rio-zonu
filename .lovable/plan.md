## Goal
Make the welcome (Gate) screen look polished on both mobile and desktop, align the pulsing glow with the cross inside its circular seal, layer in subtle animations inspired by the Vijay × Rashmika reference site, and update the site title + meta description.

## Scope
Only the first screen (`Gate`) and route metadata. No content changes to other sections.

---

## 1. Page metadata (`src/routes/index.tsx`)
- `title`: `Rithin & Harshita Wedding 💍`
- `og:title`: same
- `description` + `og:description`:  
  `By God's grace and with the blessings of our families, you are cordially invited to witness the sacred union of Rithin & Harshita as they begin their forever together on October 18, 2026.`

## 2. Gate layout — responsive & cross alignment (`src/components/wedding/Gate.tsx`)
Current issue: the gate background is a fixed 1719×915 image rendered with `object-cover`, so on tall mobile viewports the sides get clipped and the cross-in-circle drifts away from the overlay glow.

Changes:
- Use `object-cover` with `object-position: center 38%` (or `center top` on tall portrait via a media-query class) so the cross seal stays vertically anchored on every aspect ratio.
- Move the glow overlay so it tracks the seal rather than a hardcoded `top: 67%`:
  - Wrap the `<img>` and the glow in a single positioned container whose aspect ratio is locked to the artwork (`aspect-[1719/915]`) and centered on the viewport; the glow can then sit at the true seal coordinates (`left: 50%`, `top: 66.5%`) and stay perfectly on the cross at any width.
  - On viewports narrower/taller than the artwork ratio, scale the container with `min-h-[100svh] min-w-full` + `object-cover` fallback so there are no letterbox bars.
- Glow sizing scales with viewport: `h-[14vw] w-[14vw]` clamped between `72px` and `160px`.
- Add safe-area padding (`pb-[env(safe-area-inset-bottom)]`) and `100svh` (already there) to avoid mobile browser chrome cropping the "TAP TO OPEN" label baked into the artwork.

## 3. Reference-inspired animations
From the reference site (https://vijay-rashmika-wedding.vercel.app/) the gate uses: soft falling petals, gentle drifting light rays/godrays, a pulsing tap seal, and a subtle fade-in/zoom on the artwork. Translate those tastefully:

- **Artwork entrance**: `motion.img` fades in from `opacity:0, scale:1.04` to `opacity:1, scale:1` over ~1.6s `easeOut` (Ken Burns hint).
- **Godrays**: an absolutely-positioned `<span>` with a soft conic/linear gradient over the upper third, animated with a slow `opacity` and `translateY` loop (8s) to mimic the warm light beams in the reference.
- **Falling petals on the gate**: render the existing `<Petals />` component (or a lighter `<Petals count={14} />` variant) inside the Gate so petals start drifting *before* the user taps, matching the reference. They are removed when `opened` becomes true.
- **Tap seal**: keep the radial glow, but layer a second slowly expanding ring (`scale 1 → 1.25`, `opacity 0.6 → 0`, 2.6s loop) for a "tap me" cue.
- **Tap hint label**: small `Tap to open the invitation` text below the seal on mobile only (the baked-in artwork label can be hard to read on narrow screens), fading in/out at 2.2s interval.
- **Transition out**: when tapped, the whole gate scales `1 → 1.03` and fades over 1.1s (keeps the current behavior, just smoother easing — `[0.22, 1, 0.36, 1]`).

## 4. QA checklist
- Cross stays inside the circular seal at 320 px, 390 px, 768 px, 1024 px, 1440 px widths.
- Glow visually overlaps the cross at each breakpoint.
- No horizontal scroll on mobile.
- Petals + godrays do not block the tap area.
- Tab title reads `Rithin & Harshita Wedding 💍`.

## Files touched
- `src/components/wedding/Gate.tsx` (layout + animations)
- `src/routes/index.tsx` (title + meta)
- Possibly `src/styles.css` (one extra keyframe for the godray drift / ring pulse if not expressible with Tailwind utilities)

No other sections, no backend, no new dependencies.