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
  - It reads "Spring 12, Year 3 · 08:40 · rest day", built from M0.1's calendar functions.
  - The season icon is `season_{spring,summer,autumn,winter}_16` from `assets/sprites/seasons.json`, and a bar shows the year's progress (day of the year ÷ 112).
  - The art exists; wire it in.

## Packages and files

- `apps/web`:
  - `src/cards/`: the bet-card UI, in the framework M0.5 chose (Solid, or Preact with signals);
  - `src/hud/date.ts` and `src/hud/speed.ts`: the vanilla HUD parts;
  - `src/unlocks.ts`: the per-device unlock record in `localStorage`.
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
- **Card copy** lives in one strings file per card, so M0.6's name and text lints check it.

## Method and sources

- **Bet cards and hand-picked seeds:** [R2 summary](../../../../research/round-2-follow-up/summary.md), "Presentation" (Crouch et al. on predicting first).
- **Happiness rules:** [R6 happiness notes](../../../../research/round-6-goods-and-wellbeing/notes/happiness-wellbeing.md), part a and the update rule. Predicted sizes are in the [R6 summary](../../../../research/round-6-goods-and-wellbeing/summary.md).
- **Unemployment against inflation:** the same notes, "Spillover and inflation as shares of a personal job loss".
- **Evening events:**
  - [`guard_demo.mjs`](../../../../research/round-8-cultures/prototypes/customs/guard_demo.mjs) and [R8 customs notes](../../../../research/round-8-cultures/notes/customs-preferences.md), part d.
  - Port only the exposure toy: periods, cells, patrols and stops. Its culture labels become arm labels ("evening" and "daytime").
- **Speeds, skip, caps, HUD and watch-only:** [calendar.md](../../../calendar.md), "Watching".

## Tests for the exit checks

- `speed never changes the state hash`:
  - Run seed 42 to the end of each of the first 8 seasons at 1×, 4× and 16×, and with skips.
  - Every speed gives the same `stateHash` at every date.
  - Run it in Node, with the worker's scheduler on a fake clock.
- `refuses settings while running`:
  - A worker test over a `MessageChannel` sends `settings` after `run`, receives `refused`, and finds the hash unchanged.
  - Pause, speed, skip and queries are still accepted.
- `starts paused under reduced motion`: Playwright with `reducedMotion: 'reduce'` finds the run paused after load.
- `formats the date`: tick `tickAt(3, 0, 12, 520)` reads "Spring 12, Year 3 · 08:40 · workday", and a rest day reads "rest day".
- **Each new card's claims judge as M1.1 does:**
  - the happiness sizes are estimates, ±0.05;
  - "Jobs or prices?" is an estimate of the ratio;
  - "Evening events" is a comparison that Holds for victimisation, plus an equivalence claim on the rate per outdoor hour.

## Risks and unknowns

- **Owner decision first:** how long a lab day lasts at 1×. Round 1 animates discrete days in about 5.5 s, while a calendar day at 1× lasts 144 s. The phase table of M1.1 takes the answer.
- **Lab rules are not city rules.** Each card's lab-only rules may disagree with M3–M5's later city rules. Label them "lab rules" on the card, and re-judge the claims when the city versions arrive.
- **The evening-events card sits close to culture.** Keep culture off the card entirely, and run M0.6's text lint on its copy. The framing is place and hour, as round 8 asks.
- **Caps from measured time vary by device.** That is fine for results, but golden runs must pin the speed, never rely on the cap.
