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
  - +150 LS per doubling of settlement median income over the national median;
  - out-migration rises by up to 10% per point of mean LS below the national mean.
- **Wealth group transitions** use hazards fitted from M5.6's sweep logs, as M7.2 fits the other flows. Spawn and fold reproduce group totals exactly in cents.
- **Cheap randomness:** aggregate band shifts come from one keyed draw per settlement-day, plus one hash round per rounding decision, or from deterministic remainders. Never use a full keyed draw per cell.
- **Budget, then port:**
  - the goods-and-wellbeing extension is held to ≤ 0.7 µs RM per settlement-day at 1,000 settlements;
  - before the 10,000-settlement tier, the settlement model is ported to WASM in M6.2's Rust crate, completing M6.2's WASM task (R5).
  - The port is integer-only and bit-identical to the JS path, which stays as the fallback.

## Packages and files

- `packages/sim-country`:
  - `src/blocks/happiness.ts` and `src/blocks/wealth.ts`;
  - `src/migration.ts`, extended with the LS push;
  - `src/emulator/wealth-transitions.ts`.
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
