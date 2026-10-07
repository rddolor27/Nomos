# M2.5 Household wealth: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Balance sheets per household,** all in integer cents or integer quantities:
  - deposits;
  - unsecured debt as claims-ledger records, with a limit of 0.5–1× annual income at 12–20% a year, discharged after 5–7 years at ≥ 80% of the limit;
  - durables, about 0.35× earnings;
  - shares in named firms, through M0.2's firm-share quantity registry.

  Cash and loans stay exact. Non-money assets are valued as integer price index × quantity at the day boundary, logged as revaluation lines and never posted to MINT (R6).
- **Dividends:** firm profits go to each firm's shareholders in proportion to shares, with exact apportionment. Returns are logged and checked:
  - their SD should be near 6% a year;
  - a persistent part, near 3 points, is re-drawn every 10–20 years by keyed draw.
- **Saving rises by income quintile:** about 0, 2, 6, 9 and 15–18% of income above subsistence and housing. Households draw 5% a year from liquid wealth, and less from illiquid wealth as wealth rises.
- **Happiness income:**
  - household disposable income per adult;
  - it feeds each agent's Q16 log2 income habit, using M0.2's log2 table;
  - each settlement's median log income is published at the day boundary from a 16-bins-per-octave histogram, never by sorting shared memory (M0.3's lint).
- **Spawn extended to wealth:**
  - a keyed wealth rank;
  - a per-preset quantile table, Euro-like or US-like;
  - income–wealth rank correlation near 0.6, through M0.2's Gaussian-copula table;
  - exact apportionment to group totals, and a portfolio split by group;
  - homes by rank plus noise.
- **Guarded folder.** Wealth code is in `wealth/`, which M0.6's rules guard. Wealth never reads culture or looks, and nothing in it is drawn on bodies, clothes or houses by default.

## Packages and files

- `packages/sim-core`:
  - `src/wealth/balance-sheet.ts`, `src/wealth/saving.ts`, `src/wealth/dividends.ts`, `src/wealth/revalue.ts` and `src/wealth/returns-log.ts`;
  - `src/spawn/wealth.ts`, which extends M2.2;
  - `scripts/wealth-tables.ts`: the quantile tables per preset and the return-regime table, emitted as data;
  - `src/economy/known-answers.ts`, extended with the earnings-only and Yard-Sale models.
- `tools/cli`: a `wealth` report of Gini, top shares and the rank correlation, per run.

## Interfaces and data

- **Household columns:** `deposits`, `durables` and `illiquid` in cents (`Float64Array`); `debtClaim` (`Int32Array`, a claims-ledger index or −1); and `incomeHabitQ16` (`Int32Array`, in M3's life-satisfaction block, reserved here).
- **Firm-share registry:** M0.2's quantity registry, keyed (firm, holder household).
- **Revaluation line:** `{ day, asset, quantityTotal, indexPpm, valueCents }`, logged and never posted to MINT.
- **Presets:** `euroLike` and `usLike`, each a quantile table of 64 points and a target Gini and top-10% share.

## Method and sources

- **Balance sheets, targets, accumulation, accounting and display:** [R6 wealth notes](../../../../research/round-6-goods-and-wellbeing/notes/wealth-assets.md), parts a–e and "Recommendation for the plan".
- **Why the run starts calibrated:** a realistic distribution takes 70–200 simulated years to form, and earnings and saving alone reach a Gini of only about 0.5 ([R6 summary](../../../../research/round-6-goods-and-wellbeing/summary.md), "Wealth").
- **Happiness income and the habit:** [R6 happiness notes](../../../../research/round-6-goods-and-wellbeing/notes/happiness-wellbeing.md), the update rule.
- **Claims ledger, registries, tables and histogram rule:** M0.2 and M0.3.

## Tests for the exit checks

- `earnings-only economy settles near the earnings Gini`: with no returns or inheritance, the wealth Gini settles within 0.1 of the earnings Gini.
- `Yard-Sale drifts toward 1`: without redistribution, the Gini rises monotonically over 400 years and passes 0.9.
- `identities hold for 400 years`: over 50 seeds × 400 simulated years (44,800 days):
  - Σ = 0 every day;
  - total borrower debt equals total lender loan assets every day;
  - no revaluation changes MINT.

  The nightly job runs the full length; per-push runs use 5 seeds × 20 years.
- `returns look right`: logged returns have SD 6% ± 1 point a year, and a persistent part of 3 ± 1 points.
- `spawned wealth matches the preset`: the spawned Gini and top-10% share are within 0.01 of the preset, and the rank correlation is 0.6 ± 0.05.

## Risks and unknowns

- **Housing costs arrive with M3's rents,** so "income above subsistence and housing" uses a zero housing cost until then. Re-run the saving checks after M3.
- **The income habit column** belongs to M3's life-satisfaction block. Reserve it here so `AgentStore`'s layout doesn't shift later.
- **Long runs are slow.** 400 years is 44,800 days per seed, so it stays in the nightly job.
