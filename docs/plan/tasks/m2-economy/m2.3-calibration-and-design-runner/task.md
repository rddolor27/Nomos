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
    - Met by `city-targets.test.ts` (18772c9) under `ECONOMY_LONG=1`, on the one confirmation: seeds 1001–1050, 100 months after the 17,295-day burn-in (measured here, 10 October 2026).
    - Prices change in 10.8% of firm-months, and 26.8% of the unemployed find work each month. Both hold.
    - **The pay cut is now a tier-2 documented gap** (coordinator, 10 October 2026; [Ruling 12](plan.md#rulings)). 14.6% of stayers see a cut a year.
      - Under closed money, cuts must balance raises. R2's 2% comes from the US, where stayers' wages grow about 3.6% a year.
      - Revisit it when M5's treasury brings inflation.
    - BAM's bands: unemployment's mean (7.9%), its s.d. (0.0104), Phillips (−0.23) and Beveridge (−0.39) hold. Okun (+0.17) and firm-size skew (0.85) are gaps, below.
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
3. **Burn-in:** 17,295 days, from a 40,000-day MSER-5 run, since 20,000 days were too short ([Ruling 18](plan.md#rulings)).
4. **Confirmation:** run once on seeds 1001–1050, after `CITY` was committed (bfe549b). All six tier-1 targets hold, and `CITY` didn't change afterwards.

### The city's knobs and their trade-offs

| Knob | `LENGNICK` | `CITY` | Trade-off |
| --- | --- | --- | --- |
| θ, `priceChancePpm` | 750,000 | 220,000 | Prices change in 10.8% of firm-months. A probe at θ 0.14 (γ 24, seeds 1–5) changed 6.2% and pushed the markup to 1.506, past the band. |
| γ, `wageCutMonths` | 24 | 25 | Fewer cuts need more unemployment under closed money. In the sweep, cuts of 3.5% or less came with unemployment of 15.4% or more. |
| π, `onJobSearchPpm` | 100,000 | 127,732 | Point 232's value. Job-to-job moves track γ more than π: rank correlations −0.71 and +0.29 over the sweep. |
| β, `jobSearches` | 5 | 5 | β 6 lowered unemployment to 8.2% on seeds 1–20, but raised exits to 2.9%. |
| `slowSearcherPpm`, `slowJobSearches` | 0, 5 | 227,437, 1 | 23% slow searchers lengthen spells. More raise unemployment (sweep rank correlation +0.30), which already ends months near 8%. |
| `shortPayExitPpm` | 0 | 300,000 | Exits run 1.9% of firm-months. Below θ 0.32, the sweep's exits ran 3.6% at 335,000 and 6.1% at 436,000. |
| `burnInDays` | 9,893 | 17,295 | Ruling 18. |

The stock band (0.8–1.6 months), the markup band (1.36–1.50, clamped) and the 3,200-cent opening price are the plan's, from R2 KQ3, and weren't swept.

### The confirmation, seeds 1001–1050

Each cell is the median over 50 seeds, the range in brackets, then the verdict: the 90% t-interval of the mean against the band (Ruling 10). `LENGNICK` is the replication, tuned to none of these bands, so its misses are expected.

| Tier | Target | Band | `CITY` | Verdict | `LENGNICK` | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `price_change_share` | 0.09–0.12 | 0.108 (0.100–0.120) | holds | 0.187 (0.166–0.209) | fails |
| 1 | `job_finding` | 0.208–0.312 | 0.268 (0.252–0.288) | holds | 0.320 (0.305–0.340) | fails |
| 1 | `unemployment_mean` | 0.04–0.09 | 0.0789 (0.0708–0.0861) | holds | 0.0371 (0.0326–0.0427) | fails |
| 1 | `markup` | 1.36–1.50 | 1.493 (1.486–1.499) | holds | 1.162 (1.159–1.165) | fails |
| 1 | `stock_months` | 0.8–1.6 | 0.885 (0.839–0.939) | holds | 0.438 (0.408–0.460) | fails |
| 1 | `price_ratio` | 0.25–4 | 0.983 (0.975–0.991) | holds | 1.201 (1.194–1.209) | holds |
| 2 | `hires_rate` | 0.0264–0.0396 | 0.0510 (0.0481–0.0545) | fails | 0.0371 (0.0353–0.0395) | holds |
| 2 | `layoff_rate` | 0.008–0.012 | 0.0228 (0.0207–0.0254) | fails | 0.0124 (0.0112–0.0138) | fails |
| 2 | `job_to_job` | 0.01–0.02 | 0.0280 (0.0255–0.0306) | fails | 0.0249 (0.0230–0.0278) | fails |
| 2 | `exit_rate` | 0.0145–0.0165 | 0.0193 (0–0.0478) | inconclusive | 0 (0–0.0009) | fails |
| 2 | `long_spell_share` | 0.216–0.324 | 0.173 (0.151–0.195) | fails | 0.0387 (0.0248–0.0591) | fails |
| 2 | `mean_spell_months` | 4.6–6.9 | 3.19 (2.77–3.46) | fails | 1.55 (1.38–1.75) | fails |
| 2 | `stayer_cut_share` | 0.016–0.024 | 0.146 (0.118–0.160) | fails | 0.157 (0.144–0.170) | fails |
| 3 | `unemployment_sd` | 0.010–0.030 | 0.0104 (0.0067–0.0148) | holds | 0.0069 (0.0048–0.0090) | fails |
| 3 | `phillips` | −0.50 to −0.05 | −0.226 (−0.389 to −0.021) | holds | −0.165 (−0.395 to 0.038) | holds |
| 3 | `okun` | −0.98 to −0.70 | 0.171 (−0.012 to 0.330) | fails | 0.135 (−0.162 to 0.299) | fails |
| 3 | `beveridge` | −0.65 to −0.10 | −0.392 (−0.566 to −0.178) | holds | −0.295 (−0.518 to −0.095) | holds |
| 3 | `size_skew` | 1–10 | 0.849 (0.502–1.358) | fails | 0.382 (0.017–0.876) | fails |
| 3 | `no_crisis` | every seed | every seed | holds | every seed | holds |
| — | `price_change_size` (ppm) | reported | 10,210 (9,863–10,670) | — | 10,160 (9,767–10,400) | — |
| — | `above_markup_share` | reported | 0.232 (0.160–0.328) | — | 0.665 (0.612–0.706) | — |
| — | `visit_success` | reported | 0.0928 (0.0867–0.1039) | — | 0.0758 (0.0710–0.0815) | — |

The two confirmations took 38 s together on 11 threads.

### Ruling 14's trigger

- The city's median s.d. of monthly unemployment is 0.0104, just over BAM's 0.010 floor, so cycles aren't too mild and the credit line stays unbuilt.
- The margin is only 0.0004. `LENGNICK`'s 0.0069 would trip it, but Ruling 14 judges the city.

### The city's documented gaps

- **Hires, 5.1% a month against 2.6–4.0%:** they mirror separations, with layoffs (2.3%) plus job-to-job moves (2.8%) making 5.1% (computed).
- **Layoffs, 2.3% against 0.8–1.2%:** 20% of firm-months end above the stock band's top, and each fires one worker (measured here, seed 1).
- **Job-to-job moves, 2.8% against 1–2%:** the cause is unknown. Over the sweep they track γ (−0.71) more than π (+0.29).
- **Exits, 1.9% against 1.45–1.65%, inconclusive:** seeds range from 0 to 4.8% of firm-months, and why exits come in bursts is unknown.
- **Spells: 17% out six months or more, against 22–32%, and a mean of 3.2 months, against 4.6–6.9:** unemployment's 9% ceiling caps the slow searchers who make spells long (inference). Over the sweep, their share ranks +0.34 with long spells and +0.30 with unemployment.
- **Pay cuts, 14.6% of stayers a year, against 1.6–2.4%:** closed money balances raises and cuts, at 2.8% of firm-months each (measured here, seed 1). Revisit with M5's inflation.
- **Okun, +0.17, against −0.98 to −0.70:** the sign comes from measuring output as units sold. With units produced, it is −0.80 on the same seeds (computed).
- **Firm-size skew, 0.85, against 1–10:** the cause is unknown. Lengnick reports 1.88 (R2 KQ1).

### M2.1's calibration flags

- **Prices changing in 18.9% of firm-months:** the city's θ of 0.22 brings it to 10.8%. Lengnick's 18.7% stands, as a replication should.
- **Job-to-job 2.5%, hires 3.7%, layoffs 1.24%, job finding 31.9%:** Lengnick confirms them at 2.5%, 3.7%, 1.24% and 32.0%. The city meets job finding (26.8%); its other three are gaps.
- **Exits in 0.003% of firm-months:** the city's short-pay exits (Ruling 5) raise them to 1.9%, near R2's band.
- **66% of firm-months above the 1.15 markup ceiling:** the city's clamp (Ruling 6) leaves 23% above its 1.50 ceiling, against Lengnick's 66.5%. A step stops at the edge, so those firms likely sit above after a wage cut lowered their ceiling (inference).
- **About 17% of firms cutting wages a year:** stayers see cuts at 14.6% in the city and 15.7% in Lengnick, the pay-cut gap.
- **Firm sizes skewing 0.50:** the city's 0.85 and Lengnick's 0.38 both miss the 1–10 band, cause unknown.
- **Unsold stock vanishing at exit:** closed. Every exit writes its stock off into `write_off` (Ruling 5), and `flow-log.test.ts` balances stock every day.
- **`economyDay` allocating up to 0.6 KB a sim day:** M2.3 didn't touch it, and didn't re-measure it.
- **R1's bands:** the mean price stays at 1.20× the start for Lengnick and 0.98× for the city. Month-end unemployment is 3.7% and 7.9%.
- **Speed:** the city's burn-in runs made 7,459–7,526 sim days a second with checks on, on one thread (load not recorded).
