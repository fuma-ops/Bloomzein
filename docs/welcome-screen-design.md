# Welcome screen — design spec

The onboarding screen **"Everything in your life, beautifully connected."**

- **Component:** `src/pages/app.welcome-screen.tsx`
- **Route:** `/welcome` (preview only — nothing links to it yet)
- **Status:** foreground composition is final and approved against the mockup.
  The background is a **placeholder** (drifting bubbles) waiting for the film.

Everything below is what the mockup was measured against. Change these numbers
only on purpose — they are the design, not incidental values.

---

## 1. The one rule: the middle stays empty

The layout is **three grid tracks — cards | her | cards**. The centre track is
deliberately empty: that is where the woman stands in the film. Cards are
pushed *inward* against that channel (left column `align-items:flex-end`,
right column `align-items:flex-start`), so they frame her rather than hug the
screen edges.

```
grid-template-columns: minmax(0,1fr)  24%  minmax(0,1fr)   /* ≥768px */
grid-template-columns: minmax(0,1fr)  13%  minmax(0,1fr)   /* mobile  */
```

Cards are **arranged, not stacked** — cards 1 and 3 on the left, 2 and 4 on the
right are nudged further from centre so the group reads as scattered:

| Card | Offset |
|---|---|
| left #1 | `margin-right: clamp(10px,1.9vw,32px)` |
| left #3 | `margin-right: clamp(12px,2.2vw,38px)` |
| right #2 | `margin-left: clamp(10px,1.9vw,32px)` |
| right #4 | `margin-left: clamp(8px,1.5vw,26px)` |

## 2. Stage & framing

The stage takes **the film's own 16:9 shape** on big screens so footage is
never cropped; on mobile it is full-bleed portrait.

```
mobile   : width 100%, height 100dvh
≥768px   : aspect-ratio 16/9, width min(100vw, 100dvh*16/9)
≥1200px  : border-radius 26px + soft drop shadow
```

## 3. Colour

| Token | Value | Used for |
|---|---|---|
| `--plum` | `#6B1238` | serif headline line 1 |
| `--hot` | `#E6007E` | script headline line 2 |
| `--ink` | `#7A1440` | card labels, footer line |
| `--muted` | `#A2657F` | subtitle |
| `--pink` / `--deep` | `#EC4899` / `#DB2777` | badge gradient, hearts |
| `--petal` | `#F9A8D4` | the small underline + flower divider |
| `--card` | `rgba(255,255,255,.82)` | card fill (with `blur(13px)`) |
| `--card-line` | `rgba(255,255,255,.95)` | 1px card border |

Badge gradient: `linear-gradient(160deg,#F871B0 0%,#EC4899 46%,#DB2777 100%)`.

## 4. Type

| Role | Font | Size | Weight |
|---|---|---|---|
| "Everything in your life," | **Playfair Display** (serif) | `clamp(19px,2.35vw,34px)` | 700 |
| "beautifully connected." | **Dancing Script** | `clamp(28px,3.5vw,50px)` | 700 |
| Subtitle (2 lines) | Quicksand | `clamp(11px,1.02vw,15px)` | 600 |
| Card label (2 lines) | Quicksand | `clamp(10.5px,1.03vw,15.5px)` | 700 |
| Footer line | **Playfair Display** | `clamp(11px,1.05vw,16px)` | 500 |

> **Playfair Display was added to `index.html` for this screen.** The mockup's
> headline and footer are a serif, and the app previously loaded none.

Hearts (`♡`) are `<em class="wz-heart">` — pink, `0.72em`, not italic.

## 5. Card anatomy

```
[ badge ]  Label line one
           Label line two
           ▁▁            ← 2px petal-pink underline
```

- radius `clamp(13px,1.15vw,19px)`, padding `…,.75vh,11px` / `…,1.3vw,22px`
- badge: circle `clamp(30px,2.9vw,48px)`, white hairline icon at 56%,
  `stroke-width:1.7`, round caps
- shadow `0 10px 26px -12px rgba(190,24,93,.42)` + inset white top highlight
- underline: `clamp(14px,1.4vw,22px)` × 2px, `--petal`

## 6. Copy (do not paraphrase)

Left column: **Understand / your rhythm** · **Move / your body** ·
**Nourish / yourself** · **Build better / habits**

Right column: **Clear / your mind** · **Feel more / in control** ·
**Remember / what matters** · **Take care / of yourself**

Every label says what she gets to *feel or do* — never a feature name.
The line break inside each label is intentional and hard-coded.

Footer: *One beautiful space. Everything that matters to you. ♡*

## 7. Motion

One vocabulary only — fade + rise + settle, `0.9s cubic-bezier(.16,.7,.2,1)`.

- cards stagger in: left from `0.35s`, right from `0.42s`, `+0.14s` each
- footer line at `1.05s`
- bubbles drift up on an 18–38s loop, never fast
- all of it collapses under `prefers-reduced-motion`

## 8. Swapping in the film

Replace `<BackgroundPlaceholder/>` in the component with:

```tsx
<video className="wz-video" autoPlay muted loop playsInline
       poster="/videos/welcome.webp">
  <source src="/videos/welcome.mp4" type="video/mp4" />
</video>
```

**Keep `.wz-scrim`** — it is the gradient that keeps type readable over
footage (light at top and bottom, fully clear through the middle so she is
never veiled). Nothing else needs to change: the composition already reserves
the centre channel for her.

Film requirements: **16:9**, subject centred, and exported **without any
watermark or logo badge** burned into the corners.

## 9. Still open

- CTA button(s) are **not** in this screen yet — to be added on top of the film.
- Connector lines between cards and centre (faint strings in the mockup) were
  deliberately left out; they clutter over live footage.
