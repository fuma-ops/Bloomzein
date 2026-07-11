# "A moment for you" — image brief

Every day the coach shows **one** feel-good moment, chosen by phase (a new one
each day). Each currently uses a placeholder photo (`/images/read-*.webp`). This
is the full list so you can generate a **custom image per moment** and drop it in.

**Style guide (keep consistent across all):** soft feminine "Bloomzein" world —
rosy/pink palette, warm light, dreamy bokeh, cozy & aspirational, no text baked
in, subject centered-ish (a small emoji badge sits bottom-left over it).
Aspect: landscape ~**3:2**, safe for a full-width banner (h≈150px on mobile).
Suggested folder: `/public/images/moments/` → set `image:` in
`src/lib/todayCoach.ts` (FEEL_GOOD bank) to `/images/moments/<file>.webp`.

---

## 🌙 Menstrual (cocooning)

| # | Emoji | The moment (copy) | Suggested image | Filename |
|---|-------|-------------------|-----------------|----------|
| M1 | 🍫 | "Your body's working hard today. Let a square of dark chocolate melt on your tongue and just… be." | A single square of dark chocolate on a rosy ceramic plate, soft window light | `menstrual-chocolate.webp` |
| M2 | 🫖 | "Brew a warm ginger-lemon tea, light a candle, and give yourself ten slow minutes." | A steaming glass mug of golden tea beside a lit candle, cozy blanket | `menstrual-tea-candle.webp` |
| M3 | 🎧 | "Put on your softest song of the moment and let yourself feel it. This is your moment." | Girl in headphones by a window, eyes closed, warm pink light | `menstrual-music.webp` |
| M4 | 🛁 | "Warm bath, cozy socks, an early night. Rest is productive too." | A dreamy rose-petal bath with candles, fluffy towels | `menstrual-bath.webp` |
| M5 | 📖 | "Curl up with our rest-day face-care ritual — nothing to do, just soak it in." | Woman doing a gentle skincare/face routine, glowing skin, pink bathroom | `menstrual-facecare.webp` |
| M6 | ✍️ | "Write one honest sentence in your diary. Just one." | An open pastel journal with a pen and a cup of tea, soft desk | `menstrual-journal.webp` |

## 🌱 Follicular (fresh energy)

| # | Emoji | The moment (copy) | Suggested image | Filename |
|---|-------|-------------------|-----------------|----------|
| F1 | 🥜 | "Energy's rising — try today's healthy dessert: choco-peanut bars, made for your phase. Enjoy every bite." | Homemade choco-peanut protein bars on baking paper, pretty styling | `follicular-dessert-bars.webp` |
| F2 | ✨ | "New-you energy. Fancy a fresh look? Take a moment, note what you truly want — no rush, no waste." | A tidy vision-board / mood board with pink sticky notes, aspirational | `follicular-freshlook.webp` |
| F3 | 🎶 | "Make a delicious juice, press play on a new playlist, and plan something that excites you." | A bright fresh fruit juice/smoothie with a phone playlist nearby | `follicular-juice-music.webp` |
| F4 | 💆‍♀️ | "Glow prep: read our fresh-start face-care routine and treat your skin tonight." | Radiant glowing skin, serum drops / gua sha, morning light | `follicular-glow-skin.webp` |
| F5 | 🌱 | "You feel springy today — say yes to one small new thing." | Fresh sprout / new bloom, hopeful spring feel, pink tones | `follicular-newthing.webp` |
| F6 | 📝 | "Dream a little: jot down one want and a tiny, mindful plan to get there." | A dreamy planner/notebook with a coffee, sparkles, goal doodles | `follicular-dream-plan.webp` |

## ☀️ Ovulatory (glow, social)

| # | Emoji | The moment (copy) | Suggested image | Filename |
|---|-------|-------------------|-----------------|----------|
| O1 | 💃 | "You're glowing this week. Get ready, feel beautiful, take the photo." | A confident woman getting ready, glowing, mirror + soft glam | `ovulatory-getready.webp` |
| O2 | ☀️ | "Peak-you energy — reach out to a friend and plan the fun thing." | Two friends laughing over coffee/brunch, bright joyful vibe | `ovulatory-friends.webp` |
| O3 | 🥗 | "Fresh & radiant food today — crunchy raw veg and a bright juice. Savour it." | A vibrant colorful salad bowl + fresh juice, sunlit table | `ovulatory-radiant-plate.webp` |
| O4 | 💄 | "Glow moment: our glow-week face-care edit + your favourite song. You've earned it." | Dewy makeup / blush on cheekbones, luminous skin close-up | `ovulatory-glow-edit.webp` |
| O5 | 🌸 | "Feeling confident? Note that new look you want — take your time, spend with intention." | A chic curated outfit flat-lay in pinks, intentional & elegant | `ovulatory-newlook.webp` |
| O6 | 📔 | "Capture how good you feel today in a line — future-you will love reading it." | A happy journal moment, sunlight, a smile, flowers | `ovulatory-capture.webp` |

## 🍫 Luteal (comfort, inward)

| # | Emoji | The moment (copy) | Suggested image | Filename |
|---|-------|-------------------|-----------------|----------|
| L1 | 🍫 | "Cravings are real, and that's ok. Make a healthy dessert that loves your phase — dark-chocolate walnut bites." | Dark-chocolate walnut bites on a rustic plate, cozy warm light | `luteal-choc-walnut.webp` |
| L2 | 🛁 | "Wind-down night: warm juice, our luteal face-care ritual, and your comfort playlist." | Evening self-care flat-lay: warm drink, skincare, candle, soft robe | `luteal-winddown.webp` |
| L3 | 🧘‍♀️ | "Big feelings this week. Be gentle — ten quiet minutes, just for you." | A calm woman resting / gentle restorative pose, dim cozy room | `luteal-quiet.webp` |
| L4 | ✍️ | "Journal it out — luteal is honest, creative energy. Let it spill onto the page." | A journal with honest handwriting, tea, moody warm light | `luteal-journal.webp` |
| L5 | 🕯️ | "Cozy over busy. Say no to one thing, yes to your comfort." | A cozy candlelit corner, blanket, book, warm socks | `luteal-cozy.webp` |
| L6 | 💭 | "Tempted to buy something? Pause. Note it down and sleep on it — kind to you, kind to your budget." | A thoughtful pause: a wishlist note + piggy bank / wallet, calm pink desk | `luteal-mindful-spend.webp` |

---

### Also (optional): the "treat" card photos
The little **snack / juice / dessert** card pulls real recipes (`s01`–`s06`,
`s14`). Those snack recipes have no photo yet (they fall back to
`read-recipes.webp`). If you want real photos there too, generate one per snack
recipe and set `photo:` on each in `src/components/bloom/recipes/data.ts`:

- `s01` Dates + Almond Butter · `s02` Greek Yoghurt, Berries & Flaxseed
- `s03` Carrot Sticks, Hummus & Seeds · `s04` Banana, Dark Chocolate & Walnuts
- `s06` Protein Energy Balls · `s14` Berry Smoothie Cup

Once you hand me the generated files, I'll wire every `image:` / `photo:` path.
