# M7.6 Cultures in the country: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **The settlement culture block (R8):**
  - counts by primary culture plus mixed counts: 2K `Int32`, which is 64 B at 8 cultures;
  - a region id.
- **It steps yearly,** on each settlement's stride day from M0.3's stride scheduler:
  1. births by homogamy and conformist learning;
  2. then mixing and switching hazards.
- **Migration splits by culture exactly,** but never reads it.
  - Migration flows are computed culture-blind in M7.3.
  - `sim-culture` then splits each flow: outflow by culture first, then by destination, with keyed stochastic rounding.
  - About 20% of movers are long-distance, weighted by pop^1.5, and spread over the month with sparse loops.
- **Demand shifts per settlement** are Σ share × Δβ from M2.6's preference rows, recomputed only when counts change.
- **Culture hazards** are fitted from M3–M5's agent runs and docked on held-out runs, exactly as M7.2 does for other flows.

## Packages and files

- `packages/sim-culture`:
  - `src/country/block.ts`: the culture block, and its yearly step;
  - `src/country/split.ts`: exact splits of migration flows by culture;
  - `src/country/demand.ts`: Σ share × Δβ.
- `packages/sim-country`: calls these from culture-blind orchestration. Its migration code stays guarded and never imports `sim-culture`.
- `tools/emulator/fit.py`: extended to culture hazards.

## Interfaces and data

- **Culture block per settlement:** `counts` (`Int32Array` of K primary counts plus K mixed counts) and `region` (`Uint16`).
- **Split:** `splitFlow(fromCounts, flowTotal, out, seed, day, settlement)`, exact, with keyed stochastic rounding.
- **Demand shift:** 7 numbers per settlement in ppm (six food categories and the wares-against-services split), cached until counts change.

## Method and sources

- **The block, homogamy, conformist learning, switching and long-distance movers:** [R8 transmission notes](../../../../research/round-8-cultures/notes/transmission.md), and prototype [`ledger.mjs`](../../../../research/round-8-cultures/prototypes/transmission/ledger.mjs). In a country of 1,000 settlements, 95% kept their dominant culture and capitals became melting pots (R8).
- **Exact splits by keyed stochastic rounding:** M0.2's helper and the [R8 report](../../../../research/round-8-cultures/report.md).
- **Demand shifts:** M2.6's preference rows.
- **Docking:** M7.2.

## Tests for the exit checks

- `people by culture sum exactly`: to population every day; spawn and fold are exact per culture.
- `minority moves fair`: over 30 years, each minority's move rate stays within 5% of its population share.
- `regions stay distinct`: over 100 years:
  - regional G\_ST stays at 0.3 or more with acculturation;
  - at least 90% of settlements keep their dominant culture;
  - the capital's effective number of cultures exceeds the village median.
- `culture independent of wealth`: settlement culture shares are independent of settlement wealth bands, within M4.5's audit bands.
- `migration never reads culture`: M4.1's flip test covers migration decisions at the country tier.

## Risks and unknowns

- **Verify first (from M3.7):** round 8's transmission bands re-run with similar culture shares.
- **Yearly steps are coarse.** Round 8 found checks every 30 days gave the same outcomes as daily, at 1/23 of the cost. Yearly is coarser still, so dock it before relying on it.
- **G\_ST depends on the region definition.** Fix regions in M8 before the 100-year check is final.

## Open questions

- **Owner:** Is "within 5% of their population share" relative or in points, and national or per settlement? A relative bound per settlement would fail on count noise alone (inference). Suggested: relative, on national totals over 30 years. Needed before: the step plan.
- **Owner:** Which regions does G\_ST use before M8 exists? The 100-year band depends on them. Suggested: the test generator's regions, with the check marked provisional until M8 fixes regions. Needed before: the step plan.
- **Measure:** Does the yearly step dock against agent runs? R8's country results came from a yearly ledger step (`ledger.mjs`), but only its 30-day agent stride was compared with daily checks. Suggested: dock it in M7.2's harness, and fall back to a monthly step if it fails. Needed before: building.
- **Research:** Do round 8's transmission bands hold with similar culture shares, not one 60% culture? They set the CI retention bands, as M3.7's verify-first notes. Suggested: take M3.7's re-run, and mark the bands provisional until then. Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the block and its "sums to population" invariant, then exact migration splits, then births and switching, then demand shifts, then docking.
- **Reuse:** M0.6's `sim-culture` wall and relabel test, M0.2's keyed stochastic rounding, and R8's `ledger.mjs` as a reference, never imported.
- **Keep it simple:** one exact-split routine serves migration now and M9.1's spawn and fold later.
- **Pitfalls:** `sim-country`'s orchestration passes flow totals in and gets splits back, while its migration code never imports `sim-culture`; the split never reads wealth. Compute pop^1.5 as pop × `Math.sqrt(pop)`, since `**` and `Math.pow` are banned. The relabel test must still pass with every block in.
- **Hard and easy parts:** exactness through births, switching, migration and spawn at once needs care; the block layout and demand shift are mechanical.
