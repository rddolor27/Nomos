# M2.3 Calibration and design runner: step plan

> **For agentic workers:** use executing-plans, one task per agent, with test-driven-development inside each task. Steps use checkbox (`- [ ]`) syntax.

> **Status:** step plan, 10 October 2026. It replaces the brief.

**Goal:** a `city` preset that meets round 2's economy targets on 50 fresh seeds, or reports each miss as a documented gap. Beside it, a headless design runner whose daily flow logs are the same on any number of threads.

**Architecture:**
- The day's stats row becomes the flow log: levels at the day's end, then every flow as that day's sum. `STAT_NAMES` names its columns, and every target is a function of the rows.
- `CITY` is a second frozen `EconomyParams`. Four new fields switch its mechanisms on, and their off values leave `LENGNICK` byte-identical.
- `tools/cli` gains two commands. `design` runs a grid's cells on `worker_threads` and writes column files; `targets` judges a run's folder against one target table.
- Calibration filters a Latin-hypercube sweep on fit seeds, then confirms once on fresh seeds.

**Spec:** [task.md](task.md); [M2.1's rulings](../m2.1-lengnick-core/plan.md#rulings) and [M2.2's rulings](../m2.2-spawn-and-fold/plan.md#rulings), which stand except where a ruling below says; [interfaces.md](../../m0-pipeline/interfaces.md), "The economy" and "Spawn and fold". The flags to fix are in [M2.1's task](../m2.1-lengnick-core/task.md). Targets come from [R2's economy notes](../../../../research/round-2-follow-up/notes/economy-calibration.md), Key Questions (KQ) 1–5, where every official figure is a search summary. The method is [R2's validation notes](../../../../research/round-2-follow-up/notes/validation-methodology.md), parts 1–3.

## Rulings

The owner let the coordinator settle M2.3's open questions. These rulings are the planner's, made for the coordinator, and the owner can overturn any of them.

**The coordinator settled the planner's three questions on 10 October 2026:**
1. **Yearly targets count per 112-day game year.** That shows a real year's worth of exits and pay cuts in one game year, as a player sees a year, and matches M2.7's "final calibration on the 112-day year".
2. **"Markup over wholesale" reads as markup over unit labour cost** until M2.4 adds the shop layer.
3. **The slow-searcher trait is fair under four conditions:**
   - it's drawn at birth on its own keyed stream, independent of looks, culture, household and wealth;
   - it's never inherited;
   - it never shows on a body;
   - it's listed on M6.6's "What this toy leaves out" page.

1. **Closed money.** `CITY.fiatIssuePpm` is 0, and fiat stays a scenario setting, a grid's `params` override. The suite sets no saving-rate target; M2.1's closed-money identity stands. Cost if wrong: one confirmation with fiat on, judged against R2's 4%.
2. **Monthly targets per 21-day month, yearly ones per 112-day year,** as [calendar.md](../../../calendar.md)'s rescaling rules and [milestone.md](../milestone.md) ask.
   - Firm exits of 7.5–8.5% a year so become 1.45–1.65% of firm-months (computed), not 0.65%.
   - "2% of stayers see a pay cut a year" counts per 112-day year.
   - Cost if wrong: γ and the exit threshold re-tune in M2.7.
3. **One layer of firms.** Lengnick's firms are the city's shops, and their "wholesale" price is unit labour cost, wage ÷ 63 (A3).
   - The call auction stays unwired until [M2.4](../m2.4-goods-and-food/task.md) brings sectors, so M2.1's Ruling 5 moves to M2.4.
   - A shop layer built now would be rebuilt for eight goods.
4. **Workers differ in search reach, not productivity.**
   - A keyed share of people, `slowSearcherPpm`, visits only `slowJobSearches` firms a month while unemployed; everyone else visits `jobSearches`.
   - The trait is `draw2(seed, LABOUR_DRAW, person, 4)`: fixed for life, independent of look and culture, and never shown.
   - Lengnick fills a vacancy with its first acceptable visitor, so productivity changes nobody's chance of a job. Reservation wages fall 10% a month, so spreading them delays a spell by a month or two but adds no long tail.
   - R2 KQ2 computes that one 26% hazard leaves 15% of the unemployed out 27+ weeks, against 27% observed, and that only a mix of hazards closes the gap.
   - A productivity spread moves to M2.5, which needs income dispersion.
5. **Exit is bankruptcy at a zero debt limit,** Mark-0's Θ = 0.
   - At month end, a firm with workers whose pay per worker fell below `shortPayExitPpm` of its wage (A15) exits.
   - Its workers are laid off and its stock is written off into `STAT_WRITE_OFF`. The row re-enters at once as M2.1 Ruling 7's entrant, keeping the few cents A15 left it, so no money moves.
   - An idle exit writes its stock off too, which closes M2.1's write-off flag.
   - `CITY`'s exits are off (Ruling 19). `shortPayExitPpm` stays a param, and the tests switch the mechanism on.
6. **The city's markup band binds.** With `markupClamp` 1, a price step stops at the band's edge. `LENGNICK` keeps 0, Lengnick's rule, where the band only gates a step. That rule, plus wage cuts, explains M2.1's 66% of firm-months above 1.15.
7. **`stockHighPpm` becomes the excess over one month's demand,** like the markups, because `mulPpm` takes at most 1,000,000 ppm. `LENGNICK`'s 1,000,000 becomes 0, the same band.
8. **The flow log is the stats row.**
   - Every flow slot becomes that day's sum, cleared each morning, and the levels stay day-end values.
   - `STAT_NAMES` is schema 1. One district stands until M3.1's districts, written as a column of zeros.
   - `taxes` is a slot nothing writes until M5's treasury.
   - An exit re-enters at once, so `exits` also counts entries.
   - `firings` counts every layoff: notices, exits and shocks.
9. **Targets live in TypeScript only,** in one table, `targets/targets.ts`. The brief's `tools/analysis/targets.py` would be a second home for every target. Anyone can still read the columns with `numpy.fromfile(path, '<f8')`.
10. **The estimate claim.** M1.1's claim library doesn't exist yet, so M2.3's judge uses the rule [M1.1's brief](../../m1-lab-mode/m1.1-lab-engine-and-claims/plan.md) suggests, and M1.1 can adopt it.
    - A target holds when the 90% t-interval of its mean over seeds lies inside the band: two one-sided tests at 5%. It fails when the interval lies wholly outside, and is otherwise inconclusive.
    - The judge needs 20 seeds or more. With fewer, it reports medians only.
    - "Every target holds" is an intersection–union test, so it needs no multiplicity correction (inference).
    - Power, by normal approximation checked against 20,000 Monte Carlo trials (computed): at 50 seeds, a mean 0.36 between-seed SDs inside the nearer edge holds 80% of the time, and 0.47 SDs 95%. At 20 seeds it takes 0.58 and 0.75 SDs.
11. **Bands.**
    - A target given as a range keeps it. A point target gets ±20%, the planner's tolerance, not a sourced band.
    - BAM's bands that apply (R2 KQ5): unemployment's mean and s.d., the Phillips, Okun and Beveridge correlations, and firm-size skewness. They are computed on monthly series, though BAM's own period may differ (inference).
    - Not applied: BAM's inflation, since closed money holds prices flat; its real wage of 0.34 of productivity, where Lengnick's labour share is 1 ÷ markup, about 0.7; and its 13% vacancy rate, since a Lengnick firm posts at most one vacancy a month.
12. **Calibration filters patterns** (R2 validation, part 3).
    - **Tier 1** is the filter: the exit check's price-change and job-finding targets, BAM's unemployment band, the city's two bands and R1's price band.
    - **Tier 2** ranks the points that pass. A miss is a documented gap.
    - **The pay-cut target is tier 2, a documented gap** (coordinator, 10 October 2026). It was the exit check's third named target.
      - Its 2% of stayers comes from the US, where stayers' wages grow about 3.6% a year (R2 KQ1, snippet only).
      - Under closed money the wage level can't drift, so cuts must balance raises. The sweep found cuts in over 10% of stayer-years wherever unemployment was in band (measured here).
      - It was decided from the target's structure, after the sweep stopped and before any confirmation seed ran.
      - Revisit it when the game has inflation, from M5's treasury.
    - **Tier 3** is held back for corroboration and never tuned on: BAM's s.d., correlations and size skew, and Mark-0. It still counts toward the exit check, so a miss there is a documented gap, never a reason to re-tune.
    - **Seeds:** the sweep runs seeds 1–5 under every point, the refine runs 1–20, and the one confirmation runs 1001–1050, never seen before. A re-tune confirms on 2001–2050.
    - The confirmation also removes the winner's curse of picking the best of 300 points.
    - If fewer than 0.5% of points pass tier 1, stop and report. R2 reads that as a missing mechanism, not a range to widen.
13. **π stays low.** Job-to-job moves already run at 2.5% a month, above R2's 1–2%. So the brief's rule to raise π toward 0.3–0.6 doesn't apply, and the sweep spans π = 0.02–0.15. The report logs q, the share of an unemployed searcher's visits that end in a hire.
14. **The credit line waits on a trigger,** fixed now, before tuning.
    - Cycles are too mild when the city's median s.d. of monthly unemployment, on the confirmation, is under BAM's floor of 0.010.
    - If it trips, the coordinator gets a follow-up brief: a lender account, loans in `money/claims.ts`, interest and default, sharing money design with M2.5. Its R–Θ sweep is then tested against both Mark-0 tables.
    - Without credit, Mark-0 at Θ = 0 predicts no endogenous crisis, which tier 3 checks on every seed. Mark-0's own residual unemployment of 30–60% doesn't transfer to Lengnick's scale, and the report says so.
15. **Reported, not targeted:** the mean size of a price change (R2 KQ1's gap, so ϑ stays 2%, as KQ1 advises), the share of firm-months above the markup ceiling, and q. Survival by firm age needs firm ages, so it is a documented gap.
16. **The runner.**
    - A cell is a point, a size, a police share, a shock and a seed.
    - Its city spawns from the preset's R*, like M2.2's: seed 42's hand-built city, folded at the first month end on or after its `burnInDays`.
    - R* scales by size ÷ 1,000, so sizes are multiples of 1,000, up to 100,000.
    - A sweep's points change the params, so a sweep uses the hand-built start.
    - A shock lays off floor(points × size ÷ 100) people at the start of its day, through `economyDay`'s new `layoffs` argument.
    - Police share is recorded and does nothing until M4.
    - No nightly workflow yet: M1.1 owns `nightly.yml`, and the full grid runs by hand.
17. **No `name` or `version` on a preset.** Each cell's `meta.json` records the preset's name, its full params and the commit.
18. **The city's burn-in comes from a 40,000-day run** (coordinator, 10 October 2026).
    - The 20,000-day run found no truncation of the city's mean price in its first half, only 9,975 days of the unemployment share (seeds 1–5, Node 24.18.0, measured here).
    - A second-half truncation means the run was too short, and lengthening it is MSER-5's standard remedy.
    - Over 40,000 days, MSER-5 cuts 11,530 days of the mean price and 10,900 of the unemployment share, so `burnInDays` is 17,295 (measured here).
    - After day 11,000 the mean price still drifts down about 0.06% per 1,000 days (measured here).
    - Measured after day 17,295 on seeds 1–20, all six tier-1 targets hold, with more room than after day 10,000. Seeds 1001–1050 were still unseen.
    - Ruling 19 then turned the city's exits off, which moved the price's cut. The same run (seeds 1–5, 40,000 days, Node 24.18.0) now cuts 12,285 days of the mean price and 10,900 of the unemployment share, both in its first half, so `burnInDays` is 18,428 (measured here).
19. **`CITY`'s exits stay off until entry is designed** (coordinator, 10 October 2026), after the M2.3 review found a loop.
    - **The bug:** a re-entered firm row has 0 workers. Shop search weights shops by workers (`firmByWorkers`) and runs before job search in `startMonth`, so no household ever links to the row (measured by the review).
    - **The loop:** the row hires, sells nothing, pays under 30% of its wage and exits again, every month. On seed 1001, 98% of the exits were repeats (measured by the review).
    - **The ruling:** `CITY.shortPayExitPpm` is 0. `LENGNICK` doesn't move, and the economy golden stays `6a652730`.
    - The exit target, 1.45–1.65% of firm-months, is a tier-2 documented gap meanwhile: the city's exits are 0 on every seed (measured here).
    - With exits off on seeds 1–20 (warm-up 10,000 days), all six tier-1 targets still hold (measured here).
    - The burn-in was measured again (Ruling 18), and the re-tune was confirmed once on seeds 2001–2050, since the review had seen 1001–1050 (Ruling 12).

## The two presets

`LENGNICK` is the replication M2.1 built; its checks and golden stay as they are. `CITY` takes every field of `LENGNICK` except these:

| Field | `LENGNICK` | `CITY`, as Task 1 writes it | Task 4's sweep range | Why |
| --- | --- | --- | --- | --- |
| `stockLowPpm` | 250,000 | 800,000 | fixed | 0.8–1.6 months of stock; retail holds 1.27 (R2 KQ3) |
| `stockHighPpm`, the excess over 1 | 0 | 600,000 | fixed | as above |
| `markupLowPpm` | 25,000 | 360,000 | fixed | retail gross margins of 26–33% (R2 KQ3) |
| `markupHighPpm` | 150,000 | 500,000 | fixed | as above |
| `markupClamp` | 0 | 1 | fixed | Ruling 6 |
| `openingPrice` | 2,500 | 3,200 | fixed | 3,200 × 63 is 1.41 × the 142,800 wage, inside the band (computed) |
| `priceChancePpm` (θ) | 750,000 | 750,000 | 200,000–750,000 | frequency ≈ θ × the share of months out of band (R2 KQ1) |
| `wageCutMonths` (γ) | 24 | 24 | 24–96 | fewer cuts for stayers |
| `onJobSearchPpm` (π) | 100,000 | 100,000 | 20,000–150,000 | Ruling 13 |
| `jobSearches` (β) | 5 | 5 | 3–6 | job finding |
| `slowSearcherPpm` | 0 | 100,000 | 0–300,000 | Ruling 4 |
| `slowJobSearches` | 5 | 1 | 1–2 | Ruling 4 |
| `shortPayExitPpm` | 0 | 1,000,000 | 0–1,000,000 | Ruling 5 |
| `burnInDays` | 9,893 | 9,893 | measured in Task 4 | M2.1 Ruling 9 |

`fiatIssuePpm` is 0 in both (Ruling 1).

## Shared schemas

**The flow log, schema 1.** Each run writes `day` and `district` columns, then `STAT_NAMES` in slot order. "Day 0" is a month's first day and "day 20" its last.

| Slots | Names | Kind | Written |
| --- | --- | --- | --- |
| 0–5 | `unemployed`, `vacancies`, `price_mean`, `wage_mean`, `household_cash`, `firm_cash` | level | every day, as now |
| 6–8 | `stock`, `size_squares`, `size_cubes` (Σ stock, Σ employees², Σ employees³ over firms) | level | every day (new) |
| 9–10 | `sales_units`, `sales_cents` | flow | every day |
| 11–14 | `price_changes`, `price_change_ppm`, `hires` (from unemployment), `switches` (job to job) | flow | day 0 |
| 15 | `firings` (every layoff) | flow | day 20, and a shock's day |
| 16–19 | `wage_bill`, `profits_paid`, `exits`, `issued` | flow | day 20 |
| 20 | `produced` | flow | every day (new) |
| 21 | `write_off` (units) | flow | day 20 (new) |
| 22–23 | `job_visits` (by the unemployed), `above_markup` (firms above the ceiling after repricing) | flow | day 0 (new) |
| 24–25 | `spell_months`, `long_spells` | flow | day 20 (new) |
| 26–27 | `stayers`, `stayer_cuts` | flow | a 112-day year's last day (new) |
| 28 | `taxes` | flow | never, until M5 |

**A grid,** read by `design --grid <file>`. `warmUpDays` defaults to the preset's `burnInDays`; `params` and `lhs` are optional; a shock of 0 points is none.

```json
{
  "preset": "city",
  "start": "spawn",
  "days": 14000,
  "warmUpDays": 9893,
  "seeds": [1, 2],
  "sizes": [1000, 3000],
  "policeShares": [0],
  "shocks": [{ "day": 0, "unemploymentPoints": 0 }, { "day": 12012, "unemploymentPoints": 5 }],
  "params": { "fiatIssuePpm": 0 },
  "lhs": { "points": 300, "seed": 1, "ranges": { "priceChancePpm": [200000, 750000] } }
}
```

**A run's folder:** one folder per cell, named `p<point, 3 digits>-n<size>-x<police index>-k<shock index>-s<seed>`. It holds `meta.json` and one `<column>.f64` per column: little-endian Float64, one row a day per district. `meta.json` holds `schema`, `commit`, `cell`, `preset`, `start`, `seed`, `size`, `tier`, `policeShare`, `shock`, `layoffs`, `point`, `params` (full), `days`, `warmUpDays`, `districts` and `columns`, with no times or thread ids.

## The targets

**The window** is every whole 21-day month that starts on or after `warmUpDays` and ends before `days`. For month m, u is the month-end unemployed ÷ people. A month's start means the level on the day before its day 0. Yearly figures come from the year ends inside the window.

| Tier | Target | Measure | Band | Source |
| --- | --- | --- | --- | --- |
| 1 | `price_change_share` | `price_changes` ÷ firm-months | 0.09–0.12 | R2 KQ1 |
| 1 | `job_finding` | `hires` ÷ the unemployed at each month's start | 0.208–0.312 | R2 KQ2: 26%, ±20% |
| 1 | `unemployment_mean` | the mean of u | 0.04–0.09 | BAM (R2 KQ5) |
| 1 | `markup` | `sales_cents` ÷ `wage_bill` | 1.36–1.50 | R2 KQ3 |
| 1 | `stock_months` | the mean of month-end `stock` ÷ the month's `sales_units` | 0.8–1.6 | R2 KQ3 |
| 1 | `price_ratio` | the mean month-end `price_mean` ÷ `openingPrice` | 0.25–4 | [R1](../../../../research/round-1-baseline/full-report.md) |
| 2 | `hires_rate` | (`hires` + `switches`) ÷ the employed at each month's start | 0.0264–0.0396 | R2 KQ2: 3.3%, ±20% |
| 2 | `layoff_rate` | `firings` ÷ the employed at each month's start | 0.008–0.012 | R2 KQ2: 1.0%, ±20% |
| 2 | `job_to_job` | `switches` ÷ the employed at each month's start | 0.01–0.02 | R2 KQ2 (inference) |
| 2 | `exit_rate` | `exits` ÷ firm-months | 0.0145–0.0165 | R2 KQ3 at Ruling 2's year (computed) |
| 2 | `long_spell_share` | `long_spells` ÷ the month-end unemployed | 0.216–0.324 | R2 KQ2: 27% out 27+ weeks, ±20% |
| 2 | `mean_spell_months` | `spell_months` ÷ the month-end unemployed | 4.6–6.9 | R2 KQ2: 24.8 weeks is 5.7 months (computed), ±20% |
| 2 | `stayer_cut_share` | `stayer_cuts` ÷ `stayers` | 0.016–0.024 | R2 KQ1: 2%, ±20%; tier 2 under closed money (Ruling 12) |
| 3 | `unemployment_sd` | the s.d. of u | 0.010–0.030 | BAM; under 0.010 trips Ruling 14 |
| 3 | `phillips` | corr(month-on-month growth of `wage_mean`, u) | −0.50 to −0.05 | BAM |
| 3 | `okun` | corr(month-on-month growth of units sold, the change in u) | −0.98 to −0.70 | BAM |
| 3 | `beveridge` | corr(month-end `vacancies` ÷ (employed + `vacancies`), u) | −0.65 to −0.10 | BAM |
| 3 | `size_skew` | the mean month-end skewness of firm sizes | 1–10 | BAM; Lengnick reports 1.88 (R2 KQ1) |
| 3 | `no_crisis` | `unemployment_sd` ≤ 0.10 and `unemployment_mean` < 0.90 | every seed | Mark-0 at Θ = 0 (Ruling 14) |
| — | `price_change_size`, `above_markup_share`, `visit_success` | `price_change_ppm` ÷ `price_changes`; `above_markup` ÷ firm-months; `hires` ÷ `job_visits` | reported | Rulings 13 and 15 |

- **Size skew:** take E = people − month-end `unemployed`, F firms and μ = E ÷ F. Then m2 = `size_squares` ÷ F − μ², m3 = `size_cubes` ÷ F − 3μ × `size_squares` ÷ F + 2μ³, and the skew is m3 ÷ m2^1.5.
- **Spells:** `spell_months` sums each unemployed person's whole months out so far, and `long_spells` counts those out 6 months or more. 27 weeks is 6.2 months (computed), and six whole months stands in for it (inference).

## Global Constraints

- **Git:** commit straight to `main` with `git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -- <paths>`, staging by path. The body's first line is `Task: M2.3 Calibration and design runner, task N: <title>`. Never push.
- **Checks while agents share the tree:** each task runs its own Vitest files and `pnpm eslint` on its own paths. The coordinator runs `pnpm test && pnpm lint && pnpm typecheck && pnpm depcruise` once each wave has committed.
- **`LENGNICK` stays byte-identical:** `goldens.json` is untouched, including the economy hash `6a652730`.
- **Determinism in `sim-core`:**
  - draw only through `draw1`–`draw4` and `keyedShuffle`; the new `LABOUR_DRAW` purposes are 4, the slow-searcher trait, and 5, a shock's order;
  - no `Math.random`, transcendental `Math`, `**`, clocks or `sort`;
  - money moves only through `transfer`, `issue` and `retire`, and rates only through `mulPpm` or `mulPpmUp`;
  - new code allocates nothing after `layoutWorld`.
- **Culture wall:** `labour/layoffs.ts` is guarded, so it imports module paths, never the barrel or `consumption/`.
- **`tools/cli`** isn't sim code and may allocate. Its output never depends on thread count, finish order, time or thread ids.
- **TypeScript:** erasable syntax only.

## Files and waves

| Task | Agent | Files |
| --- | --- | --- |
| 1 Flows and the city's mechanisms | `sim-engineer`, Sonnet | `packages/sim-core/src/economy/{stats,scratch,economy,params,city}.ts`, `src/firms/{decide,renew,produce}.ts`, `src/labour/{search,layoffs}.ts`, `src/index.ts`; `test/{economy,economy-layout,firms,labour,flow-log}.test.ts` |
| 2 The target suite | `sim-engineer`, Sonnet | `tools/cli/src/targets/{targets,summarize,judge,run}.ts`; `tools/cli/test/targets.test.ts` |
| 3 The design runner | `sim-engineer`, Sonnet | `tools/cli/src/design/{grid,cell,pool,worker,run}.ts`, `src/economy/{presets,run}.ts`, `src/main.ts`, `tools/cli/grids/smoke.json`; `tools/cli/test/{design,economy}.test.ts` |
| 4 Calibration | `sim-engineer`, Opus | `packages/sim-core/src/economy/city.ts`; `tools/cli/src/economy/run.ts`, `tools/cli/grids/*.json`; `tools/cli/test/city-targets.test.ts` |

No two tasks in a wave share a file:
- **Wave 1:** Tasks 1 and 2, two agents. Task 2 reads columns by the names above, so it needs none of Task 1's code.
- **Wave 2:** Task 3, once Tasks 1 and 2 have committed. It wires both commands into `main.ts`.
- **Wave 3:** Task 4 alone, on Opus, because tuning takes judgement.
- **Then testing,** below.

## Task 1: Flows and the city's mechanisms (`sim-engineer`, Sonnet)

**Goal:** every flow and measure is a column of the day's stats row, and `CITY`'s mechanisms run behind params whose off values leave `LENGNICK` unchanged.

- [ ] **The flow log,** `economy/stats.ts`:
  - the 29 slots in the schema's order, `STAT_NAMES` and `FLOW_LOG_SCHEMA = 1`, with a comment that any column change bumps it;
  - `clearFlows(stats)` replaces `clearDaySums` and `clearMonthSums`, and `recordFirms` adds the three new levels;
  - `recordMonth(world)` runs after `endMonth`. Each person's `spellMonths` counts the month ends in a row spent unemployed, saturating at 255, and resets to 0 in work. `spell_months` adds spellMonths − 1 for each unemployed person, and `long_spells` counts those whose spellMonths − 1 is 6 or more;
  - `recordYear(world)` runs at the end of each year's last day. A stayer's `employer` is 0 or more and equals `yearEmployer`. `stayers` counts them, and `stayer_cuts` those whose firm's `wage` is below its `yearWage`. It then copies `employer` into `yearEmployer` and each `wage` into `yearWage`.
- [ ] **Scratch,** `economy/scratch.ts`: `spellMonths` (`Uint8Array`) and `yearEmployer` (`Int32Array`, filled with −1 at creation) per agent, and `yearWage` (`Float64Array`) per firm, all for `stats.ts`. Also `exiting` (`Uint8Array`) per firm, written by `firms/renew.ts` and read by `labour/layoffs.ts`. The owner comments add that `renew.ts` reads `pay`.
- [ ] **The day,** `economy/economy.ts`: `economyDay(world, params, day, layoffs = 0)` runs, in order:
  1. `clearFlows`;
  2. `layOff(world, layoffs, day)` when `layoffs` is above 0;
  3. on day 0, `startMonth`;
  4. `shopDay`, then `produce`;
  5. on day 20, `endMonth`, then `recordMonth`;
  6. `recordDay`;
  7. on a year's last day, `recordYear`;
  8. the invariants, while `world.checks` is on.

  `endMonth` calls `layOffExiting(world)` right after `closeFirmMonth`.
- [ ] **Params,** `economy/params.ts`:
  - `stockHighPpm` becomes the excess over 1 (Ruling 7), and `LENGNICK` gives 0;
  - new fields `slowSearcherPpm`, `slowJobSearches`, `shortPayExitPpm` and `markupClamp`, with `LENGNICK` values 0, 5, 0 and 0;
  - `checkParams` requires `slowJobSearches` from 1 to `jobSearches`, and `markupClamp` of 0 or 1;
  - `economy-layout.test.ts`'s params literal follows.
- [ ] **`CITY`,** `economy/city.ts`: every field written out, with the presets table's values and a one-line source comment on each changed field. `index.ts` exports it, and `random/shuffle.ts` for the runner.
- [ ] **Firms:**
  - `decide.ts`: high = demand + `mulPpmUp(demand, stockHighPpm)`. With `markupClamp` 1, a rise stops at floor((wage + `mulPpm(wage, markupHighPpm)`) ÷ `unitsPerMonth`), and a cut at ceil((wage + `mulPpmUp(wage, markupLowPpm)`) ÷ `unitsPerMonth`), both before the cost floor. `unitsPerMonth` is 21 × `unitsPerWorkerDay`, 63 in both presets. After repricing, `above_markup` counts firms whose `unitsPerMonth` × price exceeds wage + `mulPpm(wage, markupHighPpm)`.
  - `renew.ts`: every exit adds the firm's stock to `write_off` before `reenter`. A firm with workers whose `pay` is below `mulPpm(wage, shortPayExitPpm)` exits too. `exiting` is written for every firm at each month end, 1 for these exits.
  - `produce.ts`: `produced` adds the units made.
- [ ] **Labour:**
  - `search.ts`: an unemployed person is slow when `draw2(seed, LABOUR_DRAW, person, 4) % PPM < slowSearcherPpm`, skipping the draw at a share of 0. A slow person visits up to `slowJobSearches` firms, and everyone else up to `jobSearches`. Each visit adds 1 to `job_visits`.
  - `layoffs.ts`, new: `layOffExiting(world)` lays off everyone whose employer is marked in `exiting`, adds them to `firings` and zeroes those firms' `employees`. It skips the household pass when no firm is marked.
  - `layOff(world, count, day)` shuffles everyone with `keyedShuffle(order, people, seed, LABOUR_DRAW, day, 5)`. It lays off the first `count` employed people in that order, or every one if fewer, adding them to `firings`.
- [ ] **Check:**
  - `economy.test.ts`: "keeps the month's sums to the month" becomes "clears every flow each morning". A day 0's hires and price changes are gone the next day, while the levels stay.
  - `flow-log.test.ts`, new: `CITY` at 1,000 people, 3 seeds × 2,500 days, laying off 50 people on day 1,000 and 30 on day 1,050, a day 0. Every day from day 1:
    - the fall in `unemployed` equals `hires` − `firings`;
    - the rise in household cash equals `wage_bill` + `profits_paid` + `issued` − `sales_cents`, and firm cash rises by `sales_cents` − `wage_bill` − `profits_paid`;
    - the rise in `stock` equals `produced` − `sales_units` − `write_off`;
    - `taxes` is 0.
  - `firms.test.ts`:
    - a short-paying firm exits at 1,000,000 ppm and not at 0. Its workers become unemployed and count as firings, its stock is written off, and every balance is unchanged;
    - the clamp stops a rise at the ceiling and a cut at the floor, and with `markupClamp` 0 the old overshoot remains;
    - `LENGNICK`'s stock band still tops out at one month's demand.
  - `labour.test.ts`: a slow searcher makes at most `slowJobSearches` visits, and the trait keys on the person and purpose 4 alone. `layOff` lays off exactly `count`, the same people for the same seed and day, and every employed person when `count` is larger.
  - `recordMonth`'s spells and `recordYear`'s stayers and cuts on small hand-built worlds, across two year ends.
  - `pnpm vitest run packages/sim-core tools/cli/test/economy.test.ts`, including `goldens.test.ts` with `goldens.json` unchanged; `pnpm depcruise`; `pnpm eslint packages/sim-core`. Task 2 is editing other `tools/cli` tests meanwhile, so run only that one.
- [ ] Commits:
  - `feat(sim-core): log every economy flow as the day's sum`;
  - `feat(sim-core): add the city preset's exits, clamp and slow searchers`.

## Task 2: The target suite (`sim-engineer`, Sonnet)

**Goal:** a run's folder becomes a table of targets, each judged over seeds.

- [ ] `targets/targets.ts`: `TARGETS`, one row per target: id, tier, band and source, as the targets table gives, plus the three reported measures.
- [ ] `targets/summarize.ts`: `summarize(columns, meta)` returns one seed's value for every target. It reads named `Float64Array` columns and meta's `size`, `params.firms`, `params.openingPrice`, `warmUpDays` and `days`. It is pure, with no file access.
- [ ] `targets/judge.ts`: `judge(values, low, high)` returns the verdict, n, mean, interval, median, minimum and maximum, by Ruling 10.
  - The t quantile is z + (z³ + z) ÷ 4ν + (5z⁵ + 16z³ + 3z) ÷ 96ν², with z = 1.6448536. From ν = 19 it is within 0.0001 of the exact value (computed).
  - Under 20 values the verdict is "medians only". `no_crisis` holds when it is true on every seed.
- [ ] `targets/run.ts`: `runTargets(args)` for `targets <dir> [--filter]`.
  - It reads each cell's `meta.json` and the columns it needs.
  - It groups cells by point, size, police share and shock, and prints a table per group: target, tier, band, median and range, mean and interval, and verdict.
  - With `--filter` (Ruling 12), each point's median over its seeds is checked. A point passes when every tier-1 median is in its band.
  - It then prints the share that passes, the tier-1 targets no point meets, and the 10 passing points with the lowest tier-2 score, with their params. The score sums, over tier-2 targets, each median's distance outside its band ÷ the band's width. Ties go to the lower point.
- [ ] **Check,** `tools/cli/test/targets.test.ts`:
  - `summarize` returns the known rates of synthetic columns exactly, for every target, the window and the year ends;
  - `judge` gives holds, fails and inconclusive on built samples, t within 0.0005 of 1.7291 and 1.6766 at ν = 19 and 49, and medians only under 20 values;
  - `runTargets` on a temporary folder of synthetic cells prints each verdict, and `--filter` passes and ranks synthetic points as expected;
  - `pnpm vitest run tools/cli/test/targets.test.ts` and `pnpm eslint tools/cli`.
- [ ] Commit `feat(cli): judge design runs against the economy targets`.

## Task 3: The design runner (`sim-engineer`, Sonnet)

**Goal:** `design` runs a grid on any number of threads and writes the same bytes.

- [ ] `economy/presets.ts`: `PRESETS`, with `lengnick` and `city`. In `economy/run.ts`, the CSV's columns become `STAT_NAMES`, and `economy.test.ts`'s header follows.
- [ ] `design/grid.ts` parses a grid, with errors that name the field, and lists its cells in a fixed order.
  - It refuses `lhs` with a spawn start, sizes that aren't multiples of 1,000 up to 100,000, a shock day outside the run, and params that fail `checkParams`.
  - **The Latin hypercube:** knob j, in the ranges' order, gets `keyedShuffle(perm, n, lhs.seed, S, j, 0)` over 0 to n − 1, where S is a stream constant of the runner's own.
  - Point i takes lo + floor((perm[i] + u) × (hi − lo + 1) ÷ n), with u = `draw3(lhs.seed, S, j, i, 1)` ÷ 2³².
- [ ] `design/cell.ts`: `runCell(cell, record)`.
  - The tier is the smallest whose `TIER_AGENTS` holds the size, and the params get `households` = size and `firms` = size ÷ 10.
  - **Spawn:** `layoutWorld` at that tier, then `spawnFromLedger` with R* scaled by size ÷ 1,000, `createStandInHomes(world.ground, ceil(size ÷ 3))` and settlement and day 0. Scaling multiplies every record field but price and wage.
  - **Hand:** `createWorld(seed, tier, undefined, size)`, then `startEconomy`.
  - Each day it calls `economyDay(world, params, day, layoffs on the shock's day, else 0)` and copies the stats row into the columns. `world.checks` stays on, since the CLI counts as development (sim-core rules).
  - It writes `day`, `district` and every `STAT_NAMES` column, then `meta.json`.
- [ ] `design/pool.ts` and `design/worker.ts`:
  - The main thread computes R* once (Ruling 16) and reads the commit from `git rev-parse HEAD`, or writes "unknown".
  - It hands cells, largest first, to `--threads` workers. The default is `availableParallelism()` − 1, at least 1.
  - Each worker runs `runCell` and writes its own folder. A worker's error ends the run with exit code 1.
- [ ] `design/run.ts` and `main.ts`: `design --grid <file> --out <dir> [--threads N]`, and `targets` through Task 2's `runTargets`. Each cell's sim days per second go to stderr, never to a file.
- [ ] `grids/smoke.json`: `lengnick`, spawn, seeds 1 and 2, sizes 1,000 and 3,000, no shock and 5 points on day 30, and 63 days.
- [ ] **Check,** `tools/cli/test/design.test.ts`:
  - `design runner is deterministic`: `smoke.json`, and a hand-start copy the test writes, give byte-identical folders, `meta.json` included, on `--threads 1` and `--threads 4`;
  - each column holds the stats rows that a plain `economyDay` loop gives for the same cell;
  - grid errors name their field, and a 10-point hypercube over two ranges puts one point in each tenth of each range;
  - `pnpm vitest run tools/cli`, `pnpm eslint tools/cli` and `pnpm typecheck`.
- [ ] **Report, without asserting:** sim days per second at 1,000, 3,000, 10,000, 30,000 and 100,000 people, one seed over 2,100 days, with the Node version and machine. The coordinator writes them into task.md, and they size a future nightly slice.
- [ ] Commit `feat(cli): run economy design grids across worker threads`.

## Task 4: Calibration (`sim-engineer`, Opus)

**Goal:** `CITY`'s tuned values and measured burn-in, then one confirmation on fresh seeds, with every miss reported.

- [ ] `economy/run.ts` gains `--preset <name>`, defaulting to `lengnick`. Commit `feat(cli): pick the economy command's preset by name`.
- [ ] **Grids,** in `tools/cli/grids/`:
  - `sweep.json`: `city`, hand start, 1,000 people, seeds 1–5, 12,100 days with a warm-up of 10,000, and a 300-point hypercube over the presets table's seven ranges;
  - `refine.json`: the chosen point on seeds 1–20, over the same days;
  - `confirm-city.json` and `confirm-lengnick.json`: seeds 1001–1050, hand start, 1,000 people, warm-up `burnInDays`, then 100 months (2,100 days) from the next month start;
  - `design.json`: `city`, spawn, seeds 1–10 and all five sizes, police share 0. The shocks are none, and 5 points at the first month start past `burnInDays` + 2,100, with the run going 2,100 days past the shock.
- [ ] **Sweep:** `design --grid tools/cli/grids/sweep.json --out dist/design/sweep`, then `targets dist/design/sweep --filter`. Report the passing share and the tier-1 targets no point meets. Under 0.5% passing, stop and report (Ruling 12).
- [ ] **Refine** the best passing point on seeds 1–20. If any tier-1 target doesn't hold, try the next. Single-knob nudges stay inside the sweep's passing region, each recorded with its reason.
- [ ] **Freeze `CITY`** in `economy/city.ts`, each tuned value with a one-line "why" that names its trade-off.
- [ ] **Burn-in:** `node tools/cli/src/main.ts economy --preset city --burn-in --seeds 5 --seed 1 --days 40000` (Ruling 18), then write `CITY.burnInDays` with a "measured here" comment giving the seeds, the run length, the Node version and the date. If a truncation falls in the second half, stop and report. Commit `feat(sim-core): calibrate the city preset`.
- [ ] **Confirm once:** run both confirmation grids and `targets` on each. Never change `CITY` after seeing them; a re-tune confirms on seeds 2001–2050.
- [ ] **The long test,** `tools/cli/test/city-targets.test.ts`, under `ECONOMY_LONG=1`, runs `confirm-city.json` and judges it.
  - Every tier-1 target holds, except the confirmation's gaps, each listed in the test with its measured verdict and a one-line reason.
  - `no_crisis` holds on every seed.
  - Commit it with the grids: `test(cli): judge the city preset on fresh seeds`.
- [ ] **Report to the coordinator,** for task.md:
  - both presets' tables: median, range and verdict per target;
  - each knob's trade-off and each documented gap;
  - `unemployment_sd` against Ruling 14's trigger;
  - what became of each M2.1 flag.

## Testing last

After Task 4 commits, one pass:
1. **`economy-review`** over Tasks 1 and 4, with the `/determinism-review` checklist on `sim-core`'s diff. It checks:
   - money and goods balancing through exits, write-offs and shocks;
   - the slow-searcher trait's independence from look and culture;
   - the calibration against R2's table, and each documented gap's reasoning.
2. **`senior-qa`** proves every done-check by running it:
   - `pnpm test && pnpm lint && pnpm typecheck && pnpm depcruise`;
   - `ECONOMY_LONG=1 pnpm vitest run packages/sim-core tools/cli`;
   - the runner's thread test, and the goldens unchanged;
   - `pnpm --filter @nomos/bench budget` and `alloc`, to show no tick budget moved.

Then each task's agent re-tests only what the pass flags. The coordinator fills in `milestone.md` and writes the checkpoint.

## `interfaces.md` changes

For the coordinator to apply.

1. **The economy:**
   - `economyDay(world, params, day, layoffs = 0)`: `layoffs` people lose their jobs at the day's start, a scenario input for headless runs until the economy joins the step.
   - `CITY` joins `LENGNICK`, in `economy/city.ts`. `EconomyParams` gains `slowSearcherPpm`, `slowJobSearches`, `shortPayExitPpm` and `markupClamp`, and `stockHighPpm` becomes the excess over one month's demand.
   - Stats put levels first, then each flow as the day's sum (`clearFlows`). `STAT_NAMES` names the 29 slots as flow-log schema 1, `firings` counts every layoff, and `recordMonth` and `recordYear` join `recordDay`.
   - A firm that can't pay `shortPayExitPpm` of its wage exits, and every exit writes its stock off.
   - Layout: `economy/` gains `city.ts`, and `labour/` gains `layoffs.ts`. The barrel exports `random/shuffle.ts`.
   - Scratch gains `spellMonths` and `yearEmployer` per agent, and `yearWage` and `exiting` per firm: 5 bytes an agent and 9 a firm, outside the hash.
   - `LABOUR_DRAW` gains purposes 4, the slow-searcher trait, and 5, a shock's order.
   - Hashes don't move, and `goldens.json`'s economy hash stays `6a652730`.
   - The call auction stays unwired until M2.4 (Ruling 3).
2. **Layout, `tools/cli/src`:** `main.ts`; `economy/` (`run.ts`, `presets.ts`); `design/` (`grid.ts`, `cell.ts`, `pool.ts`, `worker.ts`, `run.ts`); `targets/` (`targets.ts`, `summarize.ts`, `judge.ts`, `run.ts`). Grids live in `tools/cli/grids/`.
3. **Packages:** `@nomos/cli`'s role adds the economy's design runner and target suite.
4. **A new section, "The design runner (owner: M2.3)":**
   - this plan's grid schema, cell names and folder layout;
   - columns of little-endian Float64, a row a day per district, with one district until M3.1;
   - schema 1 is `day`, `district` and `STAT_NAMES`;
   - police share does nothing until M4, and taxes stay 0 until M5;
   - output never depends on thread count;
   - `targets <dir> [--filter]` judges a folder.
