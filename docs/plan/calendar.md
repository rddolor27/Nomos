# Time & calendar

Oct 7, 2026 · @Rd

Nomos is watch-only: nobody is ever controlled, and a run plays itself while the player watches. A year is four 28-day seasons, a day is 1,440 ticks, and people age a year at a time. The tasks are in Implementation plan, tagged (Calendar).

## Owner's decisions (7 October 2026)

Four decisions fix time in Nomos, and they settle round 6's open time questions.

| Decision | Adopted | Settles |
| --- | --- | --- |
| Year length | 4 seasons × 28 days = 112 days | Round 6's open days per year |
| Day length | 1,440 ticks, one per in-game minute, at 10 ticks a second at 1× | Round 6's open ticks per day, and the tick rate the performance budget assumed |
| Ageing | Real ages: one birthday per in-game year, and lifespans of decades | Round 6's open age structure and time compression |
| While a run plays | Only watch. The world and policies are set before Run, and a different policy starts a new branch | Live policy changes in M5 |

Children grow up in 18 years, about 2,000 days, so new generations show when the player skips ahead.

## The calendar

Time is one integer tick counter, and sim-core derives every date from it with integer maths.

| Unit | Length | Notes |
| --- | --- | --- |
| Tick | 1 in-game minute | 10 ticks a second at 1× |
| Day | 1,440 ticks | 144 s at 1× |
| Week | 7 days | 5 workdays, then 2 rest days for markets, leisure and festivals |
| Season | 28 days = 4 weeks | Spring, summer, autumn, winter |
| Year | 112 days = 161,280 ticks | Counted from Year 1 |

**Date maths,** with integer division and remainder only:

- day = tick ÷ 1,440, and minute of the day = tick mod 1,440;
- year = day ÷ 112 + 1, and day of the year = day mod 112;
- season = day of the year ÷ 28, from 0 (spring) to 3 (winter), and day of the season = day of the year mod 28 + 1;
- weekday = day mod 7: 0–4 are workdays, 5 and 6 rest days.

**Details:**

- **Tick 0** is 00:00 on Spring 1, Year 1, a workday; the ledger spin-up runs before it. Because 28 = 4 × 7, every season starts on a workday.
- **An Int32 tick** lasts about 13,000 years (computed), far past any run.
- **The date reads** "Spring 12, Year 3 · 08:40 · rest day".
- **Day length follows the season:** about 14 h of light at mid-summer and 10 h at mid-winter, with noon at 12:00.
  - A 112-entry table of sunrise and sunset minutes feeds the town's light periods.
  - It is built at build time, because sim-core may not call `Math.sin`.
  - Schedules keep clock times.
- **Plain names:** seasons and day types use plain words (spring; workday, rest day), never invented or real month names, so the calendar is tied to no real religion or culture.
- **Festivals sit on the calendar:** round 8's 8–12 festival days per culture a year land on rest days or evenings.
  - Every culture gets the same totals and timing rules.
  - They spread across the seasons, so no season belongs to one culture.

## Seasons in the world

Each season changes the fields, the colours and the sound, and the harvest window shrinks to fit the 112-day year.

| Season | Days | Fields | Town and nature | Sound |
| --- | --- | --- | --- | --- |
| Spring | 1–28 | Planting; seedlings | Blossom trees flower | Birds, light wind |
| Summer | 29–56 | Crops grow | Long days | Birds; crickets at night |
| Autumn | 57–84 | Harvest over 9–14 days, then stubble | Autumn foliage | Wind, fewer birds |
| Winter | 85–112 | Fallow soil; food comes from stores | Snow on ground and roofs; short days | Soft cold wind (`amb_snow`) |

- **The harvest is rescaled.** Round 6's 30–45-day harvest becomes 9–14 days of autumn (× 112/365, computed). Grain's 365-day use-by now outlasts three years, which removes round 6's conflict (m).
- **Palette swaps draw the seasons.** Grass and foliage shift through spring green, summer green, autumn olive on the ground and gold on leaves, and winter pale, GBA-style, so no sprite is redrawn per season.
- **Snow is an overlay** of tiles on ground and roofs; the art was drawn on 7 October 2026, with assets/sprites/season\_map.json saying what each season changes.
- **Ambience follows the season** through the existing biome loops: birds in spring and summer, wind in autumn, and `amb_snow` in winter.
- **Season icons** in the HUD stay distinct from the eight culture emblems.

## Time of day

The day shows its hour from M1 on: five light periods follow the sunrise table, so summer evenings stay light and winter nights come early. The owner added them on 8 October 2026; round 3 had four periods and no afternoon, and only the M3 town used them.

| Period | Starts | Ends | Look |
| --- | --- | --- | --- |
| Dawn | 30 min before sunrise | 30 min after sunrise | Pink and gold, brightening |
| Morning | End of dawn | 12:00 | Clear, neutral daylight |
| Afternoon | 12:00 | Start of dusk | Warmer, turning golden |
| Dusk | 30 min before sunset | 30 min after sunset | Orange into violet |
| Night | End of dusk | Start of dawn | Deep blue; lit windows and lamps in the town |

- **The periods move with the season.** At mid-summer, dawn runs 04:30–05:30 and night starts at 19:30. At mid-winter, dawn runs 06:30–07:30 and night starts at 17:30 (computed from the sunrise table). The half hour either side of sunrise and sunset is a design value.
- **One integer rule:** the period is a pure function of the tick, comparing the minute of the day with that day's sunrise and sunset. It sits beside the calendar in sim-core, so light, HUD and sound always agree.
- **Only the picture changes.**
  - The tint colours the ground and buildings, never people, so bodies, outlines and hues read the same at any hour (round 3).
  - Fades take at least 2 s of real time, so 16× and skips never flash.
  - A tint-off toggle shows the run in plain daylight.
- **No sim rule reads the light.** Schedules keep clock times, and the state hash is the same with the tint on or off.
- **The HUD names the period:** "Spring 12, Year 3 · 08:40 · morning · rest day".
- **Lab days pass through the same periods.** If a lab day runs as phases rather than 1,440 ticks, each phase takes its light: morning stock in the morning, contests and trade in the afternoon, the walk home at dusk and the settlement at night.
- **The town adds lights in M3.** Windows and lamps light from dusk to dawn; 175 house sprites already name a lit-window overlay, and a lamp post is drawn. Ambience and music already follow the periods (Sound).

## Watching

The player watches and never steers: while a run plays, speed, camera and views are the only inputs.

| Speed | Ticks a second | A year takes about |
| --- | --- | --- |
| Pause | 0 | — |
| 1× | 10 | 4.5 h |
| 4× | 40 | 67 min |
| 16× | 160 | 17 min |
| Skip | As fast as the machine allows, with nothing drawn | Seconds for the country's ledgers |

- **Skip** runs to the next season or year without drawing, then resumes at the earlier speed.
- **Speeds cap by tier.** At 100,000 agents the 16 ms tick budget leaves room for only a few times normal speed while drawing.
- **Controls:** Space pauses, keys 1–4 set the speed, and the HUD carries a skip button. Under reduced motion the run starts paused.
- **The HUD shows** the date, time and day type ("Spring 12, Year 3 · 08:40 · rest day"), a season icon and the year's progress.
- **Year in review:** each new year brings a short card.
  - It shows population, births and deaths, festivals held, true against recorded crime, and wealth shifts.
  - It never breaks figures down by culture (round 8).
  - History charts take a year axis, and replays seek by date.
- **Watch-only in the protocol:** while a run plays, the worker accepts only pause, speed, skip and read-only queries such as follow, inspect and views. It refuses settings messages until the player forks.
- **Branches, not live changes.** "Try a different policy" forks the run at the next day boundary, after that day's commit, into a labelled what-if branch.
  - The original keeps running, and both stay replayable from (seed, settings, fork day, change).
  - The fork is logged like a player command, since only the day boundary may write canonical state.
- **Speed never changes the result.** A run's state hash at any date is the same at every speed, with or without skips, and with sound on or off.

## Rescaling rules

Daily life runs per real day, and everything annual runs per 112-day year. The year is shorter, but the economy's ratios hold.

- **Per 112-day year:**
  - ages and birthdays;
  - birth, death, marriage and migration hazards by age;
  - school years and retirement;
  - festival days a year;
  - loan terms, interest and debt limits;
  - the 50–100-year ledger spin-up (5,600–11,200 days);
  - annual statistics.
- **Per day:** meals and needs, shifts and shop hours, shelf lives and spoilage, prices per item, and the daily wage.
- **Hazards convert exactly.** For an annual hazard p, the daily hazard is 1 − (1 − p)^(1/112), precomputed into integer tables at build time. Dividing by 112 works only for small rates: a 30% annual risk would fall to about 26% (computed).
- **Draws stay integer.** Each daily hazard is a 32-bit threshold, round(p\_day × 2^32), tested with one keyed draw, as round 8's guarded-decision rule already asks.
- **Birthdays spread over the year.** A birthday is the day of the year a person was born, drawn for the starting population, so nobody ages all at once on Spring 1.
- **Money ratios hold:**
  - daily wage = annual income ÷ 80 workdays (5 a week × 4 weeks × 4 seasons);
  - item prices keep food, housing and the rest at their calibrated shares of income;
  - shares, the Gini and saving rates are ratios, so the shorter year leaves them unchanged;
  - the currency is invented, so absolute levels are free.
- **The spin-up gets 3.3× shorter** than with 365-day years. 5,600–11,200 country days take about 8–17 s at 1,000 settlements and 67–134 s at 10,000, from the 1.5 ms and 12 ms day budgets (computed).
- **Round 6 rates to re-check** before M2 hard-codes them: the 1.5–3% monthly carrying cost of stored goods and the ≤ 7% pest loss a season were set for a 365-day year. Each must be read as per day or per year.

## Work by milestone

The calendar takes about 12–19 more days over six milestones, now that its art is drawn (unsourced estimate). Each task is in Implementation plan, tagged (Calendar).

| Milestone | Work | Days |
| --- | --- | --- |
| M0 Pipeline | 1,440 ticks a day and 112 days a year recorded in `sim-protocol` (1); the calendar module with date maths and day-length tables (1) | 2 |
| M1 Lab mode | Speed controls, shortcuts and per-tier caps (1–2); the HUD date (0.5–1); watch-only in the protocol (0.5); the five light periods, the ground tint and the period in the HUD (1–1.5) | 3–5 |
| M2 Economy | Recalibrate to the 112-day year: daily wages, prices, interest and loan terms | 1–2 |
| M3 City life | Seasons in the town: crop cycle, day length, palettes, snow and ambience (2–3); the seasonal art is already drawn; lit windows and lamps at night, counted with round 3's light work | 2–3 |
| M5 Society and policy | Ageing with real lifespans (1–2); the year-in-review card (1–2); branches in place of live policy changes (1–2) | 3–6 |
| M7 Country of ledgers | The spin-up and country skip-ahead in 112-day years | 0.5 |

**Exit checks:**

- M0: every date round-trips through its tick count; a season is 28 days and 4 weeks, a year 112 days, and every season starts on a workday.
- M1: while a run plays, the worker accepts only pause, speed, skip and read-only queries, and speed or skips never change the state hash at any date. The light period at every minute of all 112 days follows the sunrise table, every dot and body hue clears 3:1 against the ground in every period by its outline or its fill, and the tint never changes the state hash.
- M2: over 50 paired seeds, food, housing and saving shares and the wealth Gini stay within their calibrated bands on the 112-day year.
- M3: the harvest comes once a year in autumn, and stores carry the town through winter; windows and lamps light only from dusk to dawn, and every body hue clears 3:1 against every walkable tile in every light period.
- M5: the age pyramid stays within its band, no culture's festivals cluster in one season, and a branch replays identically from (seed, settings, fork day, change).

## Open questions

- Should the year-in-review card pause the run, or appear without stopping it?
- Do fast speeds need an auto-camera? The Gazette tab proposes an opt-in one that follows the front-page story; otherwise the player steers.
- Should darkness change what people see, such as fewer witnesses at night (M4)? No sim rule reads the light yet; round 8's exposure lens already counts night outdoor hours.
- Verify first: do round 6's calibrated targets still hold once daily wages and prices are rescaled?
