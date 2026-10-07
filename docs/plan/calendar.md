# Time and calendar plan

Status: draft, 7 October 2026. No code exists yet. The owner's decisions below are settled. The plan is not in the shared plan doc, and its tasks carry no round tag. Every figure is an unsourced estimate unless marked otherwise.

## The answer

- **Nomos is watch-only.** Nobody is ever controlled. A run plays itself, and the player can:
  - pause, change speed, or skip ahead to the next season or year;
  - move the camera, follow and inspect people, and switch views.
  
  World settings, the builder and policies are set before a run. Trying something else starts a new branch, and the original run carries on untouched.
- **A year is 112 days:** four seasons of 28 days (spring, summer, autumn, winter), counted from Year 1. A week is 7 days: 5 workdays and 2 rest days, so each season holds 4 weeks.
- **A day is 1,440 ticks,** one per in-game minute. At 10 ticks a second, that makes round 6's working figure of 144 seconds a day at normal speed:
  - a season takes about 67 minutes;
  - a year takes about 4.5 hours.
- **People age for real:** one birthday per in-game year, with lifespans of decades. Children grow up in 18 years, about 2,000 days, so new generations show when you skip ahead.
- **Daily life stays daily; everything annual runs on the 112-day year.**
  - Meals, shifts, shelf lives and prices stay per day.
  - Ages, birth and death rates, school and careers, festivals a year, contracts, interest, and annual statistics are per 112-day year.

## Owner's decisions (7 October 2026)

| Decision | Adopted |
| --- | --- |
| Year length | 4 seasons × 28 days = 112 days |
| Ageing | Real ages: one birthday per in-game year |
| While a run plays | Only watch. Policies and the world are set before a run; a different policy starts a new branch |

## The calendar

| Unit | Length | Notes |
| --- | --- | --- |
| Tick | 1 in-game minute | 10 ticks a second at normal speed |
| Day | 1,440 ticks | 144 s at normal speed |
| Week | 7 days | 5 workdays, then 2 rest days for markets, leisure and festivals |
| Season | 28 days (4 weeks) | Spring, summer, autumn, winter |
| Year | 112 days | Counted from Year 1; the date reads "Spring 12, Year 3" |

- **Day length follows the season.** Dawn and dusk shift, giving about 14 hours of light in midsummer and 10 in midwinter, which feeds the town's light periods. Schedules keep clock times.
- **Plain names.** Seasons and weekdays use plain words (spring; workday and rest day) rather than invented or real month names. That keeps the calendar neutral, with nothing tied to a real religion or culture.
- **Festivals sit on the calendar.** Round 8's 8–12 festival days per culture a year land on rest days or evenings, with the same totals and timing for every culture. They spread across the seasons, so no season belongs to one culture.

## Seasons in the world

| Season | Fields | Town and nature | Sound |
| --- | --- | --- | --- |
| Spring | Planting; seedlings | Blossom trees flower | Birds, light wind |
| Summer | Crops grow | Long days | Birds, crickets at night |
| Autumn | Harvest over 9–14 days, then stubble | Autumn foliage | Wind, fewer birds |
| Winter | Fallow soil; food comes from stores | Snow on ground and roofs; short days | Soft cold wind |

- **The harvest window is rescaled.** Round 6's 30–45-day harvest becomes 9–14 days of autumn (×112/365). Grain's 365-day use-by now outlasts three years, which removes round 6's conflict (m).
- **Seasons are drawn by palette swaps.** Grass and foliage shift through spring green, summer green, autumn gold and winter pale, GBA-style. Snow comes from overlay tiles on ground and roofs. These reuse the planned snow art rather than redrawing every sprite.
- **Ambience follows the season** through the existing biome loops: birds in spring and summer, wind in autumn, and the snow loop in winter.

## Watching

- **Speeds:**

  | Speed | A year takes about |
  | --- | --- |
  | Pause | — |
  | 1× | 4.5 hours |
  | 4× | 67 minutes |
  | 16× | 17 minutes |
  | Skip | As fast as the machine allows, with nothing drawn |

  Skip runs to the next season or year without drawing, then resumes. The country's ledgers run a year in seconds. Fast speeds cap by tier: at 100,000 agents the 16 ms tick budget allows only a few times normal speed while drawing.
- **Controls:** Space pauses, keys 1–4 set the speed, and the HUD carries a skip button. Under reduced motion the run starts paused, as the plan already requires.
- **The HUD shows** the date, the time and the day type ("Spring 12, Year 3 · 08:40 · rest day"), a season icon, and the year's progress.
- **Year in review:** each new year brings a short card with population, births and deaths, festivals held, true against recorded crime, and wealth shifts. It never breaks figures down by culture (round 8). History charts take a year axis, and replays can seek by date.
- **Branches, not live changes.** "Try a different policy" forks the run at the current day into a new branch, with the change labelled as a what-if. The original keeps running, and both stay replayable.

## Rescaling rules

- **Per year (112 days):**
  - ages and birthdays;
  - birth, death, marriage and migration hazards by age;
  - school years and retirement;
  - festival days a year;
  - loan terms, interest and debt limits;
  - the 50–100-year ledger spin-up (5,600–11,200 days);
  - annual statistics.
  
  Hazards convert to per day as the annual rate divided by 112.
- **Per day (real):** meals, needs, shifts, shop hours, shelf lives and spoilage, prices per item, and the daily wage.
- **Money ratios hold.**
  - The daily wage is the annual income divided by 80 workdays.
  - Item prices are set so food, housing and the rest take their calibrated shares of income.
  - Shares, Gini and saving rates are ratios, so the shorter year leaves them unchanged.
  - The currency is invented, so absolute levels are free.

## Tasks by milestone (draft)

**M0 Pipeline**
- [ ] Fix the tick rate: 10 ticks a second at normal speed and 1,440 ticks a day (1 tick = 1 in-game minute). The performance budget already assumes 10 a second (1 day).
- [ ] Add a calendar module in sim-core: 112 days a year, 28 a season, 7 a week (5 workdays and 2 rest days), date and season maths, and day-length tables, in integer arithmetic only (1 day).

**M1 Lab mode**
- [ ] Add speed controls: pause, 1×, 4×, 16× and skip to the next season or year. Add keyboard shortcuts, and per-tier speed caps (1–2 days).
- [ ] Add the date, time and season to the HUD, with year progress (0.5–1 day).
- [ ] Settle watch-only: no sim input during a run except the camera, speed and views. Lab cards set treatments before Run (0.5 day).

**M2 Economy**
- [ ] Recalibrate to the 112-day year: daily wages from annual income over 80 workdays, and item prices that keep the calibrated shares of income. Interest, debt limits and loan terms run per in-game year (1–2 days).

**M3 City life**
- [ ] Add seasons in the town (2–3 days):
  - the crop cycle: plant in spring, grow in summer, harvest over 9–14 days of autumn, lie fallow in winter;
  - day length by season;
  - seasonal palettes and winter snow overlays;
  - ambience by season.

**M5 Society and policy**
- [ ] Age people one year per 112-day year, with real lifespans, birthdays spread over the year, and birth and death hazards by year of age (1–2 days).
- [ ] Add the year-in-review card and history charts on a year axis, never broken down by culture (1–2 days).
- [ ] Replace live policy sliders with branches. "Try a different policy" forks the run at the current day as a labelled what-if, and policies are otherwise set before a run (1–2 days).

**M7 Country of ledgers**
- [ ] Run the 50–100-year spin-up and country skip-ahead in 112-day years (0.5 day).

**Art and sound**
- [ ] Seasonal palette maps for grass, foliage and crops; snow overlays for ground and roofs, extending the planned snow tiles; season icons for the HUD, kept distinct from the eight culture emblems (1–2 days).

In all, about 11–18 days.

## Exit checks

- [ ] Calendar maths: every date round-trips through its tick count, and the seasons and weeks line up (28 days a season, 4 weeks a season, 112 days a year).
- [ ] Watch-only: a run's input log holds only camera, speed and view events between its fork points, and changing speed or skipping never changes the state hash at any date.
- [ ] Rescaling: over 50 paired seeds, food, housing and saving shares, the wealth Gini and the age pyramid stay within the calibrated bands on the 112-day year.
- [ ] Seasons: the harvest happens once a year in autumn, stores carry the town through winter, and no culture's festivals cluster in one season.

## Open questions

- Should the year-in-review card pause the run, or appear without stopping it?
- Do fast speeds need an auto-camera, such as following notable events, or does the player steer?
- A new verify-first item: do round 6's calibrated targets still hold once daily wages and prices are rescaled?
