# Welcome screens — design spec

The three-screen Bloomzein entry.

- **Component:** `src/pages/app.welcome-screen.tsx`
- **Route:** `/welcome` (preview only — nothing links to it yet)
- **Background:** placeholder (drifting bubbles). The films drop in later.

| # | Screen | Headline | CTA |
|---|---|---|---|
| 1 | Welcome | *Welcome to* / **your Bloom.** ♡ | **Begin my journey →** |
| 2 | Connected | *Everything in your life,* / **beautifully connected.** ♡ | **Show me my Bloom →** |
| 3 | Your space | *Your life doesn't need to be perfect.* / **It just needs to feel like yours.** ♡ | **Start my Bloomzein journey →** → `/app/today` |

Every headline is the same lockup: a **serif** line, then a **script** line in
hot pink, then a small outline ♡.

Change these numbers only on purpose — they are the design.

---

## 1. The one rule: leave room for her

The films are the emotional foundation; the composition never covers her.

- **Screen 1** — type occupies the **left half** (`width: min(48%,620px)`),
  the right half stays clear for her.
- **Screens 2 & 3** — three grid tracks, **cards | her | cards**. The centre
  track is deliberately empty.

```
grid-template-columns: minmax(0,1fr)  24%  minmax(0,1fr)   /* ≥768px */
grid-template-columns: minmax(0,1fr)  13%  minmax(0,1fr)   /* mobile  */
```

Cards are pushed *inward* against that channel (left column
`align-items:flex-end`, right column `align-items:flex-start`) so they frame
her rather than hug the screen edges, and are **arranged, not stacked**:

| Card | Offset |
|---|---|
| left #1 | `margin-right: clamp(10px,1.9vw,32px)` |
| left #3 | `margin-right: clamp(12px,2.2vw,38px)` |
| right #2 | `margin-left: clamp(10px,1.9vw,32px)` |
| right #4 | `margin-left: clamp(8px,1.5vw,26px)` |

## 2. Stage & framing

The stage takes **the film's own 16:9 shape** on big screens so footage is
never cropped; mobile is full-bleed portrait.

```
mobile   : width 100%, height 100dvh
≥768px   : aspect-ratio 16/9, width min(100vw, 100dvh*16/9)
≥1200px  : border-radius 26px + soft drop shadow
```

## 3. Colour

| Token | Value | Used for |
|---|---|---|
| `--plum` | `#6B1238` | serif headline line |
| `--hot` | `#E6007E` | script headline line, wordmark |
| `--ink` | `#7A1440` | card labels, closing line |
| `--muted` | `#A2657F` | subtitles, "stay soft, bloom on." |
| `--pink` / `--deep` | `#EC4899` / `#DB2777` | badge + CTA gradient, hearts |
| `--petal` | `#F9A8D4` | card underline, divider rules |
| `--gold` | `#D8B98A` | the CTA's outer rim only |
| `--card` | `rgba(255,255,255,.82)` | card fill (with `blur(13px)`) |

Badge & CTA gradient: `#F871B0 → #EC4899 → #DB2777`.

## 4. Type

| Role | Font | Size | Weight |
|---|---|---|---|
| Screen 1 serif line | **Playfair Display** | `clamp(26px,3.3vw,50px)` | 700 |
| Screen 1 script line | **Dancing Script** | `clamp(44px,6vw,92px)` | 700 |
| Wordmark "Bloomzein" | Dancing Script | `clamp(28px,3.1vw,46px)` | 700 |
| Screens 2–3 serif line | Playfair Display | `clamp(17px,2.2vw,32px)` | 700 |
| Screens 2–3 script line | Dancing Script | `clamp(26px,3.3vw,48px)` | 700 |
| Subtitles | Quicksand | `clamp(11px,1.02vw,15px)` | 600 |
| Card label (2 lines) | Quicksand | `clamp(10.5px,1.03vw,15.5px)` | 700 |
| Closing line | Playfair Display | `clamp(11px,1.05vw,16px)` | 500 |

> **Playfair Display was added to `index.html` for these screens.** The mockups'
> serif lines needed it and the app loaded no serif.

Hearts (`♡`) are `<em class="wz-heart">` — pink, `0.62em`, not italic.

## 5. Card anatomy

```
[ badge ]  Label line one
           Label line two
           ▁▁            ← 2px petal-pink underline
```

- radius `clamp(13px,1.15vw,19px)`, glass fill + 1px white border
- badge: circle `clamp(30px,2.9vw,48px)`, white hairline icon at 56%,
  `stroke-width:1.7`, round caps
- shadow `0 10px 26px -12px rgba(190,24,93,.42)` + inset white top highlight

## 6. Progress dots

Three dots, joined by a hairline. Active dot is the pink gradient; the rest are
white. **Screen 1 places them top-right; screens 2–3 top-centre** — that is how
the mockups are drawn. `.wz-head` carries `padding-top` so the centred dots
never collide with the headline.

## 7. CTA pill

One shape on all three screens: pink gradient, **white 1.5px border with a gold
outer rim** (`box-shadow: 0 0 0 1.5px rgba(216,185,138,.55)`), white bold label,
arrow glyph, soft drop shadow. It breathes (`scale 1 → 1.015`, 4s) and a light
sheen sweeps across every 5.4s. Full-width on mobile.

## 8. Copy (do not paraphrase)

**Screen 2** — left: *Understand / your rhythm* · *Move / your body* ·
*Nourish / yourself* · *Build better / habits*; right: *Clear / your mind* ·
*Feel more / in control* · *Remember / what matters* · *Take care / of yourself*.
Closing: *One beautiful space. Everything that matters to you. ♡*

**Screen 3** — left: *Morning / Yoga* · *Nourishing / Meal* · *Mood / today* ·
*Water / 6 / 8 cups*; right: *Habits / kept* · *Journal / a thought* ·
*Reminders / that matter* · *Planning / your week*.
Closing: *This is your space.* **Your pace. Your rhythm. Your Bloom.**

Every label says what she gets to *feel or do* — never a feature name. The line
break inside each label is intentional and hard-coded.

## 9. Motion

One vocabulary — fade + rise + un-blur, `0.95s cubic-bezier(.16,.7,.2,1)`.

- screen 1: logo `0.1s` → serif `0.45s` → script `0.7s` → divider `1.0s` →
  subtitle `1.15s` → CTA `1.45s`
- screens 2–3: serif `0.1s` → script `0.3s` → subtitle `0.5s` → divider `0.65s`
  → cards from `0.9s` (`+0.15s` each, right column offset `+0.07s`) →
  closing `1.6s` → CTA `1.8s`
- bubbles drift up on an 18–38s loop, never fast
- all of it collapses under `prefers-reduced-motion`

## 10. Swapping in the films

Replace `<BackgroundPlaceholder/>` with a per-screen `<video>`:

```tsx
<video className="wz-video" autoPlay muted loop playsInline
       poster="/videos/welcome-1.webp">
  <source src="/videos/welcome-1.mp4" type="video/mp4" />
</video>
```

**Keep `.wz-scrim`** — the gradient that keeps type readable (light top and
bottom, fully clear through the middle so she is never veiled).

Film requirements: **16:9**, and exported **without any watermark or logo badge
burned into the corners**. Screen 1 wants her framed **right of centre** (type
sits left); screens 2 and 3 want her **centred**.

## 11. Still open

- Nothing links to `/welcome` yet — wire the landing "Start Blooming" CTA to it
  when the films are in.
- Connector lines between cards and centre (faint strings in the mockups) were
  deliberately left out; they clutter over live footage.
