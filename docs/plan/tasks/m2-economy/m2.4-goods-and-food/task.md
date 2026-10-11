# M2.4 Goods and food

Part of [M2 Economy](../milestone.md). It runs in two parts: Part 1, the visible cut the owner asked for on 11 October 2026, then Part 2, the rest.

- **Builds, Part 1** (owner request, R6):
  - seven goods, one to each supplier link: bread, vegetables, fish and milk as food in portions, and cloth, tools and fuel in units, with each firm selling one in exact shares and keeping Lengnick's price rule for it;
  - food dated by the day it was made, in a 16-day ring per shop, sold oldest first and spoiled at the day's start after 3–14 days on sale;
  - 3 portions a day for every blob, bought before other goods from a month's set-aside, with each portion it can't afford or find logged as unmet for M3's needs system;
  - food shops that hire when they run short and shed a worker after wasting a worker-month of output;
  - each good's daily sales, stock, price and spoilage, and food eaten and short, in the flow log, the feed and the economy panel, with trades that name the good and the shop.
- **Builds, Part 2:**
  - one of eight sectors per firm (grain, fresh food, timber, stone, metal, fuel, wares, services), with an integer recipe of at most two inputs, one output and worker-days per batch (R6);
  - the wholesale call auction once per tradable good, never for services, with unmet demand per good logged for the needs system (R6);
  - household baskets per good, seeded from ICP 2021 shares by development preset (food 45 / 33 / 19 / 9% of consumption) with the Stone–Geary rule (R6);
  - shops stocked with dated food lots in six categories (≤ 32 per shelf), sold first-expiry-first, with expired lots moved to per-category waste counters only at the day boundary (R6);
  - food priced as base × grade (100 / 135 / 180%) × freshness (100% fresh, 75% stale, 50% last day) in integer cents, flooring after each multiply, with markdown sales and waste logged per category (R6);
  - food grade chosen from the household's consumption budget per adult relative to the price index, never from a wealth band, with food value kept as a memo line outside net worth and tax bases (R6).
- **Needs:** for Part 1, M2.3's `CITY` and M2.2b's town, feed and panel; for Part 2, Part 1, and M0.3's day slices with the owner's late-spoilage ruling, `skip-expired` (round 6 conflict e, decided 8 October 2026). The needs system that reads unmet demand arrives in M3.
- **Exit checks, Part 1:**
  - in portions, every day and exactly, each food's made = sold + spoiled + Δstock, and eaten = food sold (R6's identity, without trade or in-transit);
  - `LENGNICK` replays unchanged: the economy golden `6a652730`, `42/phone` `746a06a3`, the other tick goldens and the 20 spawn hashes hold, and `{ ...CITY, goods: 0 }` matches M2.3's `CITY` exactly;
  - a ticked goods town matches `economyDay` on a twin;
  - on 50 fresh seeds, `CITY`'s tier-1 targets hold or are recorded here as gaps, with food's share of spending reported against ICP's upper-middle 18.6%, and the shares of food spoiled and short reported;
    - Met by `city-targets.test.ts` (2a0950b) under `ECONOMY_LONG=1`: seeds 2001–2050, 100 months after the 29,865-day burn-in, with the goods on and the city's exits off. It passes in 3 min 41 s (measured here, 11 October 2026).
    - All six tier-1 targets hold, so no tier-1 gap is recorded, and `CITY` was not changed after the result.
    - Food is 17.4% of spending against ICP's 18.6%. 2.2% of the food made spoils, and 3.0% of the portions wanted go short.
    - Okun (tier 3) now misses at −0.62, and size skew is inconclusive at 0.94. Both are under Results, below.
  - the panel shows the day's goods and the food chart after Play, and axe passes.
- **Exit checks, Part 2:**
  - in portions, every day and exactly: produced + imported = eaten + spoiled + exported + pre-retail loss + Δstock + Δin-transit, and city-preset shops spoil 0.5–3% of throughput (R6);
  - swapping the lot layout (packed against field arrays) leaves state hashes identical (R6).

## Results, Part 1 (11 October 2026)

All figures are measured here, with Node 24.18.0 on a Ryzen 5 3600 (Windows 10, 6 cores), unless marked. CPU load was 1% before the runs (`wmic`, since Windows has no load average). Rates are per 21-day month, and yearly figures per 112-day year.

### The confirmation, seeds 2001–2050

All six tier-1 targets hold on 50 seeds, and `CITY` was not changed after the result. Part 1 records no tier-1 gap.

- **Seeds:** `confirm-city.json` as committed, 2001–2050. M2.3 confirmed its no-goods city on the same seeds, but the goods city was never tuned on them: `CITY` is unchanged since `fd6664d`, and the 10-seed probe on 2001–2010 was a look only.
- **The run:** commit `2a0950b`, goods on, exits off, a 29,865-day burn-in, then the 100 months to day 31,983. Each cell is the median over 50 seeds, the range in brackets, then the verdict: the 90% t-interval of the mean against the band ([M2.3 Ruling 10](../m2.3-calibration-and-design-runner/plan.md#rulings)). The test ran on a clean tree. Other agents edited `spawn/` and `step/warm.ts` during the table run, off the hand-start path, and a re-run of seeds 2001 and 2050 matched the saved columns byte for byte.
- **The last column** is M2.3's city, without goods, on the same seeds, as [its task](../m2.3-calibration-and-design-runner/task.md) recorded it. `LENGNICK` isn't run again: goods are off in it, and its goldens hold.

| Tier | Target | Band | `CITY`, goods on | Verdict | M2.3's `CITY` |
| --- | --- | --- | --- | --- | --- |
| 1 | `price_change_share` | 0.09–0.12 | 0.0944 (0.0797–0.107) | holds | 0.108 |
| 1 | `job_finding` | 0.208–0.312 | 0.246 (0.230–0.267) | holds | 0.262 |
| 1 | `unemployment_mean` | 0.04–0.09 | 0.0694 (0.0625–0.0767) | holds | 0.0765 |
| 1 | `markup` | 1.36–1.50 | 1.492 (1.483–1.501) | holds | 1.493 |
| 1 | `stock_months` | 0.8–1.6 | 0.907 (0.852–0.970) | holds | 0.891 |
| 1 | `price_ratio` | 0.25–4 | 1.053 (1.047–1.061) | holds | 0.980 |
| 2 | `hires_rate` | 0.0264–0.0396 | 0.0434 (0.0404–0.0452) | fails | 0.0493 |
| 2 | `layoff_rate` | 0.008–0.012 | 0.0181 (0.0166–0.0199) | fails | 0.0216 |
| 2 | `job_to_job` | 0.01–0.02 | 0.0251 (0.0216–0.0276) | fails | 0.0276 |
| 2 | `exit_rate` | 0.0145–0.0165 | 0 (0–0.0012) | fails | 0 |
| 2 | `long_spell_share` | 0.216–0.324 | 0.198 (0.152–0.226) | fails | 0.172 |
| 2 | `mean_spell_months` | 4.6–6.9 | 3.52 (2.76–4.12) | fails | 3.12 |
| 2 | `stayer_cut_share` | 0.016–0.024 | 0.147 (0.126–0.168) | fails | 0.146 |
| 3 | `unemployment_sd` | 0.010–0.030 | 0.0107 (0.0080–0.0232) | holds | 0.0110 |
| 3 | `phillips` | −0.50 to −0.05 | −0.286 (−0.489 to 0.132) | holds | −0.261 |
| 3 | `okun` | −0.98 to −0.70 | −0.622 (−0.729 to −0.451) | fails | −0.806 |
| 3 | `beveridge` | −0.65 to −0.10 | −0.461 (−0.735 to −0.074) | holds | −0.426 |
| 3 | `size_skew` | 1–10 | 0.938 (0.397–2.43) | inconclusive | 0.840 |
| 3 | `no_crisis` | every seed | every seed | holds | every seed |
| — | `price_change_size` (ppm) | reported | 10,200 (9,713–10,540) | — | 10,175 |
| — | `above_markup_share` | reported | 0.327 (0.244–0.438) | — | 0.226 |
| — | `visit_success` | reported | 0.0864 (0.0799–0.0935) | — | 0.0918 |
| — | `food_share` | reported | 0.174 (0.172–0.176) | — | no food |
| — | `spoil_share` | reported | 0.0221 (0.0178–0.0279) | — | no food |
| — | `unmet_share` | reported | 0.0302 (0.0246–0.0358) | — | no food |

### The three food shares

- **Food is 17.4% of spending** (17.2–17.6% over the seeds), against ICP 2021's upper-middle 18.6% (opened, [Ruling 1](plan.md#rulings)). That is 1.2 points under, and under Ruling 1's computed 18.1%. The 3.0% of portions that go unmet would take 18.1% to about 17.7% (computed, with goods spending held fixed), which explains part of the gap.
- **2.2% of the food made spoils** (1.8–2.8%), inside R6's 0.5–3% on all 50 seeds. The risk that Part 1's shops would waste about 5% (inference, in [the plan's risks](plan.md#tasks)) didn't show in the 1,000-person city. Highcourt's shops weren't measured.
- **3.0% of the portions wanted go short** (2.5–3.6%). The log doesn't say whether a blob couldn't pay or the shop had none.

### Ruling 14's trigger

The city's median s.d. of monthly unemployment is 0.0107, over BAM's 0.010 floor, so the credit line stays unbuilt. The margin is 0.0007, down from M2.3's 0.0010, and 17 of the 50 seeds sit under the floor.

### Part 1's documented gaps

- **Okun, −0.62 against −0.98 to −0.70 (tier 3, new):** M2.3's city held it at −0.81.
  - `produced` counts goods alone ([Ruling 4](plan.md#rulings)), and the four foods hold about 18% of jobs.
  - Counting food at 6 portions to the unit, since a worker-day makes 18 portions or 3 units, Okun is −0.82 and all 50 seeds sit in the band (a scratch recomputation from the logged columns, not committed).
  - So the miss lies in what `produced` counts, not in the cycle (inference). Counting food in the target would change the target, so the coordinator decides.
- **Size skew, 0.94 against 1–10 (tier 3):** now inconclusive, since the mean's interval, 0.89–1.05, straddles the floor. 32 of 50 seeds sit under 1. M2.3's 0.84 failed, and the cause is still unknown.
- **Prices change in 9.4% of firm-months (tier 1, holds):** the thinnest tier-1 margin. The mean's interval, 0.0935–0.0963, clears the 0.09 floor by 0.0035, and 10 of 50 seeds sit under it (M2.3: 10.8%). A food firm reads its price signal from short and long (a day's demand in stock, a worker-month wasted), not from the stock band, which may lower the share (inference).
- **Tier 2, all seven still miss,** as in M2.3. Hires, layoffs, job-to-job moves, long spells and mean spells moved nearer their bands. Pay cuts stay at 14.7% of stayers a year, the closed-money gap.
- **Exits, 0.013% of firm-months against 1.45–1.65%:** M2.3's city had none. Short-pay exits are still off, so these are 64 exits in 15 of the 50 seeds, by firms leaving after 3 months with no workers and no demand (`firms/renew.ts`). Entry still needs a design ([M2.3 Ruling 19](../m2.3-calibration-and-design-runner/plan.md#rulings)).

### Run times

- **The test:** `city-targets.test.ts` under `ECONOMY_LONG=1` passed 14 tests in 220 s of test time (3 min 41 s wall) on 2 threads, against M2.3's 74 s. The run is 1.56 times M2.3's days, and goods halve the speed, so about 3 times the time (computed).
- **The table:** `design` on the same grid took 3 min 37 s wall and wrote 998 MB, 50 cells of 82 files, and `targets` judged it in 1.7 s. A cell ran at a median of 3,778 sim days a second (3,493–4,016), against M2.3's 7,774 without goods. The output is in `dist/design/confirm-goods-2001`, with the table beside it in `confirm-goods-2001.txt` (both gitignored).
