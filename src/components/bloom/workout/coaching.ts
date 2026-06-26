// =============================================================================
// BLOOM & ZEIN — EXERCISE COACHING
// -----------------------------------------------------------------------------
// One source of truth for how to perform every move. Keyed by the same slugs as
// EXERCISES in ./data.ts, so the Library, the live session screen, and the
// flagship programs can all surface real coaching from one place.
//
//   howTo   — 1–2 sentences: how to actually do the movement
//   cues    — 2–3 short form cues to nail technique
//   mistake — the single most common mistake to avoid
// =============================================================================

export interface ExerciseCoaching {
  howTo: string;
  cues: string[];
  mistake: string;
}

export const EXERCISE_COACHING: Record<string, ExerciseCoaching> = {
  // ── Glutes ────────────────────────────────────────────────────────────────
  "sumo-squat": {
    howTo: "Stand wide with toes turned out ~30°. Sit straight down between your hips, then drive through your heels to stand and squeeze your glutes.",
    cues: ["Push your knees out over your toes", "Keep your chest tall and proud", "Sink until thighs are about parallel"],
    mistake: "Letting the knees cave inward — actively press them out.",
  },
  "hip-thrust": {
    howTo: "Upper back on a bench or floor, feet flat. Drive through your heels to lift your hips until your body is a straight line from knees to shoulders.",
    cues: ["Tuck your chin and keep ribs down", "Squeeze glutes hard at the top, pause 1s", "Shins stay vertical"],
    mistake: "Arching the lower back to get higher instead of driving with the glutes.",
  },
  "donkey-kicks": {
    howTo: "On all fours, keep a 90° bend in your knee and press one foot toward the ceiling until your thigh is in line with your back.",
    cues: ["Flex the foot, press through the heel", "Squeeze the glute at the top", "Keep hips square to the floor"],
    mistake: "Over-arching the lower back to lift higher — stop at hip height.",
  },
  "glute-bridge": {
    howTo: "Lie on your back, feet flat and close to your hips. Lift your hips until knees, hips and shoulders form a line, squeezing the glutes.",
    cues: ["Drive through your heels", "Ribs down, no back arch", "Squeeze and hold 1s at the top"],
    mistake: "Pushing through the toes — keep the weight in your heels.",
  },
  "clamshells": {
    howTo: "Lie on your side, knees bent and stacked. Keeping feet together, open the top knee like a clam, then lower with control.",
    cues: ["Keep hips stacked, don't roll back", "Move slowly both directions", "Feel it in the side of the glute"],
    mistake: "Rocking the hips backward to cheat the range of motion.",
  },
  "fire-hydrants": {
    howTo: "On all fours, lift one bent knee out to the side to about hip height, keeping the rest of your body still.",
    cues: ["Brace your core to stay steady", "Lift to hip height, no higher", "Slow and deliberate"],
    mistake: "Twisting the whole torso instead of moving just the leg.",
  },
  "side-lying-leg-raises": {
    howTo: "Lie on your side, bottom leg bent for support. Raise the top straight leg, leading with the heel, then lower slowly.",
    cues: ["Lead with the heel, toes slightly down", "Don't let the hips rock", "Control the way down"],
    mistake: "Letting the leg drift forward — keep it in line with your body.",
  },
  "bulgarian-split-squat": {
    howTo: "Rear foot elevated on a bench, sink straight down on the front leg until the back knee nears the floor, then drive up.",
    cues: ["Keep the front shin vertical", "Most of your weight in the front heel", "Lower straight down, not forward"],
    mistake: "Letting the front knee shoot far past the toes.",
  },
  "romanian-deadlift": {
    howTo: "With soft knees, hinge at the hips and let the weight travel down close to your legs until you feel a hamstring stretch, then squeeze up.",
    cues: ["Hips travel back, not down", "Keep the bar/weights close to your legs", "Flat back the whole way"],
    mistake: "Rounding the lower back or squatting instead of hinging.",
  },
  "weighted-hip-thrust": {
    howTo: "As a hip thrust but with a weight across your hips. Brace, drive through your heels, and fully extend with a hard glute squeeze.",
    cues: ["Brace your core before every rep", "Pause 1–2s at the top", "Chin tucked, ribs down"],
    mistake: "Using momentum and back arch instead of controlled glute drive.",
  },
  "step-ups": {
    howTo: "Place your whole foot on a sturdy step. Drive through the top heel to stand tall, then lower with control.",
    cues: ["Whole foot on the step", "Power from the top leg, not a push-off below", "Control the descent"],
    mistake: "Pushing off the bottom foot instead of working the top leg.",
  },
  "squat-jump": {
    howTo: "Drop into a squat, then explode straight up. Land softly back into the squat to absorb the impact.",
    cues: ["Land soft and quiet", "Knees track over toes", "Reset before each jump"],
    mistake: "Landing with stiff, straight legs — bend to absorb.",
  },
  "kettlebell-swing": {
    howTo: "Hinge at the hips and hike the bell back, then snap your hips forward to float it to chest height. It's a hinge, not a squat.",
    cues: ["Power comes from the hip snap", "Arms are just ropes", "Flat back, braced core"],
    mistake: "Squatting and lifting with the arms instead of hinging and snapping.",
  },
  "pigeon-pose": {
    howTo: "Bring one shin forward across your mat, extend the other leg back, and fold over the front leg to open the glute and hip.",
    cues: ["Keep hips square to the floor", "Breathe into the stretch", "Back leg extends straight behind"],
    mistake: "Collapsing into one hip — support with a cushion if needed.",
  },
  "figure-four-stretch": {
    howTo: "Lying down, cross one ankle over the opposite thigh and gently pull the bottom leg toward you to stretch the glute.",
    cues: ["Keep the crossed knee open", "Flatten the lower back", "Relax and breathe into the glute"],
    mistake: "Pulling so hard the hips lift off the floor.",
  },
  "low-lunge-hip-flexor": {
    howTo: "From a lunge, drop the back knee down and gently press the hips forward to stretch the front of the back hip.",
    cues: ["Tuck the tailbone slightly", "Press hips gently forward", "Tall through the chest"],
    mistake: "Letting the front knee collapse past the toes.",
  },
  "butterfly-seated": {
    howTo: "Sit tall, soles of the feet together, and let the knees fall open. Hinge gently forward from the hips to deepen.",
    cues: ["Sit up tall first", "Hinge from the hips, not the spine", "Let gravity open the knees"],
    mistake: "Forcing the knees down with your hands.",
  },
  "supine-twist": {
    howTo: "Lie on your back, draw one knee across your body and let it fall to the floor while keeping both shoulders down.",
    cues: ["Keep both shoulders grounded", "Exhale to deepen", "Gaze away from the knee"],
    mistake: "Lifting the opposite shoulder to force the knee lower.",
  },
  "hip-circles": {
    howTo: "Hands on hips, draw slow controlled circles with your hips to mobilise the joint. Reverse direction halfway.",
    cues: ["Slow and controlled", "Soft knees", "Make the circles as full as comfortable"],
    mistake: "Rushing — this is a mobility move, not a workout.",
  },
  "reclined-butterfly": {
    howTo: "Lie back with soles of the feet together and knees open, arms relaxed. Simply breathe and let the hips release.",
    cues: ["Support the knees with cushions if tight", "Soften the belly", "Long, slow exhales"],
    mistake: "Treating it as a stretch to push — it's a passive rest pose.",
  },
  "foam-roll-glutes": {
    howTo: "Sit on a foam roller, cross one ankle over the opposite knee, and roll slowly over the glute, pausing on tender spots.",
    cues: ["Roll slowly", "Pause and breathe on tight spots", "Lean toward the working side"],
    mistake: "Rolling too fast to get any release.",
  },

  // ── Core ────────────────────────────────────────────────────────────────
  "dead-bug": {
    howTo: "On your back, arms up and knees over hips. Slowly lower the opposite arm and leg toward the floor, then return.",
    cues: ["Press your lower back into the floor", "Move slowly and exhale as you extend", "Opposite arm and leg together"],
    mistake: "Letting the lower back arch off the floor as you extend.",
  },
  "bird-dog": {
    howTo: "On all fours, reach the opposite arm and leg out long until they're in line with your back, pause, then return.",
    cues: ["Reach long, don't just lift", "Keep hips level — no tilting", "Pause 1s at full extension"],
    mistake: "Rotating the hips open as the leg lifts.",
  },
  "pilates-hundred": {
    howTo: "On your back, lift head and shoulders, extend the legs, and pump straight arms up and down while breathing in a 5-count rhythm.",
    cues: ["Small, fast arm pumps", "Breathe in for 5, out for 5", "Gaze toward your navel"],
    mistake: "Straining the neck — lift from the upper abs, not the chin.",
  },
  "leg-raises": {
    howTo: "Lie flat, legs straight. Lower them slowly toward the floor and raise back up without letting the lower back arch.",
    cues: ["Lower slowly under control", "Hands under hips for support", "Stop before the back arches"],
    mistake: "Dropping the legs fast and arching the back.",
  },
  "scissor-kicks": {
    howTo: "On your back, legs straight and lifted slightly, alternate crossing one leg over the other in a scissoring motion.",
    cues: ["Keep the lower back pressed down", "Small controlled movements", "Keep the core braced"],
    mistake: "Lifting the legs so high the core disengages.",
  },
  "plank-hold": {
    howTo: "On forearms or hands, hold your body in one straight line from head to heels, bracing your whole midsection.",
    cues: ["Straight line head to heels", "Squeeze glutes and quads", "Don't hold your breath"],
    mistake: "Letting the hips sag or pike up.",
  },
  "side-plank": {
    howTo: "On one forearm, stack your feet and hips and lift your hips so your body forms a straight diagonal line.",
    cues: ["Stack shoulders and hips", "Lift the hips high", "Reach the top arm toward the ceiling"],
    mistake: "Letting the hips drop toward the floor.",
  },
  "crunch": {
    howTo: "On your back, knees bent, curl your upper back off the floor by drawing your ribs toward your hips, then lower slowly.",
    cues: ["Curl the ribs toward the hips", "Chin off the chest, gaze up", "Lower with control"],
    mistake: "Yanking the head forward with the hands.",
  },
  "bicycle-crunch": {
    howTo: "Bring opposite elbow toward opposite knee while extending the other leg, alternating in a smooth pedalling motion.",
    cues: ["Rotate from the ribs, not the elbows", "Fully extend the straight leg", "Slow and controlled"],
    mistake: "Pulling on the neck and rushing the reps.",
  },
  "mountain-climbers": {
    howTo: "In a high plank, drive one knee toward your chest, then switch quickly, keeping your hips low and level.",
    cues: ["Shoulders stacked over wrists", "Hips low and steady", "Quick, light feet"],
    mistake: "Letting the hips bounce up and down.",
  },
  "hollow-body-hold": {
    howTo: "On your back, press your lower back into the floor and lift your arms and legs to a shallow banana shape. Hold.",
    cues: ["Lower back glued to the floor", "Arms and legs long", "Lower the limbs only as far as you can hold the back down"],
    mistake: "Letting a gap form under the lower back.",
  },
  "russian-twist": {
    howTo: "Sit leaning back slightly, feet light or lifted, and rotate your torso side to side, tapping the floor by each hip.",
    cues: ["Rotate from the ribs", "Keep the chest tall", "Control — don't fling"],
    mistake: "Just swinging the arms while the torso stays still.",
  },
  "hanging-knee-raise": {
    howTo: "Hanging from a bar, draw your knees up toward your chest using your lower abs, then lower with control.",
    cues: ["Lift with the abs, not momentum", "Avoid swinging", "Lower slowly"],
    mistake: "Kipping and swinging to throw the knees up.",
  },
  "cobra-pose": {
    howTo: "Lie face down, hands under shoulders, and gently press your chest up, lengthening through the spine.",
    cues: ["Lead with the chest, not the chin", "Keep the elbows slightly bent", "Draw the shoulders down and back"],
    mistake: "Cranking the neck back and crunching the lower back.",
  },
  "seated-side-bend": {
    howTo: "Seated tall, reach one arm overhead and lean to the opposite side, feeling a long stretch along your ribs.",
    cues: ["Lengthen up before you bend", "Keep both sit bones grounded", "Breathe into the stretched side"],
    mistake: "Collapsing forward instead of bending directly sideways.",
  },
  "supine-spinal-twist": {
    howTo: "On your back, drop both bent knees to one side while keeping the shoulders down, letting the spine gently release.",
    cues: ["Both shoulders stay grounded", "Let gravity do the work", "Exhale to soften"],
    mistake: "Forcing the knees down and lifting the shoulder.",
  },
  "diaphragmatic-breathing": {
    howTo: "Lie down, one hand on your belly. Breathe in so the belly rises, then exhale fully and feel the deep core gently draw in.",
    cues: ["Belly rises on the inhale", "Long, complete exhale", "Relax the shoulders"],
    mistake: "Breathing into the chest instead of the belly.",
  },
  "pelvic-floor-release": {
    howTo: "In a comfortable supported position, breathe slowly and consciously relax and release the pelvic floor with each exhale.",
    cues: ["Soften, don't squeeze", "Release on the exhale", "Stay relaxed throughout"],
    mistake: "Trying to engage instead of release.",
  },
  "cat-cow": {
    howTo: "On all fours, alternate arching the spine up (cat) and dropping the belly while lifting the gaze (cow) with your breath.",
    cues: ["Move with your breath", "Articulate one vertebra at a time", "Full, gentle range"],
    mistake: "Moving only the lower back instead of the whole spine.",
  },
  "childs-pose": {
    howTo: "Kneel and sit your hips back toward your heels, reaching your arms long in front and resting your forehead down.",
    cues: ["Sink the hips back", "Reach the arms long", "Long, slow exhales"],
    mistake: "Lifting the hips off the heels — relax and let them settle.",
  },

  // ── Arms & Shoulders ────────────────────────────────────────────────────
  "tricep-dips": {
    howTo: "Hands on a bench behind you, lower your hips by bending the elbows straight back, then press back up.",
    cues: ["Elbows point straight back", "Keep the chest up", "Lower with control"],
    mistake: "Letting the elbows flare out to the sides.",
  },
  "lateral-raises": {
    howTo: "Stand tall with a weight in each hand and raise your arms out to the sides up to shoulder height, then lower slowly.",
    cues: ["Lead with the elbows", "Stop at shoulder height", "No swinging or momentum"],
    mistake: "Going too heavy and shrugging the shoulders up.",
  },
  "front-raises": {
    howTo: "Raise the weights straight in front of you to about eye level with thumbs up, then lower with control.",
    cues: ["Thumbs up, soft elbows", "Stop around eye line", "Keep the core braced"],
    mistake: "Leaning back and using momentum to lift.",
  },
  "banded-bicep-curl": {
    howTo: "Stand on a band, and curl the handles toward your shoulders, keeping your elbows pinned to your sides.",
    cues: ["Elbows stay glued to the ribs", "Slow on the way down", "Full squeeze at the top"],
    mistake: "Swinging the elbows forward to help lift.",
  },
  "shoulder-circles": {
    howTo: "Roll your shoulders in big, slow circles to mobilise the joint, then reverse direction.",
    cues: ["Big, slow circles", "Relax the neck", "Full range both ways"],
    mistake: "Tiny, tense circles — open them up.",
  },
  "push-up-knees": {
    howTo: "From a knees-down plank, lower your chest toward the floor with elbows at ~45°, then press back up in one line.",
    cues: ["Hands under shoulders", "Body in one line from knees to head", "Lower with control"],
    mistake: "Letting the hips sag or sticking the bum up.",
  },
  "push-up": {
    howTo: "From a high plank, lower your whole body as one unit until the chest nears the floor, then press back up.",
    cues: ["Elbows at ~45°, not flared wide", "Body stays in one straight line", "Full range, chest to floor"],
    mistake: "Dropping the hips or only doing half reps.",
  },
  "overhead-press": {
    howTo: "Hold weights at your shoulders and press straight overhead until your arms are locked out, then lower with control.",
    cues: ["Ribs down, glutes tight", "Press in a straight vertical line", "Don't lean back"],
    mistake: "Arching the lower back to press the weight up.",
  },
  "arnold-press": {
    howTo: "Start with palms facing you at shoulder height; rotate the palms outward as you press overhead, then reverse.",
    cues: ["Smooth rotation as you press", "Keep the core braced", "Don't shrug the shoulders"],
    mistake: "Rushing the rotation instead of a smooth path.",
  },
  "tricep-overhead-extension": {
    howTo: "Hold one weight overhead with both hands, lower it behind your head by bending the elbows, then extend back up.",
    cues: ["Keep the elbows pointing forward", "Upper arms stay still", "Full stretch then squeeze"],
    mistake: "Letting the elbows flare out wide.",
  },
  "hammer-curl": {
    howTo: "Curl the weights with palms facing each other (thumbs up), keeping the elbows pinned at your sides.",
    cues: ["Neutral grip, thumbs up", "Elbows stay at your sides", "No swinging"],
    mistake: "Using body english to swing the weights up.",
  },
  "diamond-push-up": {
    howTo: "Push-up with hands close together forming a diamond under your chest, targeting the triceps.",
    cues: ["Hands form a diamond under the chest", "Elbows track back, close to the body", "Body in one line"],
    mistake: "Flaring the elbows wide, which shifts work off the triceps.",
  },
  "cross-body-shoulder-stretch": {
    howTo: "Draw one straight arm across your chest and gently hold it closer with the other arm to stretch the shoulder.",
    cues: ["Keep the shoulder down, away from the ear", "Gentle pull, no pinching", "Breathe and soften"],
    mistake: "Pulling on the elbow joint instead of the upper arm.",
  },
  "overhead-tricep-stretch": {
    howTo: "Reach one hand down your back with the elbow pointing up, and gently press the elbow with the other hand.",
    cues: ["Elbow points to the ceiling", "Gentle, steady pressure", "Keep breathing"],
    mistake: "Forcing the stretch to the point of pain.",
  },
  "chest-opener": {
    howTo: "Clasp your hands behind your back, straighten the arms, and lift gently to open across the chest.",
    cues: ["Draw the shoulder blades together", "Lift the chest", "Keep the neck long"],
    mistake: "Shrugging the shoulders up toward the ears.",
  },
  "doorway-stretch": {
    howTo: "Place a forearm on a doorframe with the elbow at shoulder height and step gently forward to stretch the chest.",
    cues: ["Elbow at shoulder height", "Step in slowly", "Keep the core gently braced"],
    mistake: "Over-stepping into a painful range.",
  },
  "neck-rolls": {
    howTo: "Slowly drop your chin and roll your head gently from side to side to release the neck.",
    cues: ["Move slowly and gently", "Let the weight of the head do the work", "Breathe"],
    mistake: "Rolling fast or forcing the head all the way back.",
  },
  "shoulder-rolls": {
    howTo: "Roll the shoulders up, back and down in a smooth circular motion to release tension.",
    cues: ["Big, smooth circles", "Relax the arms", "Reverse halfway"],
    mistake: "Tensing up — keep it loose and easy.",
  },
  "wrist-circles": {
    howTo: "Interlace the fingers and roll the wrists in slow circles to mobilise the joints, then reverse.",
    cues: ["Slow controlled circles", "Full range both directions", "Relax the forearms"],
    mistake: "Rushing through — wrists need gentle, full circles.",
  },
  "gentle-arm-swings": {
    howTo: "Swing your arms loosely across and open the chest in a rhythmic motion to warm the shoulders.",
    cues: ["Loose and rhythmic", "Open across the chest", "Stay relaxed"],
    mistake: "Swinging stiffly or too forcefully.",
  },

  // ── Back ────────────────────────────────────────────────────────────────
  "superman-hold": {
    howTo: "Lie face down and lift your chest, arms and thighs off the floor, squeezing the back and glutes. Hold.",
    cues: ["Lengthen through the crown", "Lift chest and thighs together", "Squeeze the glutes"],
    mistake: "Cranking the neck up — keep the gaze down.",
  },
  "reverse-snow-angel": {
    howTo: "Face down, palms down, sweep your straight arms from your sides up overhead and back, squeezing the upper back.",
    cues: ["Keep the arms low off the floor", "Squeeze the shoulder blades", "Slow and controlled"],
    mistake: "Shrugging the shoulders up toward the ears.",
  },
  "banded-row": {
    howTo: "Anchor a band in front, and pull the handles toward your ribs, squeezing your shoulder blades together.",
    cues: ["Pull to the ribs, not the chest", "Squeeze the back at the end", "Slow release"],
    mistake: "Shrugging and using the arms instead of the back.",
  },
  "wall-angels": {
    howTo: "Stand with your back against a wall and slide your arms up and down like a snow angel, keeping contact with the wall.",
    cues: ["Lower back stays on the wall", "Wrists and elbows touch the wall", "Slide slowly, don't force"],
    mistake: "Arching the back off the wall to get more range.",
  },
  "back-extension": {
    howTo: "Lie face down, hands light by your head, and lift your chest off the floor using your lower back, then lower slowly.",
    cues: ["Lift with the back, not a neck crank", "Keep the gaze down", "Control the descent"],
    mistake: "Hyperextending and jerking up too high.",
  },
  "bent-over-row": {
    howTo: "Hinge forward with a flat back and pull the weights toward your hips, squeezing your shoulder blades, then lower.",
    cues: ["Flat back, hinge from the hips", "Pull to the hip line", "Squeeze the shoulder blades"],
    mistake: "Rounding the back or standing too upright.",
  },
  "deadlift": {
    howTo: "With a flat back, hinge and bend to grip the weight, then drive through your heels and stand tall, squeezing the glutes.",
    cues: ["Flat back, chest proud", "Push the floor away with your heels", "Bar/weights stay close to the body"],
    mistake: "Rounding the lower back or lifting with the arms.",
  },
  "lat-pulldown-band": {
    howTo: "Anchor a band overhead and pull the handles down toward your shoulders, driving your elbows down and back.",
    cues: ["Drive the elbows down toward the ribs", "Squeeze the lats at the bottom", "Tall chest"],
    mistake: "Pulling with the arms instead of the back.",
  },
  "pull-up": {
    howTo: "Hang from a bar and pull your chest toward it by driving your elbows down, then lower with control.",
    cues: ["Start from a full hang", "Drive the elbows down and back", "Chest toward the bar"],
    mistake: "Half reps and using a big kip swing.",
  },
  "renegade-row": {
    howTo: "In a plank on weights, row one weight to your hip while keeping your hips square and stable, then alternate.",
    cues: ["Widen the feet for stability", "Hips don't twist", "Row to the hip"],
    mistake: "Rotating the hips with each row.",
  },
  "thread-the-needle": {
    howTo: "On all fours, slide one arm underneath your body and rest the shoulder down, gently rotating the upper back.",
    cues: ["Let the shoulder and temple rest down", "Rotate from the upper back", "Breathe into the stretch"],
    mistake: "Forcing the rotation from the lower back.",
  },
  "seated-forward-fold": {
    howTo: "Sit with legs extended, hinge from the hips and reach toward your feet, leading with the chest.",
    cues: ["Lead with the chest, not the head", "Hinge from the hips", "Let the neck relax"],
    mistake: "Rounding the spine to reach further.",
  },
  "thoracic-rotation": {
    howTo: "On all fours or side-lying, place a hand behind your head and rotate the elbow open toward the ceiling, then down.",
    cues: ["Rotate from the upper back", "Follow the elbow with your gaze", "Keep the hips still"],
    mistake: "Twisting from the lower back instead of the thoracic spine.",
  },
  "foam-roll-thoracic": {
    howTo: "Lie with a foam roller across your upper back and roll slowly, supporting your head, to release the area.",
    cues: ["Support your head with your hands", "Roll the upper back only", "Pause on tight spots"],
    mistake: "Rolling the lower back over the roller.",
  },
  "supported-fish-pose": {
    howTo: "Lie back over a cushion or rolled towel placed under the upper back to gently open the chest. Relax and breathe.",
    cues: ["Let the chest open passively", "Support the head if needed", "Breathe slowly"],
    mistake: "Placing the support too low under the lower back.",
  },

  // ── Legs & Thighs ─────────────────────────────────────────────────────────
  "inner-thigh-squeeze": {
    howTo: "Place a cushion or ball between your knees and squeeze it firmly, holding the contraction, then release.",
    cues: ["Squeeze steadily, not in pulses", "Keep the pelvis neutral", "Breathe through the hold"],
    mistake: "Holding your breath through the squeeze.",
  },
  "curtsy-lunge": {
    howTo: "Step one leg back and across behind the other, lowering into a lunge, then return to standing.",
    cues: ["Step back and across", "Keep the hips square", "Push through the front heel"],
    mistake: "Letting the front knee cave inward.",
  },
  "side-lunge": {
    howTo: "Step wide to one side and sit into that hip, keeping the other leg straight, then push back to centre.",
    cues: ["Sit back into the bent hip", "Keep the other leg straight", "Chest up"],
    mistake: "Letting the bent knee travel past the toes.",
  },
  "standing-leg-circles": {
    howTo: "Stand tall on one leg and draw controlled circles with the other leg to challenge the hips and balance.",
    cues: ["Brace the core for balance", "Start small, grow the circles", "Stand tall on the supporting leg"],
    mistake: "Leaning the torso to swing the leg.",
  },
  "squat": {
    howTo: "Feet shoulder-width, sit your hips back and down as if into a chair, then drive through your heels to stand.",
    cues: ["Sit back and down", "Knees track over toes", "Chest tall, heels down"],
    mistake: "Letting the heels lift or the knees cave in.",
  },
  "walking-lunge": {
    howTo: "Step forward into a lunge, lowering the back knee toward the floor, then step through into the next lunge.",
    cues: ["Take a long step", "Back knee toward the floor", "Drive up through the front heel"],
    mistake: "Short steps that push the front knee past the toes.",
  },
  "jump-squat": {
    howTo: "Squat down, then explode up into a jump, landing softly back into the squat.",
    cues: ["Sink then explode", "Land soft and quiet", "Knees out on landing"],
    mistake: "Landing stiff-legged instead of absorbing into a squat.",
  },
  "wall-sit": {
    howTo: "Slide down a wall until your thighs are parallel to the floor and hold, keeping your back flat against it.",
    cues: ["Thighs parallel to the floor", "Back flat on the wall", "Breathe through the burn"],
    mistake: "Sitting too high to dodge the work.",
  },
  "single-leg-deadlift": {
    howTo: "Balance on one leg and hinge forward, letting the other leg float back, then return to standing with control.",
    cues: ["Hinge from the hip", "Keep the back flat", "Hips stay level — don't open up"],
    mistake: "Rounding the back or twisting the hips open.",
  },
  "standing-quad-stretch": {
    howTo: "Standing tall, pull one heel toward your glute and gently press the hip forward to stretch the front of the thigh.",
    cues: ["Keep the knees together", "Tuck the tailbone slightly", "Stand tall, use a wall for balance"],
    mistake: "Arching the lower back instead of tucking the hip.",
  },
  "seated-hamstring-stretch": {
    howTo: "Sit with one leg extended and hinge forward over it from the hips to stretch the back of the thigh.",
    cues: ["Hinge from the hips", "Keep the back flat", "Reach the chest toward the toes"],
    mistake: "Rounding the spine to reach the foot.",
  },
  "lizard-lunge": {
    howTo: "From a low lunge, bring both hands to the inside of the front foot and sink the hips to open the hip deeply.",
    cues: ["Keep the back leg active", "Sink the hips gently", "Drop to the forearms to deepen"],
    mistake: "Collapsing the front knee inward.",
  },
  "it-band-stretch": {
    howTo: "Cross one leg behind the other and lean away from the back leg to stretch the outer thigh and hip.",
    cues: ["Lean away from the back leg", "Keep both feet grounded", "Reach the top arm overhead"],
    mistake: "Bending forward instead of leaning sideways.",
  },
  "legs-up-wall": {
    howTo: "Lie on your back with your legs resting up a wall, relax your arms, and breathe to aid circulation and recovery.",
    cues: ["Hips close to the wall", "Let the legs rest fully", "Slow, calming breaths"],
    mistake: "Tensing the legs instead of letting them rest.",
  },
  "gentle-calf-raises": {
    howTo: "Stand tall and rise onto the balls of your feet, then lower your heels slowly back down.",
    cues: ["Rise all the way up", "Lower the heels slowly", "Use a wall for balance"],
    mistake: "Bouncing instead of controlling the lowering.",
  },
  "reclined-hamstring-stretch": {
    howTo: "On your back, loop a strap or hands around one foot and gently draw the straight leg toward you.",
    cues: ["Keep the leg as straight as comfortable", "Flatten the lower back", "Relax into it on the exhale"],
    mistake: "Bending the knee or yanking the leg in.",
  },

  // ── Full Body ─────────────────────────────────────────────────────────────
  "pilates-circuit": {
    howTo: "A flowing sequence of controlled Pilates movements targeting the whole body with an emphasis on the core.",
    cues: ["Move with control, not speed", "Engage the deep core throughout", "Breathe with each movement"],
    mistake: "Rushing the reps and losing the core connection.",
  },
  "banded-total-body": {
    howTo: "A full-body circuit using a resistance band for squats, rows, presses and abductions with constant tension.",
    cues: ["Keep tension on the band throughout", "Control both directions", "Full range on each move"],
    mistake: "Letting the band snap back instead of controlling it.",
  },
  "low-impact-cardio-sculpt": {
    howTo: "A joint-friendly cardio circuit blending bodyweight strength moves with steady low-impact conditioning.",
    cues: ["Keep a steady, sustainable pace", "Stay light on the feet", "Engage the core on every move"],
    mistake: "Going too hard early and burning out.",
  },
  "hiit-circuit": {
    howTo: "Short bursts of high-intensity work with brief rests, cycling through full-body movements.",
    cues: ["Full effort during work intervals", "Use the rests to recover", "Keep form even when tired"],
    mistake: "Letting form fall apart as fatigue sets in.",
  },
  "functional-training": {
    howTo: "Compound, real-life movement patterns — squat, hinge, push, pull, carry — trained as a flowing circuit.",
    cues: ["Brace the core on every pattern", "Move through full range", "Control the transitions"],
    mistake: "Sacrificing technique for speed.",
  },
  "strength-circuit": {
    howTo: "A balanced circuit hitting all four big patterns — push, pull, squat and hinge — for full-body strength.",
    cues: ["Challenging load on each pattern", "Rest enough to keep quality high", "Full range every rep"],
    mistake: "Choosing loads so heavy that form breaks down.",
  },
  "full-body-flow": {
    howTo: "A gentle continuous flow linking mobility movements head to toe to loosen the whole body.",
    cues: ["Move with your breath", "Flow smoothly between shapes", "Keep it gentle"],
    mistake: "Forcing range instead of easing into it.",
  },
  "sun-salutation-adapted": {
    howTo: "A flowing sequence linking forward folds, lunges and gentle backbends, adapted to be accessible and warming.",
    cues: ["Inhale to lengthen, exhale to fold", "Bend the knees as needed", "Move at your own pace"],
    mistake: "Holding the breath instead of flowing with it.",
  },
  "morning-mobility-routine": {
    howTo: "A short routine of gentle joint circles and dynamic stretches to wake the whole body up.",
    cues: ["Start small and build range", "Move every major joint", "Keep it gentle and unhurried"],
    mistake: "Stretching cold muscles aggressively.",
  },
  "yin-sequence": {
    howTo: "Long-held passive stretches that target the deep connective tissue, fully relaxing into each shape.",
    cues: ["Hold each pose and soften", "Breathe slowly and deeply", "Let gravity do the work"],
    mistake: "Actively muscling into the stretch instead of releasing.",
  },
  "body-scan-stretch": {
    howTo: "A guided gentle stretch moving attention slowly through the whole body, releasing tension as you go.",
    cues: ["Move attention head to toe", "Release tension on each exhale", "No rush"],
    mistake: "Treating it as exercise rather than a calming release.",
  },
  "full-body-foam-roll": {
    howTo: "Roll slowly through the major muscle groups with a foam roller, pausing on tight spots to release.",
    cues: ["Roll slowly", "Pause and breathe on tender areas", "Cover each major muscle group"],
    mistake: "Rolling too fast to actually release anything.",
  },
};

/** Coaching for a slug, or null if none authored yet. */
export function getCoaching(slug: string): ExerciseCoaching | null {
  return EXERCISE_COACHING[slug] ?? null;
}
