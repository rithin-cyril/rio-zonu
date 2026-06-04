## Diagnosis
Measured the seal on the source artwork (1719×915):
- Cross center sits at **x = 50%, y ≈ 67.6%** of the image (not 66.5%).
- The white circular seal is **~80 px** on the source ≈ **8.7%** of image height.

In the current `Gate.tsx` I made two mistakes:
1. **Wrong Y**: used `66.5%` instead of `~67.6%` → glow rides above the cross.
2. **Glow sized in viewport-width units, not image-container units**: `clamp(72px, 11vw, 160px)` produces ~147 px on a 1336-wide desktop while the actual circle on screen is only ~77 px. The glow ends up roughly **2× larger** than the seal — that's why it visibly spills outside the circle.

## Fix (small, surgical — only `src/components/wedding/Gate.tsx`)

1. **Re-anchor** the overlay coordinates:
   - `SEAL_X = 50`
   - `SEAL_Y = 67.6`

2. **Size the glow and ring relative to the aspect-locked container** (`cqh` container query units, or `%` of the parent which already matches the image), not `vw`:
   - Make the artwork container a containing context: add `containerType: 'size'`.
   - Glow diameter: `12cqh` (≈ matches the ~8.7% circle plus a soft halo).
   - Ring diameter (animated expanding): starts at `10cqh`, expands to `16cqh`.
   - This guarantees the glow tracks the seal's *actual rendered size* at every viewport — desktop, tablet, mobile.

3. **Tighten the glow falloff** so any soft halo stays visually inside/around the gold ring of the seal:
   - `radial-gradient(circle, rgba(201,179,126,0.55) 0%, rgba(201,179,126,0.25) 45%, rgba(201,179,126,0) 75%)`.

4. **Verify visually** after the change at 1336×887 (desktop) and 390×844 (mobile) using a browser screenshot + zoom on the seal region; only mark done when the glow visibly sits inside the gold-rimmed white circle.

No other files change. No styling/animation removals — godrays, pre-tap petals, Ken Burns fade, expanding ring, and mobile tap hint all stay.