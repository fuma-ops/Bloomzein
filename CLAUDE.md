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
