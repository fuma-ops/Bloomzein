# Bloomzein — Responsive Intelligence + Animation Directive

Apply this to every page built or modified in Bloomzein. No exceptions.

## 1. Screen detection first
Each breakpoint is a different design, not a squeeze of the same layout:
- **Mobile (<768px)**: stacked single column, but small stat/summary cards may sit
  two-up in a grid for density. Generous touch targets, bottom nav.
- **Tablet (768–1024px, `md:`)**: 2-column layout — a sidebar/right panel appears.
- **Desktop (>1024px, `lg:`)**: multi-column. Main content stays a readable width;
  the right side panel always shows contextual smart content — never empty.

## 2. Never 100%-width primary elements on desktop
Calendars, lists, trackers share the screen. Calendar max width on desktop = 60%
of the content area (`lg:col-span-3` of a 5-col grid); the other 40% is the
smart right panel (`lg:col-span-2`, `lg:sticky lg:top-4`).

## 3. Right panel reacts to the main element
Selecting a day/item updates the right panel in place (no navigation): show that
selection's phase/insight, relevant suggestions from other tools, and a quick CTA.

## 4. Nothing is static
- Entrance: fade in + slide up, staggered ~80ms, ~400ms ease-out
  (`animate-scale-in` / `animate-fade-in` with incremental `animationDelay`).
- Micro-interactions: hover ⇒ subtle scale-up + shadow (`hover-scale`,
  `hover:shadow-md`); tap ⇒ `active:scale-95`, ~150ms.
- Data updates animate (counters, progress, soft cross-fades on phase change).
- Empty/loading states use a soft pulsing placeholder, never a blank space.

## 5. Primary CTA always visible & alive
One primary CTA visible without scrolling, with a continuous soft
pulse/glow/breathe (`animate-selected-glow`, `animate-cta-bounce`,
`animate-card-breathe`) — never a static button floating in space. On mobile,
use a floating action button if the natural CTA scrolls out of view.

## 6. Calendar specifics
- Max 60% width on desktop (see §2).
- Day cells with data show a small colored dot/icon for what's planned.
- Tapping a day updates the right panel with that day's context — never navigates away.
- The current day gets a soft glow / elevated look, not just a border
  (`animate-selected-glow`).

## 7. Typography is alive
Phase names, "today's insight" text, and greetings fade in word-by-word on load
— use `AnimatedWords` from `src/components/bloom/AnimatedWords.tsx`.

## 8. Page transitions
Navigation should fade or slide (200ms), not jump — deeper = slide left,
back = slide right. (App-wide change, applied incrementally across pages.)

## 9. Cross-tool data contract — ONE source of truth per concept
This is a premium app: a number or a proposed item must be **identical in every
tool that shows it**. Never let a tool compute its own private copy of shared
data. When tools interact, they read/write through a single shared helper.

**Canonical stores (do not fork these):**
- **Cycle phase** → `bloom:cycle-phase` via `cyclePhase.ts`. Map to a tool's
  vocabulary only through `toContentPhase` / `toDietPhase` / `toYogaPhase`.
- **Meal PLAN** (what is *proposed* to eat) → `bloom:meals-plan`, keyed by
  **weekday** (Mon..Sun), slot → recipeId. Read it via
  `readMealPlan` / `readPlannedDay` / `readTodayPlannedDay` (`crossToolData.ts`),
  write it via `addRecipeToMealPlan`. The **Meals Planner** owns generation
  (`buildWeek`); **Today** and the **Diet** tool must *show the same plan* for
  today (`readTodayPlannedDay`) — they must NOT pick their own recipes.
- **Meal LOG** (what was *actually eaten*) → `bloom:diet-today-meals`, keyed by
  ISO date. This is distinct from the plan and feeds the energy "eaten" figure.
- **Nutrition targets & energy** → `nutritionTargets.ts` only
  (`computeTargets`, `energyBalance`, `goalProjection`). One BMR engine — never
  a second calorie formula.
- **Training burn / sessions** → `crossToolData.ts`
  (`readTrainingCaloriesToday`, `readSessionsThisWeek`, workout + yoga logs).
- **Training PLAN → food** — the planned workout + yoga days
  (`readWorkoutPlanDays` / `readYogaPlanDays`) raise the calorie *target* via the
  activity factor in `computeTargets`; surface the effect with
  `movementFoodLine`. Workout days add a protein-forward dinner; yoga-only days
  get a light, hydrating, anti-inflammatory recovery cue (never protein).

**Recovery-fuel meals** (Workout/Yoga post-session `FuelCard`) are a *distinct
purpose* — a suggested recovery add-on for after a session — and must be framed
as such, not as a competing meal plan. When they add a meal, they add it to the
one `bloom:meals-plan`.

**Rule:** before adding anything that shows a meal, a calorie, a phase, or a
weight, find the canonical helper above and use it. If one doesn't exist, add it
to the shared module — do not read the raw localStorage key in a tool.
