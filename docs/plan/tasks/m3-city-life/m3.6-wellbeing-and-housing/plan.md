# M3.6 Wellbeing and housing: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **A life-satisfaction (LS) block in `AgentStore`,** about 12 bytes per agent:
  - LS: Int16, 0–10,000;
  - set point: Int16;
  - income habit: Int32, Q16 log2, reserved by M2.5;
  - event counters: saturating Uint16.
- **One order-independent daily pass.**
  - It reads the day-boundary snapshot and writes a back buffer.
  - LS moves 9.4% of the way to its target each day, a 7-day half-life.
  - Persistent conditions stay in the target while they last; only one-off events fade, through build-time tables (R6).
- **Drivers, in ladder units × 1,000:**
  - income: +300 per doubling relative to the settlement median;
  - unemployed: −700, plus −200 for scarring;
  - no friend or household contact for 7 days: −450;
  - food insecurity: −150 per missed-meal day, floor −700. This is a labelled, unsourced knob.
- **What LS may drive:** low needs and low LS only lower utility weights, except in physiological collapse. The driver behind every effect is named in the click-to-explain panel.
  - **On-the-job search** scales by 1 + 0.15 per ladder point below 7, capped at ×2.
  - **A check:** firm-level LS and quits should correlate near r = −0.25.
  - **Never crime.** No causal evidence was found, and it would double-count unemployment (R6).
- **Optional meal mood:** a knob, default 0. Its one-day effect for grade and freshness is measured against the agent's own recent average, never by class.
- **Display:**
  - the inspector shows signed LS drivers with remaining fade times, household food reserves and pantry freshness;
  - the HUD shows a settlement LS meter: the mean, plus suffering, struggling and thriving shares;
  - freshness stays in the inspector, stall stock pips and waste charts;
  - grade and stale food stay out of bubbles outside the wealth lens;
  - carried goods are drawn by category;
  - no bubble ever fires from the LS level.

  The art exists; wire it in.
- **Housing (R6, R9):**
  - **Stock:** a fixed stock of map homes from the generator, each with an owner or renter. Rent is paid to the owner.
  - **Mortgages:** LTV ≤ 80%, with payments ≤ 35% of income above subsistence. On default, a forced sale at a 10% discount.
  - **Prices:** a monthly district price index from recent sales.
  - **Drawing:** every home is drawn from the map. No tile, roof, size or decoration depends on the occupant's wealth or the home's price.
  - Housing code sits in the guarded `housing/` folder.

## Packages and files

- `packages/sim-core`:
  - `src/wellbeing/ls.ts`, `src/wellbeing/drivers.ts` and `src/wellbeing/tables.ts`, the last generated: fade tables for the 0.35-, 1- and 2.6-year half-lives on the 112-day year;
  - `src/labour/on-the-job-search.ts`;
  - `src/housing/tenure.ts`, `src/housing/mortgage.ts` and `src/housing/price-index.ts`.
- `apps/web`: inspector tabs for drivers, food and home, and the HUD LS meter.
- M0.2's claims ledger and quantity registries hold mortgages and home titles.

## Interfaces and data

- **LS block columns:** `ls`, `lsSetPoint`, `incomeHabitQ16` and `lsEvents` (a Uint16 block per agent).
- **Driver table:** id, value, fade half-life (or "while it lasts") and source. The inspector reads it to name drivers.
- **Home record:** map home id, owner household, renter household, and title quantity in M0.2's registry. A mortgage is a claims-ledger record.

## Method and sources

- **LS model, drivers, update rule, display rules and the quit check:** [R6 happiness notes](../../../../research/round-6-goods-and-wellbeing/notes/happiness-wellbeing.md), and the [R6 summary](../../../../research/round-6-goods-and-wellbeing/summary.md), "Happiness: a target that conditions hold".
- **Housing, mortgages, forced sales and the price index:** [R6 wealth notes](../../../../research/round-6-goods-and-wellbeing/notes/wealth-assets.md), part c, "housing costs".
- **Homes from the generator:** M3.1 and the [R9 summary](../../../../research/round-9-maps-and-world-builder/summary.md).

## Tests for the exit checks

- `LS rises with income`: within a town over 50 paired seeds, LS rises 0.30–0.45 ladder points per doubling of income.
- `employment gap`: the employed–unemployed LS gap is 0.6–1.0.
- `budgets with zero GC`: M0.6's budget and allocation gates at 10k and 25k agents. Needs, meals, the LS pass and day slices stay within their sub-budgets with zero scavenges.
- `pass is order-independent`: the LS pass in reversed agent order gives identical hashes.
- `homes never show wealth`: generate a town, permute every household's wealth, and the tile, roof and decoration layers are byte-identical.
- `mortgage rules`: unit tests for LTV ≤ 80%, payments ≤ 35% of income above subsistence, and a 10% forced-sale discount. The claims and cash identities hold every day.

## Risks and unknowns

- **The food-insecurity penalty is unsourced,** a labelled knob. Report its value beside every LS result.
- **Housing makes M2's saving rule complete.** Re-run M2.5's saving checks and M2.7's housing-share check once rents exist.
- **The quit correlation (r ≈ −0.25)** is a check, not a target to tune. If it misses, report it and look for a missing driver before changing weights.
