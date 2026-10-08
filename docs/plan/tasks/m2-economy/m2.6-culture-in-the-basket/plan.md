# M2.6 Culture in the basket: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Culture moves only the marginal shares.** It shifts the Stone–Geary β of the six food categories, plus one wares-against-services split. Nothing else:
  - shifts sum to zero;
  - each stays within ±25% of the neutral share, or ±40% on lab cards;
  - each category keeps at least 0.6× its neutral share.
- **Kept culture-blind** ([R8 customs notes](../../../../research/round-8-cultures/notes/customs-preferences.md), part a):
  - subsistence γ, in portions bought cheapest-first;
  - saving, labour supply and total consumption;
  - the food total share and the grade.

  Basic food therefore never depends on culture, so culture cannot cause the hunger that drives food theft.
- **`consumption/` is the one place culture enters.** It is the folder M0.6's rules allow to import `@nomos/sim-culture` and read culture columns. The preference rows live in `sim-culture`, and the consumption code applies them.
- **Customs are cost-neutral:**
  - favoured categories start at equal base prices;
  - a favourite food swaps within the budget, never adds to it;
  - festivals draw one equal per-person budget for every culture, asserted exactly in a unit test;
  - headless reports carry a "basket cost by culture" line per settlement, expected within ±2.5% of food spending.
- **Household shifts:**
  - the mean of its adults' shifts, rounded by largest remainder so they sum to zero;
  - recomputed only when the household or a culture changes, never per tick.
- **Spawn extended to culture:**
  - settlement culture counts apportioned exactly, household by household;
  - "mixed" people given one or two local-plurality customs by keyed draw;
  - culture independent of wealth rank, home, job and body hue, each drawn on its own stream;
  - fold returning exact counts per culture.
- **Festival stocking:** shops read anticipated festival demand from the public calendar. Festival-week sales, markdowns, spoilage and price moves are logged per category. The festival table and its 2–4× demand arrive in M3; until then, the stocking rule reads an empty calendar.

## Packages and files

- `packages/sim-culture`, extending M0.6's package:
  - `src/preferences.ts`: shift rows per culture, validated against the bounds at build time;
  - `src/household-shift.ts`: the adults' mean with largest-remainder rounding.
- `packages/sim-core`:
  - `src/consumption/basket.ts`: applies the shifts to β only;
  - `src/consumption/festival-stock.ts`;
  - `src/spawn/culture.ts`: extends M2.2 and M2.5.
- `tools/cli`: the "basket cost by culture" report line, and the Cramér's V report at spawn.

## Interfaces and data

- **Preference row:** `Int32Array` of 7 entries per culture: six food categories plus the wares-against-services split, in ppm of the neutral share, summing to zero.
- **Household shift:** `Int32Array` of 7 entries per household, written only on household or culture change. It sits in a `consumption`-owned block, so guarded code never sees it.
- **`spawnFromLedger`'s record** gains culture counts per settlement. `foldToLedger` returns them exactly.

## Method and sources

- **Shift bounds, ICP residuals, cost neutrality and the welfare bound:**
  - [R8 customs notes](../../../../research/round-8-cultures/notes/customs-preferences.md): part a for food and goods, part b for equal festival budgets, and part e for cost;
  - prototypes [`icp_taste.mjs`](../../../../research/round-8-cultures/prototypes/customs/icp_taste.mjs), [`welfare_bound.mjs`](../../../../research/round-8-cultures/prototypes/customs/welfare_bound.mjs) and [`cost.mjs`](../../../../research/round-8-cultures/prototypes/customs/cost.mjs).
- **Guardrails and the four test layers:** the [R8 report](../../../../research/round-8-cultures/report.md), "Four test layers".
- **Engel's law slope:** about 7.8 points per doubling, from the R8 customs notes' "Recommendation for the plan". Round 6 computed it across 102 countries; part a's ICP anchors, food falling from 45.3% to 8.7% of consumption from low to high income, give 7.9.

## Tests for the exit checks

- `Engel's law holds alike`: on 50 paired seeds, regress each culture's food share on log2 income. Every culture's slope is −7.8 ± 1.5 points per doubling, and the slopes differ from each other by less than 1 point.
- `no culture gap in unmet food need`:
  - on paired seeds, compare unmet food need and the food-insecurity tally by culture within income deciles;
  - every culture's ratio stays within 0.9–1.1 of the decile's rate;
  - the tally arrives in M3, so until then the check reads unmet food portions.
- `culture independent at spawn`: over 50 seeds, Cramér's V between culture and each of wealth decile, home district and job stays below 0.05.
- `customs cost the same`: an exact unit test finds one equal festival budget per person for every culture. The per-settlement basket-cost line stays within ±2.5% of food spending.
- `shift bounds`: a build-time check rejects any preference row outside ±25% or below 0.6× neutral, and any that doesn't sum to zero.

## Risks and unknowns

- **Needs M0.6's wall first:** the `sim-culture` package and the guard rules must exist before any culture-reading code lands.
- **The relabel and flip tests** (M0.6 and M4) must keep passing. Any culture-level draw here is keyed by the culture's stable uid, never its index.
- **Festival demand is a stub until M3.** The stocking rule is tested now with a synthetic calendar, and re-checked with M3's real one.

## Open questions

- **Owner:** How many cultures does the default town start with, and in what shares? Spawn needs the counts, and M3.7 re-runs round 8's bands with similar shares rather than one 60% culture. Suggested: four cultures in near-equal shares, like M0.6's test world of uids 1–4. Needed before: the step plan.
- **Measure:** At what city size and seed count do the culture checks pass on a run whose culture labels are shuffled after spawn? Under independence, Cramér's V across 10 wealth deciles is about 3/√n (computed), so 0.05 fails below about 3,600 households. Suggested: compute V per household, and size or pool runs until the shuffled run passes 95% of the time. Size round 8's proposed 0.9–1.1 ratio bands the same way. Needed before: building.
- **Source:** R8's customs notes, part a, bound the wares-against-services split at ±20% of the services β, but this brief applies ±25% to all seven entries. Suggested: add the ±20% bound to the build-time shift check. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** preference rows and their build-time bounds check in `sim-culture` first, then the household shift and its unit tests, then β in `basket.ts`. Spawn, the reports, and festival stocking on a synthetic calendar come last.
- **Reuse:** M0.6's `sim-culture` package, wall, relabel test and `World.cultureUid`; M0.2's culture columns and apportionment; M2.4's basket; M2.2's spawn streams.
- **Keep it simple:** households and cultures never change before M3.7's adoption and M5's births. Compute shifts once at spawn, and add the recompute hook with M3.7.
- **Pitfalls:**
  - `Int16` holds ±32,767, but ±25% in ppm of a neutral share is ±250,000; use `Int32`, or basis points (±2,500).
  - Relative shifts that sum to zero don't sum to zero in absolute share unless neutral shares are equal, so check the absolute sum.
  - `spawn/culture.ts` writes culture columns, so no guarded folder may reach it, which dependency-cruiser checks transitively (M0.6); it must never read wealth rank.
- **Hard and easy parts:** test power is the hard part, not code. The bounds check and largest-remainder rounding are mechanical.
