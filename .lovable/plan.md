
## What I'll change

### 1. Richer, grander color palette (still simple)
Upgrade `src/styles.css` tokens from soft sage/pale gold to a deeper, more luxurious "ivory + emerald + antique gold" set:
- Background: warm ivory (`oklch(0.96 0.018 88)`)
- Accent gold deepened (`oklch(0.62 0.13 78)`) with a richer gradient (`#a8741a → #6b3f0c`)
- Secondary accent: deep emerald (`oklch(0.38 0.06 155)`) for headings/dividers
- Stronger text color (`oklch(0.18 0.02 60)`) for body so it reads crisp
- Refined `bg-sage-veil` → softer ivory-emerald veil
- Heavier shadows on cards (`shadow-gold` deepened) for a "grand" feel

### 2. Sharper, more readable text
- Bump body text from `Marcellus` body weight to slightly heavier rendering + add `font-feature-settings` and `text-rendering: optimizeLegibility`
- Increase contrast: body text uses the new dark ink color instead of low-opacity tones
- Increase font sizes by ~1 step on key paragraphs (Hero, Blessings cards, Ceremonies)
- Replace the many `text-[oklch(...)]/60..80` faded utilities with solid foreground for readability
- Tighten letter-spacing on display caps; loosen leading on script paragraphs

### 3. Background music (looping) + Mute button
- Copy uploaded mp3 to `src/assets/wedding-song.mp3`
- New component `src/components/wedding/MusicPlayer.tsx`:
  - Fixed position **top-right** (gold circular button)
  - `<audio loop>` element, autoplay attempted after Gate opens (browsers block autoplay before interaction — opening the gate counts as the gesture, so playback starts then)
  - Icon toggles between `Volume2` and `VolumeOff` (lucide-react)
  - Persists muted state in `localStorage`
- Mounted inside `WeddingInvitation.tsx`, only rendered after `opened === true`

### 4. Back-to-top button
- New component `src/components/wedding/BackToTop.tsx`:
  - Fixed **bottom-right**, gold circular button, `ChevronUp` icon
  - Appears after scroll > 400px (fade in via motion)
  - Smooth-scrolls to top

### 5. Email blessing submissions to riowedszonu@email.com
This needs a backend, so I'll:
- Enable **Lovable Cloud**
- Set up an email domain (one-time dialog) + email infrastructure
- Create a transactional email template `blessing-received.tsx` that emails **riowedszonu@email.com** with the sender's name + blessing note
- Wire `Blessings.tsx` form `onSubmit` → public server route `/api/public/blessing` that:
  - Validates with Zod (name 1–80 chars, note 1–500 chars)
  - Stores submission in a `blessings` table (so nothing is lost)
  - Triggers the transactional email to riowedszonu@email.com
- Form keeps the existing "Thank you" confirmation UX

> Note: the address you gave is `riowedszonu@email.com`. I'll use it exactly as written — if it should be `@gmail.com` or another domain, tell me and I'll swap it.

## Files touched
- edit `src/styles.css` (palette, typography sharpness)
- edit `src/components/wedding/Blessings.tsx` (form → server route, stronger text)
- edit `src/components/wedding/WeddingInvitation.tsx` (mount MusicPlayer + BackToTop)
- edit `src/components/wedding/Hero.tsx`, `Ceremonies.tsx`, `Families.tsx`, `Closing.tsx`, `Countdown.tsx`, `Gate.tsx` (text contrast tweaks only)
- new `src/components/wedding/MusicPlayer.tsx`
- new `src/components/wedding/BackToTop.tsx`
- new `src/assets/wedding-song.mp3` (from upload)
- new server route `src/routes/api/public/blessing.ts`
- new email template + registry entry
- new migration for `blessings` table
