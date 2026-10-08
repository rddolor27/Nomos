# M7.5 Happiness, wealth and WASM: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **The happiness block (R6)** holds employed and unemployed mean LS, the income habit, a base level, and 5 band counts cut at 4.0, 5.5, 7.0 and 8.5. It is rebuilt daily from the band table by largest remainder, so the counts always sum to the population.
- **The wealth block (R6)** holds:
  - net-worth totals for the bottom 50%, next 40%, top 10% and top 1%;
  - counts with net worth ≤ 0, and owners;
  - debt totals, the price index, σ and α.

  It is kept separate from the crime top-5% share.
- **Country-level happiness and migration:**
  - +150 milli-ladder points of LS (0.15 ladder steps) per doubling of settlement median income over the national median;
  - out-migration rises by up to 10% per point of mean LS below the national mean.
- **Wealth group transitions** use hazards fitted from M5.6's sweep logs, as M7.2 fits the other flows. Spawn and fold reproduce group totals exactly in cents.
- **Cheap randomness:** aggregate band shifts come from one keyed draw per settlement-day, plus one hash round per rounding decision, or from deterministic remainders. Never use a full keyed draw per cell.
- **Budget, then port:**
  - the goods-and-wellbeing extension is held to ≤ 0.7 µs RM per settlement-day at 1,000 settlements;
  - before the 10,000-settlement tier, the settlement model is ported to WASM in M6.2's Rust crate, completing M6.2's WASM task (R5).
  - The port is integer-only and bit-identical to the JS path, which stays as the fallback.

## Packages and files

- `packages/sim-country`:
  - `src/blocks/happiness.ts`, and `src/wealth/block.ts` in M0.6's guarded `wealth/` folder;
  - `src/migration/flows.ts`, extended with the LS push;
  - `src/wealth/transitions.ts`.
- `packages/sim-wasm/rust/src/settlement.rs`: the settlement day step, with raw pointer exports and no wasm-bindgen.
- `tools/emulator/fit.py`: extended to wealth group transitions.

## Interfaces and data

- **Happiness block:** 9 numbers per settlement: 2 mean LS, habit, base and 5 band counts.
- **Wealth block:** the group totals and counts above, about 12 numbers. Their layouts are documented in `sim-protocol`.
- **WASM export:** `settlementDay(storePtr, count, day, seed)`. It reads and writes the same column memory as JS.

## Method and sources

- **Blocks, cut points, the LS push, transition hazards, cheap randomness and the per-settlement budget:** the [R6 report](../../../../research/round-6-goods-and-wellbeing/report.md) and [R6 integration notes](../../../../research/round-6-goods-and-wellbeing/notes/integration-cost.md).
- **Happiness model:** [R6 happiness notes](../../../../research/round-6-goods-and-wellbeing/notes/happiness-wellbeing.md).
- **Wealth groups:** [R6 wealth notes](../../../../research/round-6-goods-and-wellbeing/notes/wealth-assets.md), parts b and e.
- **WASM gains for the settlement model:** [R5 compute notes](../../../../research/round-5-performance/notes/compute.md), where it ran 1.7–2.5× faster.

## Tests for the exit checks

- `migration in band with the LS push`: total migration stays at 3.6–5.5% a year with the push on, over 20 seeds × 50 years.
- `10,000 settlements in 12 ms with every block`: M0.6's budget gate, with goods, food, happiness, wealth and culture all in.
- `JS and WASM agree`: one country day gives identical stores in JS and WASM for 100 seeds.
- `group totals exact`: spawn and fold reproduce wealth group totals exactly in cents.
- `bands sum to population`: the happiness band counts sum exactly to population every day.

## Risks and unknowns

- **Rust and WASM must be in place** from M6.2. If M6.2 slipped, the JS path must meet 12 ms alone, which prototypes did not always manage.
- **Fitted wealth transitions** need M5.6's logs at several city sizes. Check that the logs carry the wealth groups before fitting.

## Open questions

- **Owner:** Does the 10,000-settlement tier still gate M7, now that round 9's large world lists 182–237 places? R6 found nothing fits 10,000 in JS with every block, so this gate alone forces the WASM port before launch. Suggested: gate on 1,000, and port only when a world needs more records than JS can step. Needed before: the step plan.
- **Measure:** Do 1,000 settlements still fit 1.5 ms in JS with every block in? R6 computed 1.11–1.15 ms from R5's 0.76 ms base before the wealth block, leaving about 0.35 ms for wealth, culture and route ledgers. Suggested: measure as each block lands, and extend the WASM port to phones if it misses. Needed before: building.
- **Measure:** Do M5.6's sweep logs carry the wealth groups at several city sizes? Without them the transition hazards can't be fitted. Suggested: check M5.6's log columns before M5 closes. Needed before: the step plan.
- **Research:** Does evidence support raising out-migration by up to 10% per point of mean LS? R6 labels it an inference. Suggested: keep it as a labelled design value, bounded by the 3.6–5.5% migration check. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the happiness block and band test, then the wealth block, the LS push with its migration check and the transition fit, with WASM last.
- **Reuse:** M7.2's fitter and docking for wealth transitions; M6.2's Rust crate and WASM build; M7.1's per-settlement-day key for every band shift.
- **Keep it simple:** use deterministic remainders, which R6 allows and which need no draw at all.
- **Pitfalls:** JS and WASM must agree bit for bit, so keep the port integer-only and run the 100-seed agreement test in CI. Wealth groups stay apart from the crime top-5% share. Never key a draw per cell, which R6 found the main cost.
- **Hard and easy parts:** JS–WASM agreement and the 1.5 ms fit need care; the block layouts are mechanical.
