# M2.4 Goods and food: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Eight sectors:** each firm has one of grain, fresh food, timber, stone, metal, fuel, wares or services. Its integer recipe holds at most two inputs, one output and worker-days per batch. Recipes are a build-time table, never code paths per good ([R6 resources notes](../../../../research/round-6-goods-and-wellbeing/notes/resources-production.md), part a and the recommendation).
- **One wholesale call auction per tradable good per day.**
  - It extends M2.1's single auction to a loop over goods.
  - Services trade directly, never through an auction.
  - Unmet demand per good is logged for M3's needs system.
- **Baskets per good:**
  - Households buy goods with the Stone–Geary rule.
  - Subsistence γ comes first, cheapest-first in portions, then marginal shares β.
  - Shares are seeded from ICP 2021 by development preset: food is 45, 33, 19 and 9% of consumption.
- **Food lots:**
  - Each lot is one `Uint32`, packing `exp:16 | cat:3 | grade:2 | storage:2 | qty:9`.
  - The six categories are grain, bread, produce, dairy, fresh protein and preserved.
  - A shop shelf holds ≤ 32 lots and a pantry ≤ 8, both kept sorted by expiry and sold or eaten first-expiry-first.
  - Storage moves convert the remaining life by integer proportion ([R6 food notes](../../../../research/round-6-goods-and-wellbeing/notes/food-quality-spoilage.md), part e).
- **Spoilage only at the day boundary.**
  - Expired lots move into per-category waste counters.
  - Perishables get no random daily loss.
  - Staples in poor storage lose 0.015–0.04% a day, by keyed stochastic rounding.
  - The sliced day work's late-spoilage rule comes from M0.3's owner ruling (round 6 conflict e).
- **Food prices:** base × grade (100, 135 or 180%) × freshness (100% fresh, 75% stale, 50% on the last day), in integer cents, flooring after each multiply. Markdown sales and waste are logged per category per day.
- **Grade choice:**
  - A household picks a grade from its consumption budget per adult, relative to the price index, never from a wealth band.
  - Food value is a memo line, outside net worth and tax bases.

## Packages and files

- `packages/sim-core`:
  - `src/firms/recipes.ts`, generated from `scripts/recipes.ts`: the 8-sector table;
  - `src/market/wholesale.ts`: the per-good loop, plus `unmetDemand`;
  - `src/consumption/basket.ts`: Stone–Geary per good, and the ICP presets;
  - `src/food/lots.ts`: lot pack and unpack, insertion sorted by expiry, and FEFO take;
  - `src/food/spoil.ts`: the day-boundary sweep and the staple-loss draws;
  - `src/food/price.ts`: the grade and freshness price;
  - `src/food/ledger.ts`: the portion identity per day.
- `scripts/shelf-life.ts`: the 6 × 3 shelf-life table (fresh-until and use-by days per storage tier), from the R6 notes, emitted as data.

## Interfaces and data

- **Lot word:**
  - `packLot(exp, cat, grade, storage, qty): number`;
  - `expOf`, `catOf`, `gradeOf`, `storageOf` and `qtyOf`.

  `qty` counts portions, up to 511; larger stock splits into several lots.
- **Shelf stores** are fixed `Uint32Array` blocks: 32 slots per shop shelf and 8 per pantry, plus a count per block.
- **Food ledger per settlement per day:** produced, imported, eaten, spoiled, exported, pre-retail loss, Δstock and Δin-transit, all in portions.
- **Hashing:** `stateHash` hashes lots by their decoded fields in canonical order, so a change of memory layout cannot change the hash. That makes the layout-swap exit check meaningful.

## Method and sources

- **Sectors, recipes and auctions:** [R6 resources notes](../../../../research/round-6-goods-and-wellbeing/notes/resources-production.md), parts a and d, and the recommendation.
- **Lots, FEFO, shelf lives, spoilage, prices and targets:** [R6 food notes](../../../../research/round-6-goods-and-wellbeing/notes/food-quality-spoilage.md), parts a, b and e, and "Recommendation for the plan".
- **ICP shares and the Stone–Geary rule:** [R6 summary](../../../../research/round-6-goods-and-wellbeing/summary.md), and M2.1's consumption code.
- **Rescaling:** [calendar.md](../../../calendar.md). Shelf lives are per day; grain's 365-day use-by outlasts three 112-day years.

## Tests for the exit checks

- `food balances in portions every day`:
  - over 20 seeds × 400 days, each settlement satisfies, exactly every day: produced + imported = eaten + spoiled + exported + pre-retail loss + Δstock + Δin-transit.
- `shops spoil 0.5–3% of throughput`: in the city preset over 50 paired seeds, this holds as an estimate claim.
- `lot layout does not change the hash`:
  - a build flag swaps packed `Uint32` lots for field arrays (`Uint16` exp, `Uint8` cat, grade and storage, `Uint16` qty);
  - 10 seeds × 400 days give identical state hashes in both layouts;
  - the flag exists only for this test.
- `FEFO and markdowns`: unit tests cover:
  - insertion keeps expiry order;
  - takes come from the earliest expiry first;
  - stale lots price at 75% and last-day lots at 50%, floored.
- `services never auctioned`: the auction loop skips services, and services trade one to one.

## Risks and unknowns

- **Needs M0.3's slice ruling** on late spoilage (round 6 conflict e) before the day-boundary sweep can be final.
- **Round 6 rates set for a 365-day year,** such as the 1.5–3% monthly carrying cost and the ≤ 7% pest loss a season, must be re-read as per day or per year before they are coded (M2.7 verifies them).
- **Shelf capacity:** 32 lots per shelf may overflow in busy shops. If so, merge lots with the same expiry and grade before adding, never drop one.

## Open questions

- **Owner, decided:** `skip-expired` stays M0.3's late-spoilage default, round 6's conflict (e). The owner chose it on 8 October 2026, and M0.3 built it as `SPOILAGE_RULE`. The day-boundary sweep and its tests depend on it, and the `one-pass-at-10k` option fails M0.6's 0.35 ms slice gate.
- **Owner:** Which development preset does the `city` preset use, with food at 45, 33, 19 or 9% of consumption? It sets every basket, M2.6's Engel check and M2.7's food-share band. Suggested: 19%, where food still weighs on budgets without dominating them; then check M3.5's 5–15% insecurity band against it. Needed before: the step plan.
- **Owner:** Which sector supplies each of the six food categories? Two sectors must fill six categories, and round 6 says only that shop labour and markup stand in for milling and baking ([R6 resources notes](../../../../research/round-6-goods-and-wellbeing/notes/resources-production.md), part d). Suggested: grain gives grain and bread, fresh food gives produce, dairy and fresh protein, and preserved takes fresh food plus fuel. Needed before: the step plan.
- **Measure:** How full do the busiest shop shelves get? Peak occupancy shows whether merging same-expiry lots is enough. Suggested: log peak lots per shelf in the city preset at 10k agents. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the lot word, FEFO and the price table first, as pure unit-tested code. Then the portion ledger on one good, the per-good auction loop, baskets, and the layout-swap hash test last.
- **Reuse:** M2.1's auction and Stone–Geary code, extended rather than forked; M0.2's keyed stochastic rounding for staple losses; M0.3's day boundary for the sweep.
- **Keep it simple:** imports, exports and in-transit stay zero until M7 but keep their place in the identity. Households buy final goods only; timber, stone and metal trade only at wholesale.
- **Pitfalls:**
  - If `exp:16` holds an absolute day, it wraps after 65,536 days, about 585 years of 112 days (computed). Longer-lived saves need a rebased epoch.
  - Floor after each multiply in one fixed order, grade then freshness, since the order changes the cents.
  - Clear the goods' auctions in the recipe table's fixed order, since one firm's cash spans several of them.
- **Hard and easy parts:** keeping M2.3's targets once one good becomes eight is the hard part. Lots, FEFO and prices are mechanical.
