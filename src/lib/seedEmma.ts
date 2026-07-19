// ── "Emma" hero-account seed — for the marketing tour ────────────────────────
// Populates every localStorage store with ~45 days of coherent, pretty data so
// every screen looks full and alive (Today, Cycle, Diet, Meals, Workout, Yoga,
// Budget, Diary, and the Me consistency dashboard). Emma is Day 9 · Follicular,
// gently losing weight (66 → 60 kg), with long streaks and a high Bloom Score.
//
// This is a DEV/marketing utility — it never runs on its own; it's called from a
// hidden seed button (to film on a real device) and from the capture script.
// Everything it writes is plain localStorage, so `clearEmma()` fully undoes it.

const DAYS = 45;

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}
function set(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const weekdayOf = (d: Date) => WEEK[(d.getDay() + 6) % 7];

// Mostly-bright mood arc with the odd mellow day — reads well as a rising curve.
const MOOD_ARC = ["happy", "energetic", "calm", "happy", "sensitive", "energetic", "calm", "tired", "happy", "energetic"];

/** All the keys the seed touches — used by clearEmma() to fully reset. */
const EMMA_KEYS = [
  "bloom:cycle-settings", "bloom:diet-profile", "bloom:diet-setup-complete",
  "bloom:mood-log-v2", "bloom:today-mood", "bloom:symptoms-log-v2",
  "bloom:today-water", "bloom:today-water-goal", "bloom:daily-log", "bloom:diet-eaten",
  "bloom:meals-plan", "bloom:meals-month", "bloom:meals-plan-goal", "bloom:workout-history", "bloom:workout-streak",
  "bloom:workout-autoplan", "bloom:workout-program-phase", "bloom:workout-profile",
  "bloom:yoga-history", "bloom:yoga-sessions", "bloom:yoga-streak", "bloom:yoga-schedule",
  "bloom:diary", "bloom:streak-days",
  "bp:onboarded", "bp:currency", "bp:incomes", "bp:selectedCats", "bp:budget", "bp:txns", "bp:goals",
];

export function seedEmma(): void {
  const today = new Date();

  // ── Cycle → Day 9, Follicular (rising energy) ──
  set("bloom:cycle-settings", {
    lastPeriodStart: iso(daysAgo(8)), periodLength: 5, cycleLength: 28,
    trackerMode: "protection", contraceptiveReminder: true, contraceptiveMethod: "pill",
    reminderHour: "21:00", deviceNotifications: true,
  });

  // ── Diet profile → gentle loss 66 → 60 kg, currently ~62, on track ──
  const weightHistory: { date: string; kg: number }[] = [];
  for (let n = DAYS; n >= 0; n -= 3) {
    const kg = +(66 - ((66 - 62) * (DAYS - n)) / DAYS).toFixed(1); // 66 → 62 over the window
    weightHistory.push({ date: iso(daysAgo(n)), kg });
  }
  set("bloom:diet-profile", {
    goal: "lose", dietType: "omnivore", regime: "mediterranean", allergies: [],
    cookingFrequency: "normal", weightHistory, targetWeight: 60, weight: 62, heightCm: 168, age: 27,
  });
  set("bloom:diet-setup-complete", true);

  // ── Mood log + today's mood ──
  const moodLog: Record<string, string> = {};
  for (let n = DAYS; n >= 0; n--) moodLog[iso(daysAgo(n))] = MOOD_ARC[(DAYS - n) % MOOD_ARC.length];
  moodLog[iso(today)] = "happy";
  set("bloom:mood-log-v2", moodLog);
  set("bloom:today-mood", "happy");

  // ── Hydration: today 7/8, history mostly hitting goal ──
  set("bloom:today-water", { date: iso(today), count: 7 });
  set("bloom:today-water-goal", 8);
  const waterLog: Record<string, { water: number; goal: number }> = {};
  for (let n = DAYS; n >= 0; n--) waterLog[iso(daysAgo(n))] = { water: 6 + ((DAYS - n) % 3), goal: 8 }; // 6–8
  set("bloom:daily-log", waterLog);

  // ── Meals: eaten log (3 meals most days) + a phase-matched weekly plan ──
  const eaten: Record<string, string[]> = {};
  for (let n = DAYS; n >= 0; n--) eaten[iso(daysAgo(n))] = n % 6 === 0 ? ["breakfast", "lunch"] : ["breakfast", "lunch", "dinner"];
  set("bloom:diet-eaten", eaten);
  const plannedDay = { breakfast: "b01", lunch: "l02", dinner: "d13", snack: null, lunchbox: null };
  const mealsPlan: Record<string, typeof plannedDay> = {};
  WEEK.forEach((d) => { mealsPlan[d] = { ...plannedDay }; });
  set("bloom:meals-plan", mealsPlan);
  set("bloom:meals-plan-goal", "lose");

  // ── Workout: ~18 sessions, 6-day streak, plan auto-built for the phase ──
  const workoutHist: { date: string; calories: number }[] = [];
  for (let n = DAYS; n >= 0; n--) if (n % 2 === 0 && n <= 40) workoutHist.push({ date: iso(daysAgo(n)), calories: 210 + ((n % 3) * 20) });
  set("bloom:workout-history", workoutHist);
  set("bloom:workout-streak", { count: 6, lastISO: iso(today) });
  set("bloom:workout-profile", { level: "Intermediate", goal: "tone", equipment: "none", daysPerWeek: 4 });
  set("bloom:workout-autoplan", "1"); // Workout tool builds a phase-matched week on open

  // ── Yoga: ~15 flows, streak, phase-matched soft week ──
  const yogaHist: { date: string; calories: number; durationMin: number }[] = [];
  for (let n = DAYS; n >= 0; n--) if (n % 3 === 0) yogaHist.push({ date: iso(daysAgo(n)), calories: 60, durationMin: 20 });
  set("bloom:yoga-history", yogaHist);
  set("bloom:yoga-sessions", yogaHist.length);
  set("bloom:yoga-streak", { count: 4, lastISO: iso(today) });
  // Follicular default plan (mirrors the Yoga tool's PHASE_DEFAULT_PLAN.follicular)
  const yogaFollicular = ["Morning energy", "Strength", "Morning energy", null, "Strength", "Morning energy", null];
  const yogaSchedule: Record<string, string | null> = {};
  WEEK.forEach((d, i) => { yogaSchedule[d] = yogaFollicular[i]; });
  set("bloom:yoga-schedule", yogaSchedule);

  // ── Diary: ~18 soft entries over the window ──
  const prompts = [
    "Woke up with real energy today — leaning into it.",
    "Grateful for slow mornings and warm tea.",
    "Body felt strong in today's flow.",
    "A little tender, so I kept things gentle.",
    "Proud of how consistent I've been this month.",
    "Small joys: pink skies and a good playlist.",
    "Cravings are real but I nourished myself well.",
    "Feeling in tune with my cycle lately.",
  ];
  const diary = [];
  for (let n = DAYS, k = 0; n >= 0; n -= Math.random() < 0.5 ? 2 : 3, k++) {
    const d = daysAgo(n);
    diary.unshift({
      id: `emma-${n}`, date: iso(d), mood: moodLog[iso(d)] ?? "calm", title: "",
      html: `<p>${prompts[k % prompts.length]}</p>`, theme: "sakura", font: "quicksand",
      createdAt: d.toISOString(),
    });
  }
  set("bloom:diary", diary);

  // ── Budget: income, plan, this-month spend (under budget), dream goals ──
  set("bp:onboarded", true);
  set("bp:currency", "USD");
  set("bp:incomes", [{ id: "inc1", source: "Salary", amount: 3200, frequency: "monthly" }]);
  set("bp:selectedCats", ["rent", "food", "transp", "elec", "beauty"]);
  set("bp:budget", { rent: 1100, food: 450, transp: 120, elec: 80, beauty: 120 });
  const month = iso(today).slice(0, 7);
  const txns = [
    { id: "t1", date: `${month}-02`, catKey: "rent", amount: 1100, description: "Rent", mood: "planned", type: "expense" },
    { id: "t2", date: `${month}-05`, catKey: "food", amount: 62, description: "Groceries", mood: "planned", type: "expense" },
    { id: "t3", date: `${month}-08`, catKey: "beauty", amount: 34, description: "Skincare", mood: "impulse", type: "expense" },
    { id: "t4", date: `${month}-09`, catKey: "food", amount: 5, description: "Oat latte ☕", mood: "planned", type: "expense" },
    { id: "t5", date: `${month}-01`, catKey: "", amount: 3200, description: "Salary", mood: "planned", type: "income" },
    { id: "t6", date: `${month}-06`, catKey: "transp", amount: 40, description: "Transit pass", mood: "planned", type: "expense" },
  ];
  set("bp:txns", txns);
  set("bp:goals", [
    { id: "g1", name: "Bali trip ✈️", target: 2000, saved: 900, monthly: 200 },
    { id: "g2", name: "Emergency fund", target: 3000, saved: 1600, monthly: 300 },
  ]);

  try { window.dispatchEvent(new Event("storage")); window.dispatchEvent(new Event("bloom:workout-updated")); window.dispatchEvent(new Event("bloom:yoga-updated")); } catch {}
}

/** Fully removes everything seedEmma() wrote (leaves the rest of storage alone). */
export function clearEmma(): void {
  try { EMMA_KEYS.forEach((k) => localStorage.removeItem(k)); window.dispatchEvent(new Event("storage")); } catch {}
}
