# M1.2 Bet cards and watch-only runs: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Bet cards, not rules cards.** Students who predict first learn more than those who only watch ([R2 summary](../../../../research/round-2-follow-up/summary.md), "Bet cards, not rules cards"). A card runs in five steps:
  1. state the question;
  2. lock a prediction;
  3. Run on the card's hand-picked first seed, labelled as picked;
  4. watch;
  5. reveal the certified verdict from M1.1's `claims.json` beside the player's own run, with "Run another seed" for fresh seeds.
- **Three new cards,** each with its own small lab rules taken from its round's prototype. City rules arrive only in M3–M5.
  - **"Does money buy happiness?" (R6):**
    - life satisfaction moves 9.4% of the way to its target each day, a 7-day half-life;
    - income counts relative to the settlement median, +0.3 per doubling;
    - the income habit adapts with a 2.6-year half-life, converted to the 112-day year;
    - doubling one person's income gives +0.60 at first and +0.35 for good; doubling everyone's gives +0.30 and then +0.05.
  - **"Jobs or prices?" (R6):** a job loss costs −0.70, and each point of unemployment costs everyone about −0.02 more. A point of inflation costs about −0.007. That gives about 4 : 1 in this model.
  - **"Evening events: are people out at night stopped more?" (R8):**
    - Paired seeds compare arms "events in the evening" and "events in the daytime". No culture appears on the card, in its arms or in its charts.
    - The toy from round 8's `guard_demo.mjs` showed +8.7% victimisation and +1.3% stops, at the same rate per outdoor hour.
    - The reveal shows exposure (hours outdoors) beside the rates, so the lesson is about place and hour.
- **Neutral names** on every card: no real or culture-coded names, and no role names that judge (R2, content rules).
- **City sliders unlock through lab cards.** M1.2 builds only the unlock record: completed cards, saved per device. The sliders themselves arrive in M5.
- **Watch-only runs (Calendar):**
  - The worker has two states, `setup` and `running`.
  - In `setup` it accepts settings: card, arm, seed and treatments.
  - In `running` it accepts only pause, resume, speed, skip and read-only queries (follow, inspect and views). It answers anything else with `refused`.
  - M5's branches return a fork to `setup`.
- **Speed (Calendar):**
  - Speeds: pause, 1× (10 ticks a second), 4× (40) and 16× (160).
  - Skip runs to the next season or year with nothing drawn. It works in chunks of 1,024 ticks with a MessageChannel yield between chunks, so pause still works, then resumes at the earlier speed.
  - Keys: Space pauses. `1`, `2` and `3` set 1×, 4× and 16×, and `4` skips to the next season. The HUD has both skip buttons. This key mapping is a ruling to confirm in the step plan, because [calendar.md](../../../calendar.md) says only "keys 1–4 set the speed".
- **Per-tier speed caps:**
  - A speed is allowed when speed × 10 × the measured tick time stays under half of each second.
  - The worker measures with M0.3's `stats`. When the run drops a speed, the HUD names the cap.
  - At 100,000 agents this leaves only a few times normal speed while drawing ([calendar.md](../../../calendar.md), "Watching").
  - The cap reads only timings and never sim state, so it cannot change a result.
- **HUD date:**
  - It reads "Spring 12, Year 3 · 08:40 · morning · rest day", built from M0.1's calendar functions and the light period below.
  - The season icon is `season_{spring,summer,autumn,winter}_16` from `assets/sprites/seasons.json`, and a bar shows the year's progress (day of the year ÷ 112).
  - The art exists; wire it in.
- **Light periods (R3, Calendar):**
  - `lightPeriod(tick)` sits beside M0.1's calendar in `sim-core` and returns night, dawn, morning, afternoon or dusk. Dawn and dusk span 30 minutes either side of that day's `SUNRISE` and `SUNSET`, morning runs to 12:00, afternoon from 12:00 to dusk, and night the rest. It uses integer comparisons only ([calendar.md](../../../calendar.md), "Time of day").
  - `render-gl` imports only `sim-protocol`, so `sim-protocol` re-exports it, and the renderer and the HUD read one rule.
  - The renderer takes the period from the tick that `pushSnapshot` already receives, so no worker message changes.
  - The tint multiplies only the ground: Skin A's minimap here, and Skin B's zone map in M1.3. Agents draw after it, untinted (R3).
  - Skin A picks each dot's edge against the tinted ground, as M0.4's `edgeFor` does against the zone colour, so the minimap's edge alpha follows the period.
  - A change of period fades over at least 2 s of real time, so at 16× or after a skip the tint trails the clock instead of flashing (R3).
  - The tint-off toggle is a per-device view setting, saved like the unlock record and never sent to the worker, so it cannot change a result.
  - With discrete lab days, each phase takes a period: morning stock in the morning, contests and trade in the afternoon, the walk home at dusk and the settlement at night. With 1,440-tick days the sunrise table applies as it is.
  - The colours are design values from the calendar plan: dawn pink and gold, morning neutral, afternoon warm, dusk orange into violet and night deep blue.

## Packages and files

- `apps/web`:
  - `src/cards/`: the bet-card UI, in the framework M0.5 chose (Solid, or Preact with signals);
  - `src/hud/date.ts` and `src/hud/speed.ts`: the vanilla HUD parts, with the period in the date and the tint-off toggle;
  - `src/unlocks.ts`: the per-device unlock record in `localStorage`.
- `packages/sim-core/src/calendar.ts`: `lightPeriod` and `LIGHT_PERIODS`, beside M0.1's date functions.
- `packages/render-gl/src/light.ts`: the period colours, the fade and the toggle.
- `packages/sim-lab`:
  - `src/cards/happiness.ts`, `src/cards/jobs-or-prices.ts` and `src/cards/evening-events.ts`, each with its claims;
  - each card's rules sit beside it. Any rule M3 or M5 rewrites is marked lab-only.
- `packages/sim-worker`: the `setup` and `running` states, the speed and skip scheduler and the refusal path.
- `packages/sim-protocol`: the new messages.

## Interfaces and data

- **New app-to-worker messages:**
  - `{ type: 'speed', value: 0 | 1 | 4 | 16 }`
  - `{ type: 'skip', to: 'season' | 'year' }`
  - `{ type: 'settings', … }`, accepted in `setup` only
  - `{ type: 'run' }`, which moves `setup` to `running`
  - read-only `{ type: 'query', … }`
- **New worker-to-app messages:**
  - `{ type: 'refused', of: string }`
  - `{ type: 'state', value: 'setup' | 'running' }`
  - `{ type: 'cap', value: 1 | 4 | 16 }`
- These refine M0.3's messages. Update [interfaces.md](../../m0-pipeline/interfaces.md) in the same commit.
- **Light:**
  - `lightPeriod(tick: number): number`, with 0 night, 1 dawn, 2 morning, 3 afternoon and 4 dusk, and `LIGHT_PERIODS` naming them in that order. `sim-protocol` re-exports both.
  - `WorldRenderer.setTint(on: boolean)`, the toggle, refines M0.4's renderer. Record it in interfaces.md in the same commit.
- **Card copy** lives in one strings file per card, so M0.6's name and text lints check it.

## Method and sources

- **Bet cards and hand-picked seeds:** [R2 summary](../../../../research/round-2-follow-up/summary.md), "Presentation" (Crouch et al. on predicting first).
- **Happiness rules:** [R6 happiness notes](../../../../research/round-6-goods-and-wellbeing/notes/happiness-wellbeing.md), part a and the update rule. Predicted sizes are in the [R6 summary](../../../../research/round-6-goods-and-wellbeing/summary.md).
- **Unemployment against inflation:** the same notes, "Spillover and inflation as shares of a personal job loss".
- **Evening events:**
  - [`guard_demo.mjs`](../../../../research/round-8-cultures/prototypes/customs/guard_demo.mjs) and [R8 customs notes](../../../../research/round-8-cultures/notes/customs-preferences.md), part d.
  - Port only the exposure toy: periods, cells, patrols and stops. Its culture labels become arm labels ("evening" and "daytime").
- **Speeds, skip, caps, HUD and watch-only:** [calendar.md](../../../calendar.md), "Watching".
- **Light periods:** [calendar.md](../../../calendar.md), "Time of day", and round 3's light periods in the [R3 art direction notes](../../../../research/round-3-2d-look/notes/art-direction.md).

## Tests for the exit checks

- `speed never changes the state hash`:
  - Run seed 42 to the end of each of the first 8 seasons at 1×, 4× and 16×, and with skips.
  - Every speed gives the same `stateHash` at every date.
  - Run it in Node, with the worker's scheduler on a fake clock.
- `refuses settings while running`:
  - A worker test over a `MessageChannel` sends `settings` after `run`, receives `refused`, and finds the hash unchanged.
  - Pause, speed, skip and queries are still accepted.
- `starts paused under reduced motion`: Playwright with `reducedMotion: 'reduce'` finds the run paused after load.
- `formats the date`: tick `tickAt(3, 0, 12, 520)` reads "Spring 12, Year 3 · 08:40 · morning · workday", and a rest day reads "rest day".
- `light follows the sunrise table`:
  - For every minute of all 112 days, `lightPeriod` equals a reference written straight from the rule in calendar.md.
  - Spot checks: on day 42, mid-summer, 04:30 is dawn and 19:30 is night. On day 98, mid-winter, 06:29 is night, 12:00 is afternoon and 17:30 is night.
- `dots clear 3:1 in every period`: for every zone colour under each period's tint, and at the midpoint of each fade, the dot's chosen edge or its fill reaches at least 3:1 by M0.4's `contrastRatio`.
- `the tint never changes the state hash`:
  - Seed 42 runs 3 days with the tint on and off, and reaches the same `stateHash` at every day boundary.
  - In Chromium, toggling the tint changes ground pixels and no agent pixel.
- **Each new card's claims judge as M1.1 does:**
  - the happiness sizes are estimates, ±0.05;
  - "Jobs or prices?" is an estimate of the ratio;
  - "Evening events" is a comparison that Holds for victimisation, plus an equivalence claim on the rate per outdoor hour.

## Risks and unknowns

- **Owner decision first:** how long a lab day lasts at 1×. Round 1 animates discrete days in about 5.5 s, while a calendar day at 1× lasts 144 s. The phase table of M1.1 takes the answer.
- **Lab rules are not city rules.** Each card's lab-only rules may disagree with M3–M5's later city rules. Label them "lab rules" on the card, and re-judge the claims when the city versions arrive.
- **The evening-events card sits close to culture.** Keep culture off the card entirely, and run M0.6's text lint on its copy. The framing is place and hour, as round 8 asks.
- **Caps from measured time vary by device.** That is fine for results, but golden runs must pin the speed, never rely on the cap.

## Open questions

- **Owner:** how long does a lab day last at 1×? It sets M1.1's phase table and the lab's HUD date, and at the calendar's 144 s a 400-day contest takes 16 h at 1× (computed). Suggested: Primer's 5.5 s, or 55 ticks, with lab dates shown without a clock. Needed before: the step plan.
- **Owner:** do keys 1–3 set 1×, 4× and 16×, and key 4 skip to the next season? [calendar.md](../../../calendar.md) says only that keys 1–4 set the speed. Suggested: yes, as the Approach rules. Needed before: the step plan.
- **Owner:** do the five tint colours look right? They are design values, and the look is the owner's call. Suggested: a `/mockup` of the lab map in each period first. Needed before: building.
- **Owner:** do the contest's roles read "takers" and "traders" on the card? No lint can tell whether a role name judges, so the wording needs a person. Suggested: keep both, since they name acts. Needed before: building.
- **Measure:** does the evening card Hold for victimisation at its own population? Round 8's ×1.087 [1.079–1.095] on 50 paired seeds came from 10,000 agents × 360 days ([R8 customs notes](../../../../research/round-8-cultures/notes/customs-preferences.md), part d). Suggested: judge the port at the card's size before writing its copy, and certify at the toy's size if it misses. Needed before: building.
- **Research:** what margin does each new estimate and equivalence claim use? No claim can be judged without one, and the brief gives ±0.05 only for the happiness sizes. Suggested: fix each from its round before any run, such as 3.5–4.5 for "about 4 : 1" (inference) and round 8's proposed |ln ratio| ≤ 0.05 for the hourly rate. Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the worker's two states and the refusal test come first, then the scheduler with its fake-clock hash test, then the HUD parts. The light periods follow: `lightPeriod` with its table test, then the tint with its contrast test, then the toggle. The card shell wraps M1.1's contest card next, and each new card follows once its claims judge.
- **Keep it simple:** `running` checks one allow-list of message types. Speed sets only how many ticks run each second, and the tick never sees it.
- **Pitfalls:** the fade is render-side state in real time; never let its progress reach the worker or the hash. A season is 40,320 ticks, not a multiple of 1,024 (computed), so skip stops on the calendar's boundary tick, not at a chunk's end. The speed test runs 322,560 ticks at each of four settings (computed), so give it a small world, such as M0.6's 1,024 agents. A year skip is 161,280 ticks, 2.7 min if a tick takes 1 ms (computed), so show its progress.
- **Hard and easy parts:** the scheduler and faithful ports of each prototype's rules need the most care. The date format, season icon, light rule, unlock record and refusal path are mechanical.
