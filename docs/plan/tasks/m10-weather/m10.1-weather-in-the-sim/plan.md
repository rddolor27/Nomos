# M10.1 Weather in the sim: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **One weather per region per day (Weather).** At the day boundary each region steps a small chain. Tomorrow's kind depends on today's through a transition table chosen by season and biome, so wet and dry spells form.
  - Each step takes one keyed draw, `draw(seed, WEATHER, region, day)`, compared with integer thresholds, as round 8's guarded-decision rule asks.
  - Showers, storms and fog also draw a start and an end minute, from the same key with a second salt.
  - City mode is one region, so the whole town shares its weather.
- **Odds by season and biome.** The tables are indexed by season and by a biome class read from the place's temperature and moisture. Until research round 10 sets them, they are labelled design values from the [Weather plan](../../../weather.md).
- **One source (Weather).** M3.5's yearly yield draw and M7.4's settlement-year yield factor must agree with the days on screen. M7.4's brief asks to key its regional part on (region, year), so the daily weather can fit it. There are two designs, and the owner picks one:
  - **fit:** keep M3.5's yearly draw as it is, and bias each season's chain by it, so a poor harvest year draws more bad days. Old runs keep their harvests.
  - **derive:** compute the yield factor from the season's weather days, and let each run's version pick the rule, so old links replay with the old one.
- **Canonical and cheap.** Weather is written only at the day boundary and enters the state hash. It costs a few integer operations per region a day, and a skip steps the chain every day.

## Packages and files

- `packages/sim-core/src/weather/`:
  - `chain.ts`: the daily step;
  - `tables.ts`: odds by season and biome class, as integer thresholds generated at build time;
  - `minutes.ts`: start and end minutes.
- `packages/sim-protocol`: `WEATHER_KINDS`, and the day's weather sent to the app.
- `tools/worldgen/weather.py`: the Python reference of the chain, whose test vectors check the port in every engine, as M0.1 and M0.6 do for the other kernels.

## Interfaces and data

- **Kinds:** `WEATHER_KINDS = ['clear', 'cloudy', 'rain', 'storm', 'fog', 'snow']`, stored as a Uint8.
- **Per region per day:** the kind (Uint8) and the start and end minutes (Uint16 each), about 5 bytes.
- **To the app:** each day's weather for the regions in view, with the day's first snapshot or in a small message of its own. The step plan picks one and updates [interfaces.md](../../m0-pipeline/interfaces.md).

## Method and sources

- **Design:** the [Weather plan](../../../weather.md), "What weather is".
- **The harvest draw:** M3.5's brief, and the [R6 resources notes](../../../../research/round-6-goods-and-wellbeing/notes/resources-production.md), part b: SD 0.13–0.22, regional plus local.
- **Odds and spells:** research round 10, not yet run.

## Tests for the exit checks

- `same weather in every engine`: seed 42's weather for every region and day of 3 years hashes the same in Node, Chromium, Firefox and WebKit, and matches the Python reference.
- `odds land in their bands`: over 50 seeds, each biome class's share of rain, storm, fog and snow days per season lands in its band from round 10.
- `old runs replay`: a golden share link made before M10 replays to its recorded hash.

## Risks and unknowns

- **Owner decision first:** when round 10 runs, and fit or derive.
- **Verify first:** round 10's odds and spell lengths.
- **Skips must step every day.** A chain sampled only at the end of a skip would diverge from a played run.
- **Old links need their version under either design.** Weather enters the state hash, and M10.3 may change routines, so a link made before M10 replays to its recorded hash only if its version leaves both out.

## Open questions

- **Owner:** When does research round 10 run? If it runs before M3.5, the harvest draw can be built from the weather design, and no fit is needed. Suggested: before M3.5's step plan. Needed before: M3.5's step plan, or this step plan at the latest.
- **Owner:** Fit or derive? Fit leaves old runs' harvests unchanged; derive reads more simply but needs each run's version to pick the rule. Suggested: fit, unless round 10 runs before M3.5. Needed before: the step plan.
- **Research:** What odds by season and biome, and how long are wet and dry spells? Suggested: round 10, with labelled design values until then. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the Python reference and its golden vectors first, then the TypeScript port against them, then the tables and minutes, then the agreement with the harvest.
- **Keep it simple:** a 6 × 6 table of integer thresholds per season and biome class, and no continuous weather fields.
- **Pitfalls:** key each draw on (seed, WEATHER, region, day) alone; yesterday's kind picks the table row, never the key. Then regions can step in any order. Key each region by a stable id, such as its cell, as round 9 keys places, so an M8.7 edit cannot reshuffle the weather.
- **Hard and easy parts:** agreeing with the harvest without breaking old runs needs care; the chain and its tables are mechanical.
