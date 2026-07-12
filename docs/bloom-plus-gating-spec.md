# Bloom+ — Gating Specification (reference)

How the app splits into **Bloom (free)** and **Bloom+ (everything)**. This builds
on the entitlement system that already ships — it does not replace it.

> **Guiding rule.** Free = *"know yourself"* (tracking & awareness). Bloom+ =
> *"it's done for you"* (generation, depth, all content, cross-tool sync).
> **Never** gate the trust anchors: period/phase tracking, the day's phase,
> logging mood & water, or viewing a plan that already exists.

---

## 0. What already exists (build on this — don't fork it)

**`src/lib/entitlements.ts`** — the ONE source of truth:
- `readPlan(): "free" | "plus"`, `isPremium()`, `usePremium()` (live hook)
- `setPlan(plan)` — flips the plan (dev switch today; billing webhook later)
- `openPaywall(feature)` — opens the app-wide paywall, themed to the feature
- `withPremium(feature, action)` — run `action()` if premium, else open paywall
- `PaywallFeature = "meals" | "diet" | "workout" | "yoga" | "coach" | "cycle" | "general"`
- Plan is stored in `localStorage["bloom:plan"]`; events `PLAN_UPDATED`, `OPEN_PAYWALL`

**`src/components/bloom/premium/PremiumKit.tsx`** — the UI kit:
- `PaywallSheet` / `PaywallHost` (host is mounted in `AppShell`) — the upsell modal
- `PremiumBadge` — small rose-gold "Bloom+" chip
- `LockChip` — a lock chip to drop on a gated button
- `DiscoverBloomPlus` — the soft curiosity upsell card (for Today / Me)
- `PlanToggle` — dev switch on the Me page (feel Free ↔ Bloom+)
- Premium accent colour: **rose-gold `#B76E79`** (distinct from app hotpink)

**Already gated:** Meals week auto-generation (`openPaywall("meals")`),
Workout program enrolment (`openPaywall("workout")`), Cycle Insights
(`openPaywall("cycle")`).

**Still to build:** a reusable **`<PlusLock>`** teaser wrapper (§4), plus the
remaining gates in §3.

---

## 1. The three gating patterns (the toolbox)

| Pattern | When to use | Mechanism |
|---|---|---|
| **A · Action-gate** ("try → wall") | A *generative* action (generate my week, enrol a program, export data) | `if (!isPremium()) { openPaywall(f); return; }` or `withPremium(f, action)` |
| **B · Teaser-lock** ("see, can't touch") | A premium *surface* she should SEE exists (insights, full coach, program list) | Wrap in **`<PlusLock feature=…>`** → blurred + Bloom+ badge → tap opens paywall |
| **C · Quota-limit** ("first N free") | Libraries/collections (recipes shown, diary entries, reminders) | Free gets N; the N+1 action → `openPaywall(f)` |

**Rule of thumb:** *see-but-can't-touch → Teaser-lock · try-to-do → Action-gate ·
collections → Quota.* Always **show the value before the wall.**

---

## 2. The boundary in one line per tool

| Tool | Free (the hook) | Bloom+ (the magic) |
|---|---|---|
| Cycle Tracker | tracking, phase, basic prediction, logs | Insights: hormone curve, trends, deep predictions, export |
| Today (hub) | greeting, phase, mood+water, streak, plan view, coach *taste* | energy numbers, deeper coach, tomorrow |
| Diet / Cycle Nutrition | phase eat/avoid (education) | the Coach card, real targets & macros, weight projection, treat, reads carousel |
| Meals | browse limited recipes, manual plan, view week | auto-plan week, pantry, shopping list, lunchbox, prep, conservation, favourites, portion-to-goal |
| Workout | 1 free program + a few freestyle sessions | all programs + progression + phase coaching |
| Yoga | a few flows, basic phase | full pose library, programs, audio mode, scheduling |
| Read | browse articles (kept generous) | *(lever — recommend free)* saved-unlimited only |
| Diary | write entries, basic themes | unlimited history, all themes/fonts, mood analytics |
| Budget | basic income/expense tracking | goals, insights, all categories, mood-spend |
| Me | streak, plan toggle, upsell | full consistency dashboard (mood graph, goal, weight) |
| Reminders | 3 reminders | unlimited |
| **Cross-tool sync** | tools work standalone | **everything talks to everything** — the moat |

---

## 3. Screen-by-screen gating (the exact list)

Legend — **Pattern**: A action-gate · B teaser-lock · C quota. **Status**: ✅ done · 🔩 to build.
"Lever" = a business decision you can tune; the value is my recommended default.

### Cycle Tracker — `/app/tools/cycle`
| Element | Free | Bloom+ | Pattern | feature | Status |
|---|---|---|---|---|---|
| Period logging, calendar, today's phase | ✅ | ✅ | — (never gate) | — | ✅ |
| Symptom & mood logging | ✅ | ✅ | — | — | ✅ |
| Next-period prediction (basic, next cycle) | ✅ | ✅ | — | — | ✅ |
| **Cycle Insights** (hormone curve, trends, multi-cycle prediction, export) | teaser only | full | **B** | `cycle` | ✅ |

### Today — `/app/today` (the hub — keep it generous)
| Element | Free | Bloom+ | Pattern | feature | Status |
|---|---|---|---|---|---|
| Hero, greeting, phase pill, streak | ✅ | ✅ | — | — | ✅ |
| Mood + body/water check-ins | ✅ | ✅ | — | — | ✅ |
| Today's Plan (viewing items) | ✅ | ✅ | — (view is free) | — | ✅ |
| Compact Coach *taste* (need line + energy meter) | ✅ | ✅ | — (the free taste) | — | ✅ |
| Feel-good "moment" + streak | ✅ | ✅ | — (cheap habit loop, keep free) | — | ✅ |
| **Energy Today strip** (target / eaten / burned numbers) | teaser | full | **B** | `diet` | 🔩 |
| **Tomorrow preview** card | *lever* → recommend teaser | full | **B** | `coach` | 🔩 |
| `DiscoverBloomPlus` upsell card | shown | hidden (already +) | — | `general` | 🔩 place it |

### Diet / Cycle Nutrition — `/app/tools/diet`
| Element | Free | Bloom+ | Pattern | feature | Status |
|---|---|---|---|---|---|
| Phase **eat / ease-up** education | ✅ | ✅ | — (awareness is free) | — | 🔩 |
| **Coach card** (need, energy, treat, moment, "see today's plan") | teaser | full | **B** | `coach` | 🔩 |
| **My Diet**: set goal & basic profile | ✅ | ✅ | — | — | ✅ |
| **My Diet**: energy target, macros, **weight projection / goal timeline** | teaser | full | **B** | `diet` | 🔩 |
| **Diet · Today**: macro rings (targets) & phase-nutrient bars | teaser | full | **B** | `diet` | 🔩 |
| **Recipes** tab browsing | first N free | all | **C** | `meals` | 🔩 |
| Reads-for-your-phase carousel | *lever* → recommend free | free | — | — | ✅ |

### Meals — `/app/tools/meals`
| Element | Free | Bloom+ | Pattern | feature | Status |
|---|---|---|---|---|---|
| Browse recipes (This Week view, manual add) | ✅ (limited library) | ✅ (full) | C on library | `meals` | partial |
| **Auto-generate my week** | ✗ → wall | ✅ | **A** | `meals` | ✅ |
| **Pantry / Shopping list** | teaser | full | **B** | `meals` | 🔩 |
| **Kids Lunch Box** | teaser | full | **B** | `meals` | 🔩 |
| **Sunday Prep / Conservation** | teaser | full | **B** | `meals` | 🔩 |
| **Favourites** | teaser | full | **B** | `meals` | 🔩 |
| Portion-to-goal scaling | — | ✅ (follows target) | (implicit w/ diet) | `diet` | 🔩 |

### Workout — `/app/tools/workout`
| Element | Free | Bloom+ | Pattern | feature | Status |
|---|---|---|---|---|---|
| **4-Week Cycle-Synced Reset** (`tier:"free"`) + Foundations | ✅ | ✅ | — | — | ✅ |
| A few freestyle sessions | ✅ | ✅ | — | — | ✅ |
| **Enrol a premium program** (Glute Builder, Upper Sculpt, Total Tone, Strong Core) | ✗ → wall | ✅ | **A** | `workout` | ✅ |
| Program list (browsing) | teaser-locked cards | full | **B** | `workout` | 🔩 |
| Freestyle generator (unlimited, phase-tuned) | limited | full | **A** | `workout` | 🔩 |

### Yoga — `/app/tools/yoga`
| Element | Free | Bloom+ | Pattern | feature | Status |
|---|---|---|---|---|---|
| A few starter flows, basic phase flow | ✅ | ✅ | — | — | 🔩 |
| **Full pose library** | teaser | full | **B** | `yoga` | 🔩 |
| **Programs / scheduling / audio mode** | teaser / wall | full | **B/A** | `yoga` | 🔩 |

### Read — `/app/read`  *(lever: recommend mostly FREE — retention & SEO)*
| Element | Free | Bloom+ | Pattern | feature | Status |
|---|---|---|---|---|---|
| Browse & read all articles | ✅ | ✅ | — | — | ✅ |
| Unlimited **saved** reads | first N | unlimited | **C** | `general` | 🔩 (optional) |

### Diary — `/app/tools/diary`
| Element | Free | Bloom+ | Pattern | feature | Status |
|---|---|---|---|---|---|
| Write entries, 1–2 basic themes | ✅ | ✅ | — | — | 🔩 |
| Unlimited history + all themes/fonts | quota / teaser | full | **C/B** | `general`→add `diary` | 🔩 |
| Mood analytics | teaser | full | **B** | `general` | 🔩 |

### Budget — `/app/tools/budget`
| Element | Free | Bloom+ | Pattern | feature | Status |
|---|---|---|---|---|---|
| Track income & expenses | ✅ | ✅ | — | — | 🔩 |
| Goals, insights, all categories, mood-spend | teaser | full | **B** | `general`→add `budget` | 🔩 |

### Me — `/app/me`
| Element | Free | Bloom+ | Pattern | feature | Status |
|---|---|---|---|---|---|
| Streak, `PlanToggle` (dev), `DiscoverBloomPlus` | ✅ | ✅ | — | — | ✅ |
| **Consistency dashboard** (mood graph, goal progress, weight, pillars) | teaser | full | **B** | `general` | 🔩 |

### Reminders / Notes — `/app/tools/notes`
| Element | Free | Bloom+ | Pattern | feature | Status |
|---|---|---|---|---|---|
| Up to **3** reminders | ✅ | — | — | — | 🔩 |
| 4th+ reminder | ✗ → wall | unlimited | **C** | `general` | 🔩 |

---

## 4. `<PlusLock>` — the teaser-lock component (to build)

The missing primitive for **Pattern B**. It shows the premium surface *exists*
(blurred, desirable) and converts on tap. Sits alongside `LockChip` (button
chip) and `DiscoverBloomPlus` (hub card).

**Proposed API**
```
<PlusLock
  feature="coach"          // PaywallFeature → themes the paywall + could theme copy
  title="Your daily coach"  // short line shown over the blur
  blurb="Energy, needs & a peek at tomorrow"  // optional sub-line
  variant="overlay"        // "overlay" wraps a section · "card" = standalone teaser
>
  <CoachTodayCard coach={coach} />   {/* the real thing, blurred for free users */}
</PlusLock>
```

**Behaviour**
- If `usePremium()` → render `children` as-is (no wrapper).
- If free → render `children` **blurred (`blur-[3px]`) + `pointer-events-none`**,
  a soft white veil, and a centred lock cluster on top; the whole thing is a
  button → `openPaywall(feature)`.

**Visual (reuse the phase locked-peek look + rose-gold accent)**
- Rounded container, subtle rose-gold border (`#B76E79` @ ~40%).
- Centre cluster: a Crown/Lock in a rose-gold→hotpink gradient circle, `<PremiumBadge/>`,
  the `title` (font-script, hotpink), the `blurb` (rose/70), and a pill
  **"Unlock with Bloom+ ✿"**.
- `variant="card"`: a standalone teaser (no children needed) for spots where we
  don't want to render the real component at all (e.g. a locked Meals sub-tab).

**Why not just LockChip?** LockChip marks a *button*; `PlusLock` teases a whole
*surface* — that's what creates desire (she sees the coach/insights she's missing).

---

## 5. The upsell surfaces (where the ask happens)

| Surface | Component | Placement | Trigger |
|---|---|---|---|
| **The paywall** | `PaywallSheet` / `PaywallHost` | app-wide (host in `AppShell`) | any `openPaywall(feature)` |
| **Curiosity card** | `DiscoverBloomPlus` | Today (below plan) + Me | tap → paywall |
| **Teaser section** | `PlusLock` (new) | every Pattern-B row in §3 | tap → paywall |
| **Inline chip** | `LockChip` / `PremiumBadge` | on gated buttons/tabs | visual only (button does the gate) |

**PaywallSheet already does:** feature-themed headline, 4 benefits, monthly
**$9.99** / yearly **$59 (save 51%)** toggle, **7-day free trial** CTA, instant
unlock for testing (`setPlan("plus")`).

**Refinements to add to PaywallSheet:**
- Small legal row: *"Cancel anytime · Terms · Restore purchases"*.
- "Restore purchases" action (needed for stores).
- Optional social proof line ("Loved by ✿ women syncing with their cycle").
- Post-trial state handling (see §6).

---

## 6. Trial & billing (later — only `readPlan` changes)

- **Today (testing):** `setPlan("plus")` flips `bloom:plan` locally; `PlanToggle`
  on Me lets you feel both sides. Every gate already reads through `entitlements`.
- **7-day trial:** on trial start, set plan to `plus` + store a trial-end date;
  when it passes, revert to `free` (a light client check now; the billing
  provider owns truth later).
- **Recommended provider: RevenueCat** — one integration across **web (PWA) +
  iOS + Android**, handles trials, renewals, restore, webhooks. (Stripe alone is
  fine if you stay web-only.) The webhook writes the entitlement; `readPlan`
  reads it. **No gate changes.**
- Pricing frame (already in the sheet): **$9.99/mo · $59/yr**; consider an
  early-bird **lifetime** at launch for cash + ambassadors.

---

## 7. `PaywallFeature` — additions to consider

Current values cover the big tools. For full coverage either **map to `general`**
or add: `diary`, `budget`, `read`, `me`, `reminders`. If added, give each a
headline in `PremiumKit`'s `HEADLINES` map, e.g.:
- `diary`: *"Unlimited pages, every theme, and your mood over time."*
- `budget`: *"Goals, insights and your whole money picture."*
- `me`: *"Your full glow dashboard — consistency, mood & progress."*

---

## 8. Rollout plan (phased)

**Phase 1 — foundation (✅ shipped)**
entitlements API · PaywallSheet/Host · PlanToggle · gates on Meals-generate,
Workout-enrol, Cycle-Insights.

**Phase 2 — build `<PlusLock>` + high-value teasers (biggest conversion lift)**
Coach card (Diet), Energy numbers (Today + Diet), Meals sub-tabs, Workout
program list, Yoga library, Me dashboard. Place `DiscoverBloomPlus` on Today.

**Phase 3 — quotas & levers**
Recipes shown, Diary entries/themes, Reminders (3), Read-saved. Decide Read &
Budget boundaries.

**Phase 4 — real billing**
RevenueCat/Stripe · trial + trial-end · restore purchases · paywall funnel
analytics (impression → tap → trial → paid).

---

## 9. Hard guardrails (never break these)

- **Never gate:** period/phase tracking, the day's phase, mood/water logging,
  viewing an already-made plan, or anything ED-/safety-sensitive.
- **Always:** show the value before the wall (teaser), keep the paywall
  contextual (`openPaywall(feature)` at the moment she reaches for it), make it
  easy to close, and lead with the **7-day free trial**.
- **One source of truth:** every gate reads through `entitlements.ts`. No tool
  keeps its own `isPlus`.
