# M7.4 Goods and food in the country: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **The settlement store grows by about 30 numbers in 130 B (R6):**
  - eight `Int32` goods stocks and prices;
  - a standing crop, Q16 fertility and weather;
  - fish, forest and ore stocks, as integer-valued `Float64`;
  - workers by sector.
- **The 12-number food block (R6):**
  - a 6-slot perishable ring by days left: {1, 2, 3, 4–6, 7–10, 11+};
  - two dated staple cohorts;
  - eaten and spoiled.

  It ages daily. Weekly-market villages get a second ring.
- **Harvests stay dated.** Stored harvests are dated cohorts, never a single daily loss rate. A single rate lost 19–29% of a year's harvest in testing, against 0% for dated cohorts.
- **Goods step weekly,** round-robin over seven days, in this order:
  1. extraction, with logistic regrowth (Q24 rates, and depensation below K/4);
  2. recipes;
  3. consumption;
  4. decay;
  5. band prices, clamped to 25–175% of base.
- **Seasonal stocking:** storable seasonal goods are stocked to demand × days to the next harvest, with a carrying-cost drift of 1.5–3% a month. M2.7's verify-first re-reads that rate on the 112-day year.
- **Market-day trade:**
  - weekly, in grain, timber, metal and wares, by margin per good;
  - transport cost ratios are sea 1 : river 5–10 : road 23–52;
  - fresh food travels only under a day's travel, and stone only to neighbours.
- **Price bands:**
  - settlement prices stay within import and export parity plus transport cost;
  - arbitrage flows run when local prices leave the band;
  - market saturation is decaying demand memory, adapted from Norland's caravan ceiling.
- **Pre-retail food loss by group:** fruit and vegetables 25.4%, meat 14.0%, roots 12.3% and cereals 8.4%, scaled by a cold-chain factor of 0.75–1.73.

## Packages and files

- `packages/sim-country`:
  - `src/goods/store.ts`, `src/goods/weekly.ts` and `src/goods/regrowth.ts`;
  - `src/food/ring.ts` and `src/food/cohorts.ts`;
  - `src/trade/market-day.ts` and `src/trade/parity.ts`.
- `packages/sim-country/scripts/goods-tables.ts`: regrowth, price clamp and loss tables, from M2.4's recipes.

## Interfaces and data

- **Goods block per settlement:** the about 30 numbers above, in a fixed column layout documented in `sim-protocol`.
- **Food block:** 12 `Int32` per settlement, plus 6 for a second ring where weekly markets apply.
- **The weekly step** covers one seventh of settlements per day, by `settlement mod 7 == day mod 7`.

## Method and sources

- **Store sizes, the food block, dated cohorts, the weekly step, regrowth, trade ratios, parity and saturation:** the [R6 report](../../../../research/round-6-goods-and-wellbeing/report.md) and [R6 integration notes](../../../../research/round-6-goods-and-wellbeing/notes/integration-cost.md).
- **Regrowth, fisheries and forests:** [R6 resources notes](../../../../research/round-6-goods-and-wellbeing/notes/resources-production.md), part b.
- **Pre-retail loss and cold chains:** [R6 food notes](../../../../research/round-6-goods-and-wellbeing/notes/food-quality-spoilage.md), part b and the recommendation.
- **Norland's caravan ceiling:** [R6 Norland notes](../../../../research/round-6-goods-and-wellbeing/notes/norland-prior-art.md).

## Tests for the exit checks

- `goods identity per good`: exactly, every day, with spoilage as its own term.
- `harvest stores lose only pests`: at most 7% a season, re-read on the 112-day year.
- `fishery at maximum sustainable yield`: the catch at u = r/2 lands within 0.1% of rK/4.
- `ring matches an exact per-day ring`: on presets, the ledger ring's waste stays within 1 point of an exact per-day ring.
- `seasonal prices`: price gaps run 17–33% in isolated villages and 2.5–3 times lower in integrated markets, and grain's price doubles at about 290 km by road.

## Risks and unknowns

- **Needs M2's re-read** of round 6's carrying cost and pest loss on the 112-day year before coding the rates.
- **The weekly step adds lag** to price signals. Check that it doesn't create artificial cycles against a daily-step reference on one preset.
- **Per-settlement cost:** M7.5 holds the whole goods-and-wellbeing extension to ≤ 0.7 µs RM per settlement-day, so measure here as the blocks land.

## Open questions

- **Owner:** One national cold-chain factor, or one per settlement? R6 spans 0.75 (rich) to 1.73 (poor), and the storybook pre-industrial setting (owner, 7 October 2026) has no cold chain. Suggested: one national value of 1.73, which drops a column. Needed before: the step plan.
- **Measure:** Does the weekly goods step make price cycles that a daily step would not? A daily goods layer would cost 17–21 ms at 10,000 settlements against the 12 ms budget (R6), so weekly has to hold up. Suggested: run one 100-settlement preset both ways, and accept weekly if both give the same price period and seasonal gaps. Needed before: building.
- **Research:** Do R6's 1.5–3% monthly carrying cost and ≤ 7% seasonal pest loss hold on the 112-day year? They set the stocking drift and the harvest-store test. Suggested: take M2.7's re-read, or keep R6's values labelled provisional if it hasn't landed. Needed before: building.
- **Research:** What sources fix grain density, decay rates for timber, fuel and wares, and weather correlation between nearby settlements? R6 lists all three as unsourced, and they drive the 290 km test, the decay step and the weather draw. Suggested: one short research round, with labelled design values until then. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the goods identity with its spoilage term, then the food ring and dated cohorts, the weekly step, and market-day trade with parity bands.
- **Reuse:** M7.3's trade, graph and round-robin; M2.4's recipes; M7.1's stochastic rounding for portions.
- **Keep it simple:** extend M7.3's margin trade with transport ratios and market days, rather than adding a second trade path.
- **Pitfalls:** the 290 km check needs a country wider than 290 km, so it waits on M7.1's cell scale. Convert annual and monthly rates to weekly steps in build-time tables, since `**` is banned, and keep stock × Q24 rate below 2^53. Keep a byte tally per block against the 1 KB settlement cap; R6 computed 510–640 B before M7.6's culture block.
- **Hard and easy parts:** dated cohorts and the ring-versus-exact-ring check need care; the price clamp and loss tables are mechanical.
