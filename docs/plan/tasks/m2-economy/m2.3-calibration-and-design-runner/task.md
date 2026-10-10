# M2.3 Calibration and design runner

Part of [M2 Economy](../milestone.md).

- **Builds:**
  - two presets: an exact Lengnick replication, and a city preset with shop markups of 1.36–1.50 over wholesale and 0.8–1.6 months of stock (R2);
  - a log of the share of firm visits that find an acceptable vacancy, π raised toward 0.3–0.6 if job-to-job moves fall short, and workers who differ, so that long unemployment spells occur (R2);
  - a firm credit line as a slider, only if cycles prove too mild, tested against both Mark-0 phase tables (R2);
  - daily flow logs per district in headless runs (hires, separations, wage bill, consumption, repricing share and size, vacancies, firm entries and exits, taxes), and a headless design runner over seeds × city sizes (1,000–100,000 agents) × police shares × unemployment shocks, writing columnar logs (R4).
- **Needs:** M2.2's spawn for the city sizes. The runner's police-share axis does nothing until M4 adds police, and taxes stay at zero until M5 adds the treasury.
- **Exit checks:**
  - the economy targets hold: prices change in 9–12% of months, about 2% of job-stayers see a pay cut a year, about 26% of the unemployed find work each month, plus the BAM bands and the Mark-0 phase table (R2).
    - Met by `city-targets.test.ts` (aa0ae7e) under `ECONOMY_LONG=1`, on the re-confirmation after the review's re-tune: seeds 2001–2050, 100 months after the 18,428-day burn-in, with the city's exits off ([Ruling 19](plan.md#rulings)). It passes in 74 s (measured here, 10 October 2026).
    - Prices change in 10.8% of firm-months, and 26.2% of the unemployed find work each month. Both hold.
    - **The pay cut is now a tier-2 documented gap** (coordinator, 10 October 2026; [Ruling 12](plan.md#rulings)). 14.6% of stayers see a cut a year.
      - Under closed money, cuts must balance raises. R2's 2% comes from the US, where stayers' wages grow about 3.6% a year.
      - Revisit it when M5's treasury brings inflation.
    - BAM's bands: unemployment's mean (7.6%), its s.d. (0.0110), Phillips (−0.26), Okun (−0.81, on units produced) and Beveridge (−0.43) hold. Firm-size skew (0.84) is a gap, below.
    - Mark-0 at Θ = 0: no crisis on any seed. Ruling 14's trigger doesn't trip, so the credit line stays unbuilt (below).

## Results (10 October 2026)

All figures are measured here, with Node 24.18.0 on a Ryzen 5 3600. Rates are per 21-day month, and yearly figures per 112-day year.

### The calibration path

1. **Sweep:** 300 Latin-hypercube points over seven knobs, each run on seeds 1–5 for 12,100 days and measured after day 10,000.
   - No point passed tier 1, so Ruling 12's 0.5% rule stopped the sweep. It took 6 min 58 s on 11 threads.
   - The pay-cut target can't coexist with unemployment's band. Every point with unemployment at or under 9% had cuts of 10.4% or more.
   - The coordinator then moved the pay-cut target to tier 2 (Ruling 12).
2. **Refine,** on seeds 1–20:
   - The nine points that met every other tier-1 target were re-run at θ 0.2, with exit lines of 300k, 350k and 400k ppm.
   - Four of those 27 held all six tier-1 targets, and point 232 at 300k scored best.
   - θ 0.22 then cut its tier-2 score from 25.2 to 21.5. β 6 (28.2) and an exit line of 275k (23.2) were tried and dropped.
3. **Burn-in:** 17,295 days, from a 40,000-day MSER-5 run, since 20,000 days were too short ([Ruling 18](plan.md#rulings)). Step 5 measured it again.
4. **Confirmation:** run once on seeds 1001–1050, after `CITY` was committed (bfe549b). All six tier-1 targets held. The review then changed `CITY` (step 5), so the city's final confirmation is on fresh seeds.
5. **The review's re-tune:** the M2.3 review found a loop in the city's exits ([Ruling 19](plan.md#rulings)).
   - Exits went off in `CITY`. On seeds 1–20, all six tier-1 targets still held.
   - The burn-in was measured again over 40,000 days, with exits off: 18,428 days, up from 17,295.
   - The re-confirmation ran once on seeds 2001–2050, after `CITY` was committed (aa0ae7e). All six tier-1 targets hold, and `CITY` didn't change afterwards.
   - The review's other fixes: a hire now ends a spell count; `slowJobSearches` is checked only when some people are slow; Okun is measured on units produced; and `design` refuses an `--out` folder that holds files and runs two threads by default off CI.

### The city's knobs and their trade-offs

| Knob | `LENGNICK` | `CITY` | Trade-off |
| --- | --- | --- | --- |
| θ, `priceChancePpm` | 750,000 | 220,000 | Prices change in 10.8% of firm-months. A probe at θ 0.14 (γ 24, seeds 1–5) changed 6.2% and pushed the markup to 1.506, past the band. |
| γ, `wageCutMonths` | 24 | 25 | Fewer cuts need more unemployment under closed money. In the sweep, cuts of 3.5% or less came with unemployment of 15.4% or more. |
| π, `onJobSearchPpm` | 100,000 | 127,732 | Point 232's value. Job-to-job moves track γ more than π: rank correlations −0.71 and +0.29 over the sweep. |
| β, `jobSearches` | 5 | 5 | β 6 lowered unemployment to 8.2% on seeds 1–20, but raised exits to 2.9%. |
| `slowSearcherPpm`, `slowJobSearches` | 0, 5 | 227,437, 1 | 23% slow searchers lengthen spells. More raise unemployment (sweep rank correlation +0.30), which already ends months near 8%. |
| `shortPayExitPpm` | 0 | 0 | Off until entry is designed (Ruling 19). At 300,000, exits ran 1.9% of firm-months on seeds 1001–1050, and on seed 1001, 98% of them were repeats (measured by the review). |
| `burnInDays` | 9,893 | 18,428 | Ruling 18. With exits off, the price's MSER-5 cut moved from 11,530 to 12,285 days. |

The stock band (0.8–1.6 months), the markup band (1.36–1.50, clamped) and the 3,200-cent opening price are the plan's, from R2 KQ3, and weren't swept.

### The confirmation, seeds 2001–2050

Each cell is the median over 50 seeds, the range in brackets, then the verdict: the 90% t-interval of the mean against the band (Ruling 10). `CITY` ran on seeds 2001–2050, with its exits off and the 18,428-day burn-in. `LENGNICK` is the replication, tuned to none of these bands, so its misses are expected. It ran on seeds 1001–1050 again, with the fixed spell counter and Okun measure: Okun moved from +0.135 to −0.761, and the spell columns didn't move at this precision.

| Tier | Target | Band | `CITY` | Verdict | `LENGNICK` | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `price_change_share` | 0.09–0.12 | 0.108 (0.094–0.123) | holds | 0.186 (0.166–0.209) | fails |
| 1 | `job_finding` | 0.208–0.312 | 0.262 (0.247–0.281) | holds | 0.320 (0.304–0.340) | fails |
| 1 | `unemployment_mean` | 0.04–0.09 | 0.0765 (0.0703–0.0822) | holds | 0.0371 (0.0326–0.0427) | fails |
| 1 | `markup` | 1.36–1.50 | 1.493 (1.487–1.498) | holds | 1.162 (1.159–1.165) | fails |
| 1 | `stock_months` | 0.8–1.6 | 0.891 (0.855–0.925) | holds | 0.438 (0.408–0.460) | fails |
| 1 | `price_ratio` | 0.25–4 | 0.980 (0.975–0.986) | holds | 1.201 (1.194–1.209) | holds |
| 2 | `hires_rate` | 0.0264–0.0396 | 0.0493 (0.0475–0.0516) | fails | 0.0371 (0.0353–0.0395) | holds |
| 2 | `layoff_rate` | 0.008–0.012 | 0.0216 (0.0198–0.0238) | fails | 0.0124 (0.0112–0.0138) | fails |
| 2 | `job_to_job` | 0.01–0.02 | 0.0276 (0.0236–0.0304) | fails | 0.0249 (0.0230–0.0278) | fails |
| 2 | `exit_rate` | 0.0145–0.0165 | 0 (0–0), off | fails | 0 (0–0.0009) | fails |
| 2 | `long_spell_share` | 0.216–0.324 | 0.172 (0.129–0.200) | fails | 0.0387 (0.0248–0.0591) | fails |
| 2 | `mean_spell_months` | 4.6–6.9 | 3.12 (2.54–3.61) | fails | 1.55 (1.38–1.75) | fails |
| 2 | `stayer_cut_share` | 0.016–0.024 | 0.146 (0.122–0.157) | fails | 0.157 (0.144–0.170) | fails |
| 3 | `unemployment_sd` | 0.010–0.030 | 0.0110 (0.0070–0.0154) | holds | 0.0069 (0.0048–0.0090) | fails |
| 3 | `phillips` | −0.50 to −0.05 | −0.261 (−0.442 to 0.099) | holds | −0.165 (−0.395 to 0.038) | holds |
| 3 | `okun` | −0.98 to −0.70 | −0.806 (−0.869 to −0.729) | holds | −0.761 (−0.822 to −0.643) | holds |
| 3 | `beveridge` | −0.65 to −0.10 | −0.426 (−0.623 to −0.058) | holds | −0.295 (−0.518 to −0.095) | holds |
| 3 | `size_skew` | 1–10 | 0.840 (0.401–1.95) | fails | 0.382 (0.017–0.876) | fails |
| 3 | `no_crisis` | every seed | every seed | holds | every seed | holds |
| — | `price_change_size` (ppm) | reported | 10,175 (9,848–10,597) | — | 10,164 (9,767–10,402) | — |
| — | `above_markup_share` | reported | 0.226 (0.144–0.316) | — | 0.665 (0.612–0.706) | — |
| — | `visit_success` | reported | 0.0918 (0.0832–0.0992) | — | 0.0758 (0.0710–0.0815) | — |

The two confirmations took 73 s for the city and 46 s for the replication, on 2 threads each (Node 24.18.0, load not recorded).

### Ruling 14's trigger

- The city's median s.d. of monthly unemployment is 0.0110 on seeds 2001–2050, over BAM's 0.010 floor, so cycles aren't too mild and the credit line stays unbuilt.
- The margin is 0.0010. `LENGNICK`'s 0.0069 would trip it, but Ruling 14 judges the city.

### The city's documented gaps

- **Hires, 4.9% a month against 2.6–4.0%:** they mirror separations, with layoffs (2.2%) and job-to-job moves (2.8%) adding up to about 4.9% (computed).
- **Layoffs, 2.2% against 0.8–1.2%:** 20% of firm-months end above the stock band's top, and each fires one worker (measured here, seed 1, before the exits went off).
- **Job-to-job moves, 2.8% against 1–2%:** 42.9% of the employed are paid under their reservation wage (measured by the M2.3 review, before its fixes), so they search every month whatever π is. Over the sweep the moves track γ (−0.71) more than π (+0.29).
- **Exits, 0 against 1.45–1.65%, off by [Ruling 19](plan.md#rulings):** a re-entered row has no workers, so no household shops there, and it exits again every month. With exits on, they ran 1.9% of firm-months on seeds 1001–1050, and 98% of them were repeats on seed 1001 (measured by the review). Entry needs a design before they return.
- **Spells: 17% out six months or more, against 22–32%, and a mean of 3.1 months, against 4.6–6.9:** unemployment's 9% ceiling caps the slow searchers who make spells long (inference). Over the sweep, their share ranks +0.34 with long spells and +0.30 with unemployment.
- **Pay cuts, 14.6% of stayers a year, against 1.6–2.4%:** closed money balances raises and cuts, at 2.8% of firm-months each (measured here, seed 1, before the exits went off). Revisit with M5's inflation.
- **Firm-size skew, 0.84, against 1–10:** the cause is unknown. Lengnick reports 1.88 (R2 KQ1).
- **The markup and stock bands mostly test inputs:** their targets, 1.36–1.50 and 0.8–1.6 months, are `CITY`'s own markup and stock bands, so holding them shows little.

Okun is no longer a gap. It is measured on the units produced, not the units sold, and holds at −0.81 for the city and −0.76 for `LENGNICK`. Measured on units sold, its sign came out positive.

### M2.1's calibration flags

- **Prices changing in 18.9% of firm-months:** the city's θ of 0.22 brings it to 10.8%. Lengnick's 18.6% stands, as a replication should.
- **Job-to-job 2.5%, hires 3.7%, layoffs 1.24%, job finding 31.9%:** Lengnick confirms them at 2.5%, 3.7%, 1.24% and 32.0%. The city meets job finding (26.2%); its other three are gaps.
- **Exits in 0.003% of firm-months:** the city's short-pay exits (Ruling 5) raised them to 1.9%, but only as re-entered rows exiting again, so they are off in `CITY` (Ruling 19) and its exit rate is 0. Exits stay a documented gap until entry is designed.
- **66% of firm-months above the 1.15 markup ceiling:** the city's clamp (Ruling 6) leaves 23% above its 1.50 ceiling, against Lengnick's 66.5%. A step stops at the edge, so those firms likely sit above after a wage cut lowered their ceiling (inference).
- **About 17% of firms cutting wages a year:** stayers see cuts at 14.6% in the city and 15.7% in Lengnick, the pay-cut gap.
- **Firm sizes skewing 0.50:** the city's 0.84 and Lengnick's 0.38 both miss the 1–10 band, cause unknown.
- **Unsold stock vanishing at exit:** closed. Every exit writes its stock off into `write_off` (Ruling 5), and `flow-log.test.ts` balances stock every day.
- **`economyDay` allocating up to 0.6 KB a sim day:** M2.3 didn't touch it, and didn't re-measure it.
- **R1's bands:** the mean price stays at 1.20× the start for Lengnick and 0.98× for the city. Month-end unemployment is 3.7% and 7.6%.
- **Speed:** the city's burn-in run, with exits off, made 7,774 sim days a second with checks on, on one thread (Node 24.18.0, load not recorded).
