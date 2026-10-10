# M2.3 Calibration and design runner: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Two presets, as parameter files:**
  - **`lengnick`:** an exact replication of the paper's parameters, used by the known-answer tests;
  - **`city`:** what the game runs.
    - Shop markups are 1.36–1.50 over wholesale.
    - Firms hold 0.8–1.6 months of stock.
    - Workers differ in productivity and reservation wage, so long unemployment spells occur.
- **Tune toward measured targets, never fit blindly.** Every tuning change is a parameter-file edit judged by the target suite below on 50 paired seeds. The suite is M1.1's claim machinery: each target is an estimate claim with a band.
- **Job-to-job moves:**
  - Log the share of firm visits that find an acceptable vacancy.
  - If job-to-job moves fall short, raise the search probability π from Lengnick's 0.1 toward 0.3–0.6 (R2).
- **The credit line is conditional.** Add a firm credit-line slider only if cycles prove too mild. If added, test it against both Mark-0 phase tables (R2).
- **Daily flow logs** per district in headless runs:
  - hires, separations and the wage bill;
  - consumption, the repricing share and size;
  - vacancies, firm entries and exits, and taxes.

  These feed M7's aggregate emulator, which is calibrated against agent fold-ups (R4).
- **The design runner** sweeps a full grid:
  - seeds;
  - city sizes: 1,000, 3,000, 10,000, 30,000 and 100,000 agents;
  - police shares;
  - unemployment shocks.

  Police share does nothing until M4, and taxes stay zero until M5; the axes exist now so the logs keep one schema.
- **Columnar logs, no dependency:**
  - each run writes `<run>/meta.json` (parameters, seed, schema version and commit), plus one little-endian `Float64` file per column;
  - Python reads them with `numpy.fromfile`.

## Packages and files

- `packages/sim-core`:
  - `src/economy/presets/lengnick.ts` and `src/economy/presets/city.ts`;
  - `src/economy/flows.ts`: the district flow counters, reset each day.
- `tools/cli`: a `design` command, with the grid in a JSON file, and parallel runs across `worker_threads`, one run per thread. Results don't depend on thread count.
- `tools/analysis/targets.py`: reads the logs, computes each target, and prints the bands. It is used in nightly CI and by hand.

## Interfaces and data

- **Preset:** the full `params` object from M2.1, frozen, plus `name` and `version`.
- **Flow record:** one row per district per day, with fixed columns in `flows.ts`. The schema version bumps with any column change.
- **Design grid:** `{ seeds: number[], sizes: number[], policeShares: number[], shocks: { day: number, unemploymentPoints: number }[] }`.
- **Target suite:** `targets.ts` lists each target as an M1.1 estimate claim with its band and source.

## Method and sources

All the targets come from the [R2 economy calibration notes](../../../../research/round-2-follow-up/notes/economy-calibration.md), where every official statistic is a search summary:
- **Price and wage stickiness:** prices change in 9–12% of months, and about 2% of job-stayers see a pay cut a year (Key Question 1).
- **Labour flows:** about 26% of the unemployed find work each month, plus job-to-job moves (Key Question 2).
- **Firm dynamics:** survival, markups and inventories (Key Question 3).
- **Benchmarks:**
  - BAM's numeric bands, from bam-engine (MIT);
  - Mark-0's phase table over R = η₊/η₋ and Θ;

  both in Key Question 5.
- **Sensitivity and designs:**
  - [R2 validation notes](../../../../research/round-2-follow-up/notes/validation-methodology.md), part 2: Morris screening before Sobol, never one factor at a time;
  - part 3: calibration methods a solo developer can run.
- **Why log flows per district:** [R4 architecture notes](../../../../research/round-4-multi-scale/notes/architecture-lod.md), part 4. Aggregate models are calibrated against agent fold-ups.

## Tests for the exit checks

- `city preset hits its targets`: on 50 paired seeds after MSER-5 burn-in, these estimate claims all hold:
  - prices change in 9–12% of months;
  - about 2% of job-stayers see a pay cut a year;
  - about 26% of the unemployed find work each month;
  - markups are 1.36–1.50, and stock is 0.8–1.6 months;
  - the BAM bands hold.
- `reproduces Mark-0's phases`: with the credit line on, if built, sweeping R and Θ over the reference grid lands each cell in the phase the reference table gives (FE, FU, RU or EC).
- `design runner is deterministic`: the same grid run on 1 thread and on 4 threads writes byte-identical column files.
- `flow logs balance`: each day, district hires − separations equals the change in employment, and the wage bill equals the ledger's wage transfers.

## Risks and unknowns

- **Measured in M2.1:** the share and size of price changes, a job-to-job rate and runs per second, with the other calibration flags, are in [M2.1's task](../m2.1-lengnick-core/task.md). Lengnick's own figures stay unopened. Runs per second at each city size decide how big a grid the nightly job can afford.
- **Targets may conflict.** Stickiness and labour flows pull on the same parameters. Record every trade-off in the preset file's "why" comments, and in the targets report.
- **A month is 21 days** (owner, 10 October 2026), so targets stated per month convert through it.

## Open questions

- **Owner:** Does the `city` preset run closed or fiat money? It decides whether the suite checks zero mean saving or round 2's 4% fiat target ([R2 economy calibration](../../../../research/round-2-follow-up/notes/economy-calibration.md), Key Question 4). Suggested: closed, with fiat a scenario switch until M5's treasury. Needed before: the step plan.
- **Owner:** Do round 2's yearly targets hold per 112-day year, as [calendar.md](../../../calendar.md)'s "Rescaling rules" ask for annual statistics? With 5⅓ months a year, "2% of stayers cut a year" then means 2.25× the data's cuts per wage decision (computed). Suggested: yes, yearly targets per game year and monthly ones per game month, accepting more cuts per decision. Needed before: the step plan.
- **Measure:** How many sim days per second does a headless run reach at each city size? It sets how much of the grid the nightly job can afford. Suggested: measure once M2.2 spawns cities, then run a slice nightly and the full grid by hand. Needed before: the step plan.
- **Measure:** What makes cycles "too mild" for the credit line? Without one, the feature has no trigger. Suggested: a numeric floor on output and unemployment volatility, fixed before tuning starts. Needed before: building.
- **Research:** What are a typical price change's size and a direct monthly job-to-job rate? Round 2 found no job-to-job source and quits overstate it, yet the π rule needs a target (same notes, Key Question 2). Suggested: a short research round, logging both meanwhile, with JOLTS quits as an upper bound. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** flow counters and their balance test first, as a cheap ledger check. Then the column writer and its thread-count check, `targets.py`, tuning, and the credit line last, if its threshold trips.
- **Reuse:** M1.1's estimate claims; M2.1's MSER-5 and `params`; M2.2's spawn; M0.6's bench.
- **Keep it simple:** treat each settlement as one district until M3.1's 64×64 districts exist, keeping the district column. Add Morris screening only if tuning stalls.
- **Pitfalls:**
  - Tuning and judging on the same 50 seeds overfits, so confirm the final preset on a fresh seed set.
  - Name output files by grid cell, never by finish order, and keep timestamps and thread ids out of the columns.
- **Hard and easy parts:** trading stickiness against labour flows is the hard part, with Mark-0's phases next. The runner and the logs are mechanical.
